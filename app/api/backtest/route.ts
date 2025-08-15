import { NextResponse } from 'next/server';
import { runBacktest } from '@/lib/backtest';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tickers = ['SPY','QQQ','TLT'], weights, start, end, rebalance = 'NONE' } = body || {};
    const out = await runBacktest({ tickers, weights, start, end, rebalance });
    if (!out.dates.length) {
      return NextResponse.json({ error: 'No data for backtest' }, { status: 400 });
    }
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'backtest error' }, { status: 500 });
  }
}