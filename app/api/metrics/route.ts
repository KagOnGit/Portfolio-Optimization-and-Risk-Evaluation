// app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { sharpe, sortino, histVaR, histCVaR, maxDrawdown } from '@/lib/math';
import { fetchHistory, closesToReturns } from '@/lib/prices';

type Body = { tickers?: string[]; start?: string; end?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const tickers = (body.tickers && body.tickers.length ? body.tickers : ['SPY','QQQ','TLT'])
      .map(s => s.toUpperCase())
      .slice(0, 12);
    const { start, end } = body;

    const series = await fetchHistory(tickers, start, end);

    // Map closes for each ticker
    const closeArrays: number[][] = series.map(s => s.bars.map(b => b.close));

    // Keep only arrays with >1 bar
    const validArrays = closeArrays.filter(arr => arr.length > 1);
    if (validArrays.length === 0) {
      return NextResponse.json(
        { error: 'No valid price data for chosen tickers/date range.' },
        { status: 400 }
      );
    }

    // Align to min length
    const minLen = Math.min(...validArrays.map(a => a.length));
    const aligned = validArrays.map(a => a.slice(a.length - minLen));

    // Returns
    const returnsArrays = aligned.map(arr => closesToReturns(arr));
    const minR = Math.min(...returnsArrays.map(a => a.length));
    if (minR === 0) {
      return NextResponse.json(
        { error: 'Not enough consecutive prices to compute returns.' },
        { status: 400 }
      );
    }
    const retAligned = returnsArrays.map(a => a.slice(a.length - minR));

    // Equal-weight portfolio
    const portReturns: number[] = [];
    for (let i = 0; i < minR; i++) {
      const avg = retAligned.reduce((acc, ar) => acc + ar[i], 0) / retAligned.length;
      portReturns.push(avg);
    }

    // Equity curve from returns
    const equityCurve: number[] = [];
    let cum = 1;
    for (const r of portReturns) {
      cum *= (1 + r);
      equityCurve.push(cum);
    }

    const metrics = {
      sharpe: +sharpe(portReturns).toFixed(3),
      sortino: +sortino(portReturns).toFixed(3),
      var: +histVaR(portReturns, 0.95).toFixed(4),
      cvar: +histCVaR(portReturns, 0.95).toFixed(4),
      max_drawdown: +maxDrawdown(equityCurve).toFixed(4),
    };

    return NextResponse.json({ metrics, equityCurve });
  } catch (e: any) {
    console.error('[metrics] 500', e?.message);
    return NextResponse.json({ error: e?.message || 'metrics error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ info: 'POST { tickers, start, end }' });
}