// app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { fetchHistory, closesToReturns } from '@/lib/prices';

function quantile(xs: number[], q: number) {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const i = Math.max(0, Math.min(a.length - 1, Math.floor(q * (a.length - 1))));
  return a[i];
}

function maxDrawdown(curve: number[]) {
  let peak = curve[0] ?? 1;
  let mdd = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > mdd) mdd = dd;
  }
  return mdd;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const tickers: string[] = (body.tickers || ['SPY', 'QQQ', 'TLT']).map((s: string) => s.toUpperCase());
    const start: string | undefined = body.start;
    const end: string | undefined = body.end;

    const series = await fetchHistory(tickers, start, end);

    // Build a simple equal-weight portfolio from whichever series have data
    const valid = series
      .map((s) => ({ symbol: s.symbol, closes: s.bars.map((b) => b.close).filter((n) => Number.isFinite(n)) }))
      .filter((s) => s.closes.length >= 3);

    if (valid.length === 0) {
      // Do NOT 400; return a warning so the UI stays calm.
      return NextResponse.json({
        metrics: null,
        equityCurve: [],
        warning: 'No valid price data for chosen tickers/date range.',
      });
    }

    const minLen = Math.min(...valid.map((v) => v.closes.length));
    const aligned = valid.map((v) => v.closes.slice(-minLen));
    const weights = 1 / aligned.length;

    // daily portfolio returns
    const portRets: number[] = [];
    for (let i = 1; i < minLen; i++) {
      let r = 0;
      for (const arr of aligned) {
        r += (arr[i] / arr[i - 1] - 1) * weights;
      }
      portRets.push(r);
    }

    // equity curve (start 1.0)
    const equity: number[] = [1];
    for (const r of portRets) equity.push(equity[equity.length - 1] * (1 + r));

    // KPIs
    const n = portRets.length;
    const mean = n ? portRets.reduce((a, b) => a + b, 0) / n : 0;
    const variance = n ? portRets.reduce((a, b) => a + (b - mean) ** 2, 0) / n : 0;
    const sigma = Math.sqrt(variance);
    const muA = mean * 252;
    const sigA = sigma * Math.sqrt(252);
    const sharpe = sigA ? muA / sigA : 0;
    const sortino = (() => {
      const neg = portRets.filter((x) => x < 0);
      const varNeg = neg.length ? neg.reduce((a, b) => a + (b - 0) ** 2, 0) / neg.length : 0;
      const dA = Math.sqrt(varNeg) * Math.sqrt(252);
      return dA ? muA / dA : 0;
    })();
    const var95 = -quantile(portRets, 0.05);
    const cvar95 = -portRets.filter((x) => x <= quantile(portRets, 0.05)).reduce((a, b, _, arr) => a + b / arr.length, 0);
    const mdd = maxDrawdown(equity);

    return NextResponse.json({
      metrics: { sharpe, sortino, var: var95, cvar: cvar95, max_drawdown: mdd },
      equityCurve: equity,
    });
  } catch (e: any) {
    return NextResponse.json({ metrics: null, equityCurve: [], warning: e?.message || 'metrics error' });
  }
}