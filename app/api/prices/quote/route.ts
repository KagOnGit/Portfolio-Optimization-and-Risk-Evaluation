// app/api/prices/quote/route.ts
import { NextResponse } from 'next/server';
import { fetchQuoteSnapshotServer } from '@/lib/prices';

type Body = { symbols?: string[] };

const DEFAULTS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TLT', 'GLD', 'BTC-USD'];

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const syms = (Array.isArray(body.symbols) && body.symbols.length ? body.symbols : DEFAULTS)
      .map(s => s.toUpperCase())
      .slice(0, 20);
    const data = await fetchQuoteSnapshotServer(syms);
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('[prices/quote] 500', e?.message);
    return NextResponse.json({ error: e?.message || 'quote error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const data = await fetchQuoteSnapshotServer(DEFAULTS);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'quote error' }, { status: 500 });
  }
}