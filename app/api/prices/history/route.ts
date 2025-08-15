// app/api/prices/history/route.ts
import { NextResponse } from 'next/server';
import { fetchHistory, Series } from '@/lib/prices';

type Body = { tickers?: string[]; start?: string; end?: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const tickers = (body.tickers && body.tickers.length ? body.tickers : ['SPY','QQQ','TLT'])
      .map(s => s.toUpperCase())
      .slice(0, 20);
    const start = body.start;
    const end = body.end;

    const series = await fetchHistory(tickers, start, end);

    // Normalize: ensure each requested symbol shows up, even if empty
    const seen = new Set(series.map(s => s.symbol));
    for (const sym of tickers) {
      if (!seen.has(sym)) series.push({ symbol: sym, bars: [] });
    }

    return NextResponse.json({ series });
  } catch (e: any) {
    console.error('[prices/history] 500', e?.message);
    return NextResponse.json({ error: e?.message || 'history error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'POST { tickers: string[], start?: YYYY-MM-DD, end?: YYYY-MM-DD }'
  });
}