import { NextResponse } from 'next/server';
import { fetchQuoteSnapshot } from '@/lib/prices';

type Body = { tickers?: string[] };

export async function POST(req: Request) {
  let body: Body = {};
  try { body = await req.json(); } catch {}
  const tickers = Array.from(new Set((body.tickers || []).map(s => s.toUpperCase()))).slice(0, 24);

  if (tickers.length === 0) {
    return NextResponse.json({ error: 'No tickers' }, { status: 400 });
  }

  try {
    const quotes = await fetchQuoteSnapshot(tickers);
    return NextResponse.json({ quotes });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'quote fetch failed' }, { status: 500 });
  }
}