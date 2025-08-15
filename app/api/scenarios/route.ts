import { NextResponse } from 'next/server';
import { runScenario } from '@/lib/scenarios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tickers = ['SPY','QQQ','TLT'], weights = {}, shocks = [] } = body || {};
    const out = runScenario({ tickers, weights, shocks });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'scenario error' }, { status: 500 });
  }
}