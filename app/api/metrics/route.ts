import { NextResponse } from 'next/server';
import { sharpe, sortino, histVaR, histCVaR } from '@/lib/math';
import { fetchHistory, closesToReturns } from '@/lib/prices';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { tickers = ['SPY','QQQ','TLT'] } = body || {};
    const upper = (tickers as string[]).map(s => s.toUpperCase()).slice(0, 12);

    const series = await fetchHistory(upper);
    // Simple composite: equal-weight portfolio of closes
    // Align by common dates: find min length and align to the tail
    const closeArrays = series.map(s => s.bars.map(b => b.close));
    const minLen = Math.min(...closeArrays.map(a => a.length));
    const aligned = closeArrays.map(a => a.slice(a.length - minLen));

    // Equal-weighted portfolio close as average of normalized index
    // Alternatively, compute average of returns — simpler for Week 2:
    const returnsArrays = aligned.map(arr => closesToReturns(arr));
    const minR = Math.min(...returnsArrays.map(a => a.length));
    const retAligned = returnsArrays.map(a => a.slice(a.length - minR));

    const portReturns: number[] = [];
    for (let i = 0; i < minR; i++) {
      const avg = retAligned.reduce((acc, ar) => acc + ar[i], 0) / retAligned.length;
      portReturns.push(avg);
    }

    // Risk metrics
    const metrics = {
      sharpe: +sharpe(portReturns).toFixed(3),
      sortino: +sortino(portReturns).toFixed(3),
      var: +histVaR(portReturns, 0.95).toFixed(4),
      cvar: +histCVaR(portReturns, 0.95).toFixed(4),
      max_drawdown: 0.0 // placeholder; will compute drawdown properly next week
    };

    return NextResponse.json(metrics);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'metrics error' }, { status: 500 });
  }
}

// Keep GET for backward compatibility (optional)
export async function GET() {
  return NextResponse.json({ info: 'Use POST with { tickers } to compute real metrics.' });
}
