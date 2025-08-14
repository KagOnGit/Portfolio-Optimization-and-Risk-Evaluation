import { NextResponse } from 'next/server';
import { fetchQuoteSnapshot } from '@/lib/prices';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { symbols = ['SPY','QQQ','TLT','AAPL','MSFT','TLT','GLD','BTC-USD'] } = body || {};

    // Fetch live snapshot from lib/prices.ts
    const data = await fetchQuoteSnapshot(symbols);

    return NextResponse.json(data);
  } catch (e: any) {
    console.error('Quote API error', e);
    return NextResponse.json({ error: e?.message || 'quote fetch error' }, { status: 500 });
  }
}

// Optional GET endpoint for testing
export async function GET() {
  return NextResponse.json({ info: 'POST { symbols: [...] } to fetch live quotes' });
}