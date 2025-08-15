// app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { fetchHistory, Series, Bar, closesToReturns } from '@/lib/prices';

type Body = {
  tickers?: string[];
  start?: string;
  end?: string;
  weights?: Record<string, number>;
};

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function stdev(xs: number[]): number {
  const m = mean(xs);
  const v = xs.length ? xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length : 0;
  return Math.sqrt(v);
}
function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return 0;
  const arr = [...xs].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(arr.length - 1, Math.floor(q * (arr.length - 1))));
  return arr[idx];
}
function maxDrawdown(equity: number[]): number {
  let peak = -Infinity;
  let maxDD = 0;
  for (const v of equity) {
    peak = Math.max(peak, v);
    if (peak > 0) {
      const dd = 1 - v / peak;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const tickers = (Array.isArray(body.tickers) && body.tickers.length ? body.tickers : ['SPY', 'QQQ', 'TLT'])
      .map((s) => s.toUpperCase())
      .slice(0, 20);
    const start = body.start || undefined;
    const end = body.end || undefined;
    const userWeights = body.weights && typeof body.weights === 'object' ? body.weights : undefined;

    if (!tickers.length) {
      return NextResponse.json({ error: 'No tickers provided' }, { status: 400 });
    }

    const hist = await fetchHistory(tickers, start, end);

    // Build date intersection so all series align
    const dateSets: Array<Set<string>> = hist.map((s: Series) => new Set(s.bars.map((b: Bar) => b.date)));
    let commonDates: string[] = [];
    if (dateSets.length) {
      // Start with first set; keep those present in all sets
      const firstDates = Array.from(dateSets[0]);
      commonDates = firstDates.filter((d) => dateSets.every((set) => set.has(d))).sort();
    }

    // If intersection is too small, fall back to union (best-effort), still sorted
    if (commonDates.length < 50) {
      const union = new Set<string>();
      for (const s of hist) for (const b of s.bars) union.add(b.date);
      commonDates = Array.from(union).sort();
    }

    // Build close arrays aligned to commonDates
    const closeMap: Record<string, number[]> = {};
    for (const s of hist) {
      const perDate = new Map<string, number>();
      for (const b of s.bars) perDate.set(b.date, b.close);
      const arr: number[] = [];
      for (const d of commonDates) {
        const v = perDate.get(d);
        arr.push(Number.isFinite(v as number) ? (v as number) : NaN);
      }
      closeMap[s.symbol] = arr;
    }

    // Filter dates where at least 2 symbols have valid prices (to compute portfolio)
    const validIdx: number[] = [];
    for (let i = 0; i < commonDates.length; i++) {
      let countValid = 0;
      for (const sym of tickers) {
        const v = closeMap[sym]?.[i];
        if (Number.isFinite(v)) countValid++;
        if (countValid >= Math.min(2, tickers.length)) break;
      }
      if (countValid >= Math.min(2, tickers.length)) validIdx.push(i);
    }
    const dates = validIdx.map((i) => commonDates[i]);

    // Rebuild aligned closes with only valid indices
    const alignedCloses: Record<string, number[]> = {};
    for (const sym of tickers) {
      const src = closeMap[sym] || [];
      alignedCloses[sym] = validIdx.map((i) => src[i]).filter((v) => Number.isFinite(v)) as number[];
    }

    // Compute returns per symbol (daily)
    const returnsBySym: Record<string, number[]> = {};
    for (const sym of tickers) {
      const closes = alignedCloses[sym] || [];
      returnsBySym[sym] = closesToReturns(closes);
    }

    // Determine weights (normalize)
    let weights: Record<string, number> = {};
    if (userWeights) {
      const filtered: Record<string, number> = {};
      for (const k of Object.keys(userWeights)) {
        const up = k.toUpperCase();
        if (tickers.includes(up)) filtered[up] = Number(userWeights[k]) || 0;
      }
      const sum = Object.values(filtered).reduce((a, b) => a + Math.max(0, b), 0);
      if (sum > 0) {
        for (const k of Object.keys(filtered)) weights[k] = Math.max(0, filtered[k]) / sum;
      }
    }
    if (!Object.keys(weights).length) {
      const w = 1 / tickers.length;
      for (const t of tickers) weights[t] = w;
    }

    // Portfolio daily returns (aligned to the smallest length among series)
    const len = Math.max(
      0,
      ...Object.values(returnsBySym).map((arr) => arr.length)
    );
    const portRets: number[] = [];
    for (let i = 0; i < len; i++) {
      let sum = 0;
      let wsum = 0;
      for (const sym of tickers) {
        const r = returnsBySym[sym]?.[i];
        const w = weights[sym] || 0;
        if (Number.isFinite(r)) {
          sum += w * (r as number);
          wsum += w;
        }
      }
      // If some series missing, rescale by effective weight to avoid drift
      portRets.push(wsum > 0 ? sum / wsum : 0);
    }

    // Equity curve (start at 1)
    const equity: number[] = [];
    let cur = 1;
    equity.push(cur);
    for (const r of portRets) {
      cur *= 1 + r;
      equity.push(cur);
    }

    // Trim/align dates to equity length
    // We have equity length = portRets.length + 1; dates should match that.
    // If dates is same as commonDates after filtering, make it the same length:
    let outDates = dates;
    if (outDates.length === equity.length - 1) {
      // prepend first date to match first equity point
      outDates = [outDates[0], ...outDates];
    } else if (outDates.length !== equity.length) {
      // fallback: slice or pad
      if (outDates.length > equity.length) outDates = outDates.slice(outDates.length - equity.length);
      else if (outDates.length < equity.length && outDates.length > 0)
        outDates = [outDates[0], ...outDates];
    }

    // Metrics (annualized)
    const muD = mean(portRets);
    const sigD = stdev(portRets);
    const muA = muD * 252;
    const sigA = sigD * Math.sqrt(252);
    const sharpe = sigA ? muA / sigA : 0;

    // Sortino: downside deviation uses negative returns only
    const downside = portRets.filter((r) => r < 0);
    const dd = stdev(downside);
    const sortino = dd ? (muD * 252) / (dd * Math.sqrt(252)) : 0;

    // VaR / CVaR (95%)
    const q = quantile(portRets, 0.05);
    const var95 = -q;
    const cvar95 =
      downside.length ? -downside.filter((r) => r <= q).reduce((a, b) => a + b, 0) / downside.length : 0;

    const mdd = maxDrawdown(equity);

    return NextResponse.json({
      metrics: {
        sharpe,
        sortino,
        var: var95,
        cvar: cvar95,
        max_drawdown: mdd,
      },
      equityCurve: equity,
      dates: outDates,
      weights,
      tickers,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'metrics error' }, { status: 500 });
  }
}