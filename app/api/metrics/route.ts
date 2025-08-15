// app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { fetchHistory, Bar, Series, closesToReturns } from '@/lib/prices';

type Body = {
  tickers?: string[];
  start?: string;
  end?: string;
  method?: 'equal_weight' | string; // future methods can plug in
};

function alignByDate(series: Series[]): { dates: string[]; map: Record<string, number[]> } {
  // Build master date set
  const set = new Set<string>();
  for (const s of series) for (const b of s.bars) set.add(b.date);
  const dates = Array.from(set).sort(); // ascending

  // Map symbol -> closes[] aligned to dates (undefined holes are skipped later)
  const map: Record<string, number[]> = {};
  for (const s of series) {
    const byDate = new Map<string, number>();
    s.bars.forEach((b) => byDate.set(b.date, b.close));
    map[s.symbol] = dates.map((d) => {
      const v = byDate.get(d);
      return Number.isFinite(v as number) ? (v as number) : NaN;
    });
  }
  return { dates, map };
}

function toPortfolioEquity(
  alignedCloses: Record<string, number[]>,
  method: string
): { equity: number[]; weights: Record<string, number> } {
  const syms = Object.keys(alignedCloses);
  const weights: Record<string, number> = {};
  if (syms.length === 0) return { equity: [], weights };

  // Equal-weight
  const w = 1 / syms.length;
  for (const s of syms) weights[s] = w;

  // Build portfolio daily return where all required closes exist
  const N = alignedCloses[syms[0]].length;
  const equity: number[] = [];
  let cum = 1;
  equity.push(cum);

  for (let i = 1; i < N; i++) {
    let dayRet = 0;
    let usable = 0;

    for (const s of syms) {
      const cPrev = alignedCloses[s][i - 1];
      const cNow = alignedCloses[s][i];
      if (Number.isFinite(cPrev) && Number.isFinite(cNow) && cPrev !== 0) {
        const r = cNow / cPrev - 1;
        dayRet += r * weights[s];
        usable++;
      }
    }

    // if nothing usable this day, repeat previous equity
    if (usable === 0) {
      equity.push(cum);
    } else {
      cum *= 1 + dayRet;
      equity.push(cum);
    }
  }
  return { equity, weights };
}

function statsFromEquity(equity: number[]) {
  if (!equity || equity.length < 3) {
    return { sharpe: 0, sortino: 0, var: 0, cvar: 0, max_drawdown: 0 };
  }
  // convert equity to daily returns
  const rets: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    const a = equity[i - 1];
    const b = equity[i];
    if (a) rets.push(b / a - 1);
  }
  if (rets.length < 3) {
    return { sharpe: 0, sortino: 0, var: 0, cvar: 0, max_drawdown: 0 };
  }

  // annualization (252 trading days)
  const n = rets.length;
  const mean = rets.reduce((x, y) => x + y, 0) / n;
  const variance = rets.reduce((x, y) => x + (y - mean) ** 2, 0) / n;
  const sigmaD = Math.sqrt(variance);
  const muA = mean * 252;
  const sigA = sigmaD * Math.sqrt(252);
  const sharpe = sigA ? muA / sigA : 0;

  // Sortino (downside stdev)
  const downs = rets.filter((r) => r < 0);
  const downVar =
    downs.length > 0
      ? downs.reduce((x, y) => x + y ** 2, 0) / downs.length
      : 0;
  const downSigA = Math.sqrt(downVar) * Math.sqrt(252);
  const sortino = downSigA ? muA / downSigA : 0;

  // Simple historical (C)VaR @ 95%
  const sorted = [...rets].sort((a, b) => a - b);
  const idx = Math.floor(0.05 * sorted.length);
  const var95 = sorted[idx] ?? 0;
  const cvar95 = sorted.slice(0, idx + 1).reduce((x, y) => x + y, 0) / (idx + 1 || 1);

  // Max Drawdown
  let peak = equity[0];
  let mdd = 0;
  for (const v of equity) {
    if (v > peak) peak = v;
    const dd = peak ? (peak - v) / peak : 0;
    if (dd > mdd) mdd = dd;
  }

  return {
    sharpe,
    sortino,
    var: Math.abs(var95),      // report as positive magnitude
    cvar: Math.abs(cvar95),    // report as positive magnitude
    max_drawdown: mdd,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const tickers = (body.tickers && body.tickers.length ? body.tickers : ['SPY', 'QQQ', 'TLT'])
      .map((s) => s.toUpperCase())
      .slice(0, 20);
    const start = body.start && String(body.start);
    const end = body.end && String(body.end);
    const method = body.method || 'equal_weight';

    // 1) Fetch history (FMP -> Stooq fallback handled inside lib/prices)
    const hist: Series[] = await fetchHistory(tickers, start, end);

    // Keep only those with data
    const withData = hist.filter((s) => s.bars && s.bars.length >= 3);

    if (withData.length === 0) {
      // Don’t 400 – return a helpful shape so the UI can render gracefully
      return NextResponse.json({
        metrics: { sharpe: 0, sortino: 0, var: 0, cvar: 0, max_drawdown: 0 },
        equityCurve: [], // client will show placeholder
        weights: {},
        usedTickers: [],
        note: 'No valid price data for given tickers/date range.',
      });
    }

    // 2) Align by date & build portfolio equity
    const { dates, map } = alignByDate(withData);
    const { equity, weights } = toPortfolioEquity(map, method);

    // 3) Metrics
    const metrics = statsFromEquity(equity);

    // 4) Return curve as numbers (client renders against index)
    return NextResponse.json({
      metrics,
      equityCurve: equity,    // array of cumulative values (1.0 start)
      weights,
      usedTickers: withData.map((s) => s.symbol),
      dates,                  // handy if you want to label the x-axis later
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'metrics error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'POST { tickers: string[], start?: "YYYY-MM-DD", end?: "YYYY-MM-DD" }',
  });
}