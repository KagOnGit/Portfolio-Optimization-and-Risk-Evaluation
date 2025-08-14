import { NextResponse } from 'next/server';
import { sharpe, sortino, histVaR, histCVaR } from '@/lib/math';
import { fetchHistory, closesToReturns } from '@/lib/prices';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { tickers = ['SPY','QQQ','TLT'] } = body || {};
    const upper = (tickers as string[]).map(s => s.toUpperCase()).slice(0, 12);

    const series = await fetchHistory(upper);

    // Map closes for each ticker
    const closeArrays = series.map(s => s.bars.map(b => b.close));

    // Skip tickers with no valid closes
    const validArrays = closeArrays.filter(arr => arr.length > 1);
    if (validArrays.length === 0) {
      return NextResponse.json({ error: 'No valid price data for tickers' }, { status: 500 });
    }

    // Align by minimum length
    const minLen = Math.min(...validArrays.map(a => a.length));
    const aligned = validArrays.map(a => a.slice(a.length - minLen));

    // Convert closes to returns
    const returnsArrays = aligned.map(arr => closesToReturns(arr));
    const minR = Math.min(...returnsArrays.map(a => a.length));
    if (minR === 0) {
      return NextResponse.json({ error: 'Not enough data to compute returns' }, { status: 500 });
    }

    const retAligned = returnsArrays.map(a => a.slice(a.length - minR));

    // Equal-weighted portfolio returns
    const portReturns: number[] = [];
    for (let i = 0; i < minR; i++) {
      const avg = retAligned.reduce((acc, ar) => acc + ar[i], 0) / retAligned.length;
      portReturns.push(avg);
    }

    // Compute risk metrics
    const metrics = {
      sharpe: +sharpe(portReturns).toFixed(3),
      sortino: +sortino(portReturns).toFixed(3),
      var: +histVaR(portReturns, 0.95).toFixed(4),
      cvar: +histCVaR(portReturns, 0.95).toFixed(4),
      max_drawdown: 0.0 // placeholder; Week 3/4 can compute equity curve drawdown
    };

    return NextResponse.json(metrics);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'metrics error' }, { status: 500 });
  }
}

// Optional GET for backward compatibility
export async function GET() {
  return NextResponse.json({ info: 'Use POST with { tickers } to compute real metrics.' });
}
