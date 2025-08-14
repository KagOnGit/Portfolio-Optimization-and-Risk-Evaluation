import { NextResponse } from 'next/server';
import { sharpe, sortino, histVaR, histCVaR, maxDrawdown } from '@/lib/math';
import { fetchHistory, closesToReturns } from '@/lib/prices';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { tickers = ['SPY','QQQ','TLT'] } = body || {};
    const upper = (tickers as string[]).map(s => s.toUpperCase()).slice(0, 12);

    // Fetch history safely per ticker
    const series = await Promise.all(
      upper.map(async (s) => {
        try {
          const res = await fetchHistory([s]);
          return res[0]; // fetchHistory returns array
        } catch {
          return { symbol: s, bars: [] };
        }
      })
    );

    const closeArrays = series.map(s => s.bars.map(b => b.close)).filter(arr => arr.length > 1);
    if (!closeArrays.length) {
      return NextResponse.json({ error: 'No valid price data for any ticker' }, { status: 400 });
    }

    const minLen = Math.min(...closeArrays.map(a => a.length));
    const aligned = closeArrays.map(a => a.slice(a.length - minLen));

    const returnsArrays = aligned.map(arr => closesToReturns(arr));
    const minR = Math.min(...returnsArrays.map(a => a.length));
    if (minR === 0) {
      return NextResponse.json({ error: 'Not enough data to compute returns' }, { status: 400 });
    }

    const retAligned = returnsArrays.map(a => a.slice(a.length - minR));

    const portReturns: number[] = [];
    for (let i = 0; i < minR; i++) {
      const avg = retAligned.reduce((acc, ar) => acc + ar[i], 0) / retAligned.length;
      portReturns.push(avg);
    }

    // Equity curve
    const equityCurve: number[] = [];
    let cumulative = 1;
    for (const r of portReturns) {
      cumulative *= 1 + r;
      equityCurve.push(cumulative);
    }

    const metrics = {
      sharpe: +sharpe(portReturns).toFixed(3),
      sortino: +sortino(portReturns).toFixed(3),
      var: +histVaR(portReturns, 0.95).toFixed(4),
      cvar: +histCVaR(portReturns, 0.95).toFixed(4),
      max_drawdown: +maxDrawdown(equityCurve).toFixed(4)
    };

    return NextResponse.json({ metrics, equityCurve });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'metrics error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ info: 'Use POST with { tickers } to compute real metrics.' });
}