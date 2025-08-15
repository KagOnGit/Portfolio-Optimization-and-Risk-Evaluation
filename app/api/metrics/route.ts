// app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { sharpe, sortino, histVaR, histCVaR, maxDrawdown } from '@/lib/math';
import { fetchHistory, closesToReturns } from '@/lib/prices';

function filterByDate<T extends { date: string }>(bars: T[], start?: string, end?: string) {
  if (!start && !end) return bars;
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  return bars.filter((b) => {
    const d = new Date(b.date);
    if (s && d < s) return false;
    if (e && d > e) return false;
    return true;
  });
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const { tickers = ['SPY', 'QQQ', 'TLT'], start, end } = (body || {}) as {
      tickers?: string[];
      start?: string;
      end?: string;
    };

    const upper = (tickers || []).map((s) => s.toUpperCase()).slice(0, 12);
    if (upper.length === 0) {
      return NextResponse.json({ error: 'No tickers provided' }, { status: 400 });
    }

    const series = await fetchHistory(upper);

    // Map to closes, filter invalid, drop very short series
    const closeArrays = series.map((s) => {
      const f = filterByDate(s.bars, start, end);
      const closes = f.map((b) => Number(b.close)).filter((n) => Number.isFinite(n));
      return closes;
    });

    const valid = closeArrays.filter((a) => a.length > 2);
    if (valid.length === 0) {
      console.warn('[metrics] no-valid-series', { tickers: upper, start, end, sizes: closeArrays.map(a => a.length) });
      return NextResponse.json({ error: 'No valid price data for chosen tickers/date range' }, { status: 400 });
    }

    // Align to shortest length
    const minLen = Math.min(...valid.map((a) => a.length));
    const aligned = valid.map((a) => a.slice(a.length - minLen));

    // Returns
    const returnsArrays = aligned.map((arr) => closesToReturns(arr));
    const minR = Math.min(...returnsArrays.map((a) => a.length));
    if (minR < 2) {
      console.warn('[metrics] not-enough-returns', { tickers: upper, start, end, minR });
      return NextResponse.json({ error: 'Not enough data to compute returns' }, { status: 400 });
    }
    const retAligned = returnsArrays.map((a) => a.slice(a.length - minR));

    // Equal-weight portfolio
    const portReturns: number[] = [];
    for (let i = 0; i < minR; i++) {
      let sum = 0;
      for (const ar of retAligned) sum += ar[i];
      portReturns.push(sum / retAligned.length);
    }

    // Equity curve
    const equityCurve: number[] = [];
    let eq = 1;
    for (const r of portReturns) {
      eq *= 1 + r;
      equityCurve.push(eq);
    }

    // Metrics
    const metrics = {
      sharpe: +sharpe(portReturns).toFixed(3),
      sortino: +sortino(portReturns).toFixed(3),
      var: +histVaR(portReturns, 0.95).toFixed(4),
      cvar: +histCVaR(portReturns, 0.95).toFixed(4),
      max_drawdown: +maxDrawdown(equityCurve).toFixed(4),
    };

    return NextResponse.json({ metrics, equityCurve, elapsedMs: Date.now() - startedAt });
  } catch (e: any) {
    console.error('[metrics] 500', { message: e?.message, stack: e?.stack });
    return NextResponse.json({ error: e?.message || 'metrics error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ info: 'Use POST with { tickers, start, end }' });
}