// app/api/prices/history/route.ts
import { NextResponse } from 'next/server';
import { fetchHistory } from '@/lib/prices';

type Req = { tickers?: string[]; start?: string; end?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Req;
    const tickers = (body.tickers && body.tickers.length ? body.tickers : ['SPY', 'QQQ', 'TLT'])
      .map((s) => s.toUpperCase())
      .slice(0, 12);

    const start = body.start;
    const end = body.end;

    // First attempt: respect date filters
    let series = await fetchHistory(tickers, start, end);

    // If every symbol came back empty (some data sources don’t support
    // arbitrary from/to), retry WITHOUT from/to so we at least get data.
    if (!series.some((s) => s.bars.length > 3)) {
      series = await fetchHistory(tickers, undefined, undefined);
    }

    return NextResponse.json({ series });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'history error' }, { status: 500 });
  }
}