// app/api/backtest/route.ts
import { NextResponse } from 'next/server';
import { runBacktest, BacktestRequest } from '@/lib/backtest';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(()=> ({}))) as Partial<BacktestRequest>;
    const tickers = Array.isArray(body.tickers) && body.tickers.length ? body.tickers : ['SPY','QQQ','TLT'];
    const start = typeof body.start === 'string' ? body.start : undefined;
    const end   = typeof body.end   === 'string' ? body.end   : undefined;
    const weights = (body.weights && typeof body.weights === 'object') ? body.weights : undefined;

    const res = await runBacktest({ tickers, start, end, weights, rebalance: 'none' });
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'backtest error' }, { status: 500 });
  }
}