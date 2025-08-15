// app/api/prices/quote/route.ts
import { NextResponse } from 'next/server';
import { fetchQuoteSnapshotServer } from '@/lib/prices';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbols: string[] = Array.isArray(body?.symbols) && body.symbols.length
      ? body.symbols.slice(0, 30)
      : ['SPY','QQQ','AAPL','MSFT','TLT','GLD','BTC-USD'];

    const snap = await fetchQuoteSnapshotServer(symbols);
    return NextResponse.json(snap);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'quote error' }, { status: 500 });
  }
}