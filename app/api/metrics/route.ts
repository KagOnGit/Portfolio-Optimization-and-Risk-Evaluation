// app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { fetchHistory, closesToReturns, Series } from '@/lib/prices';

type Body = {
  tickers?: string[];
  start?: string;
  end?: string;
  weights?: Record<string, number>; // optional override
};

function r3(x: unknown): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null;
}

function maxDrawdown(curve: number[]): number {
  let peak = curve[0] ?? 1;
  let mdd = 0;
  for (const v of curve) {
    peak = Math.max(peak, v);
    const dd = peak ? (peak - v) / peak : 0;
    if (dd > mdd) mdd = dd;
  }
  return mdd; // 0..1
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor((p / 100) * a.length)));
  return a[idx];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const tickers = (body.tickers && body.tickers.length ? body.tickers : ['SPY', 'QQQ', 'TLT'])
      .map((s) => s.toUpperCase())
      .slice(0, 12);
    const { start, end } = body;
    const weightsInput = body.weights || {};

    // fetch price history
    const history: Series[] = await fetchHistory(tickers, start, end);

    // Build aligned date map (ascending)
    const allDatesSet = new Set<string>();
    for (const s of history) for (const b of s.bars) allDatesSet.add(b.date);
    const allDates = Array.from(allDatesSet).sort((a, b) => (a < b ? -1 : 1));
    if (allDates.length < 3) {
      return NextResponse.json(
        { error: 'No valid price data for chosen tickers/date range.' },
        { status: 400 }
      );
    }

    // Normalize weights (equal weight default)
    const w: Record<string, number> = {};
    let sum = 0;
    for (const sym of tickers) {
      const val = Number(weightsInput[sym]);
      if (Number.isFinite(val)) {
        w[sym] = val;
        sum += val;
      }
    }
    if (sum <= 0) {
      // equal weight
      const ew = 1 / tickers.length;
      for (const sym of tickers) w[sym] = ew;
    } else {
      // normalize
      for (const sym of tickers) w[sym] = (w[sym] ?? 0) / sum;
    }

    // Build close-by-date per symbol
    const closesBySym: Record<string, number[]> = {};
    for (const s of history) {
      const map = new Map<string, number>();
      for (const b of s.bars) map.set(b.date, b.close);
      closesBySym[s.symbol] = allDates.map((d) => (map.has(d) ? (map.get(d) as number) : NaN));
    }

    // Portfolio equity curve (start at 1)
    const equity: number[] = [];
    let cur = 1;
    equity.push(cur);

    // Compute daily portfolio returns by weighted sum of each symbol’s daily return
    // First, compute per-symbol daily returns arrays
    const symbolReturns: Record<string, number[]> = {};
    for (const sym of tickers) {
      const cs = closesBySym[sym].filter((v) => Number.isFinite(v)) as number[];
      // If a symbol has too few points, treat its returns as 0s (effectively remove)
      if (cs.length < 3) {
        symbolReturns[sym] = new Array(allDates.length - 1).fill(0);
      } else {
        // Rebuild aligned closes with NaN removed via backfill (simple approach)
        const aligned = closesBySym[sym].slice();
        // forward-fill simple
        for (let i = 0; i < aligned.length; i++) {
          if (!Number.isFinite(aligned[i]) && i > 0) aligned[i] = aligned[i - 1];
        }
        // back-fill head if needed
        for (let i = 0; i < aligned.length; i++) {
          if (!Number.isFinite(aligned[i])) aligned[i] = aligned.find(Number.isFinite) as number;
        }
        const rets = closesToReturns(aligned as number[]);
        symbolReturns[sym] = rets;
      }
    }

    const days = Math.min(...tickers.map((t) => symbolReturns[t].length));
    const portRets: number[] = [];
    for (let i = 0; i < days; i++) {
      let r = 0;
      for (const sym of tickers) {
        r += (w[sym] ?? 0) * (symbolReturns[sym][i] ?? 0);
      }
      portRets.push(r);
      cur = cur * (1 + r);
      equity.push(cur);
    }

    if (portRets.length < 3) {
      return NextResponse.json(
        { error: 'No valid price data for chosen tickers/date range.' },
        { status: 400 }
      );
    }

    // Metrics (annualized)
    const n = portRets.length;
    const mean = portRets.reduce((a, b) => a + b, 0) / n;
    const variance = portRets.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const sigma = Math.sqrt(variance);

    const downside = portRets.filter((r) => r < 0);
    const dsd =
      downside.length > 0
        ? Math.sqrt(downside.reduce((a, r) => a + r ** 2, 0) / downside.length)
        : 0;

    const muA = mean * 252;
    const sigA = sigma * Math.sqrt(252);
    const dsdA = dsd * Math.sqrt(252);

    const sharpe = sigA ? muA / sigA : 0;
    const sortino = dsdA ? muA / dsdA : 0;

    const q5 = percentile(portRets, 5); // 5th percentile of returns
    const var95 = q5 < 0 ? -q5 : 0; // express as positive loss
    const cvar95 = (() => {
      const tail = portRets.filter((r) => r <= q5);
      if (!tail.length) return 0;
      const avg = tail.reduce((a, b) => a + b, 0) / tail.length;
      return avg < 0 ? -avg : 0;
    })();

    const mdd = maxDrawdown(equity);

    // Round all KPIs here (3 decimals)
    const metrics = {
      sharpe: r3(sharpe),
      sortino: r3(sortino),
      var: r3(var95),
      cvar: r3(cvar95),
      max_drawdown: r3(mdd),
    };

    // Simple equity curve downsample for the small sparkline (keep density modest)
    const step = Math.max(1, Math.floor(equity.length / 200));
    const equityCurve = equity.filter((_, i) => i % step === 0);

    return NextResponse.json({ metrics, equityCurve });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'metrics error' }, { status: 500 });
  }
}