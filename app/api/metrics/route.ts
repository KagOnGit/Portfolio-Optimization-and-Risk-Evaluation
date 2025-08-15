// app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { sharpe, sortino, histVaR, histCVaR, maxDrawdown } from '@/lib/math';
import { fetchHistory, closesToReturns } from '@/lib/prices';

// Optional server-side date filter for bars
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
  try {
    const body = await req.json().catch(() => ({}));
    const {
      tickers = ['SPY', 'QQQ', 'TLT'],
      start,
      end,
    }: { tickers?: string[]; start?: string; end?: string } = body || {};

    const upper = (tickers as string[]).map((s) => s.toUpperCase()).slice(0, 12);

    // Fetch historical bars
    const series = await fetchHistory(upper);

    // Map closes and filter invalid/short series
    const closeArrays = series.map((s) => {
      const filtered = filterByDate(s.bars, start, end);
      const closes = filtered.map((b) => b.close).filter((n) => Number.isFinite(n));
      return closes;
    });

    // Keep only tickers with enough data
    const validArrays = closeArrays.filter((arr) => arr.length > 2);
    if (validArrays.length === 0) {
      return NextResponse.json(
        { error: 'No valid price data for chosen tickers/date range' },
        { status: 400 }
      );
    }

    // Align by minimum length to avoid NaNs
    const minLen = Math.min(...validArrays.map((a) => a.length));
    const aligned = validArrays.map((a) => a.slice(a.length - minLen));

    // Convert closes to returns and align again
    const returnsArrays = aligned.map((arr) => closesToReturns(arr));
    const minR = Math.min(...returnsArrays.map((a) => a.length));
    if (minR < 2) {
      return NextResponse.json({ error: 'Not enough data to compute returns' }, { status: 400 });
    }
    const retAligned = returnsArrays.map((a) => a.slice(a.length - minR));

    // Equal-weighted portfolio returns
    const portReturns: number[] = [];
    for (let i = 0; i < minR; i++) {
      portReturns.push(retAligned.reduce((acc, ar) => acc + ar[i], 0) / retAligned.length);
    }

    // Build an equity curve from returns
    const equityCurve: number[] = [];
    let eq = 1;
    for (const r of portReturns) {
      eq *= 1 + r;
      equityCurve.push(eq);
    }

    // Risk metrics
    const metrics = {
      sharpe: +sharpe(portReturns).toFixed(3),
      sortino: +sortino(portReturns).toFixed(3),
      var: +histVaR(portReturns, 0.95).toFixed(4),
      cvar: +histCVaR(portReturns, 0.95).toFixed(4),
      max_drawdown: +maxDrawdown(equityCurve).toFixed(4),
    };

    return NextResponse.json({ metrics, equityCurve });
  } catch (e: any) {
    // Return a clear 500 with message (keeps client UI from hanging)
    return NextResponse.json({ error: e?.message || 'metrics error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ info: 'Use POST with { tickers, start, end } to compute real metrics.' });
}