// app/api/prices/history/route.ts
import { NextResponse } from 'next/server';
import { fetchHistory } from '@/lib/prices';

type Body = { tickers?: string[]; start?: string; end?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const symbols = (body.tickers && body.tickers.length ? body.tickers : ['SPY', 'QQQ', 'TLT'])
      .map((s) => s.toUpperCase())
      .slice(0, 20);

    const start = body.start || undefined;
    const end = body.end || undefined;

    const series = await fetchHistory(symbols, start, end);
    return NextResponse.json({ series });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'history error' }, { status: 500 });
  }
}