// app/api/prices/history/route.ts
import { NextResponse } from 'next/server';
import { fetchHistory } from '@/lib/prices';

type Req = { tickers?: string[]; start?: string; end?: string };

function isISODate(s?: string): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request) {
  try {
    const body = ((await req.json().catch(() => ({}))) as Partial<Req>) || {};

    // Normalize tickers: default, sanitize, de-dupe, cap
    const rawTickers = Array.isArray(body.tickers) && body.tickers.length
      ? body.tickers
      : ['SPY', 'QQQ', 'TLT'];

    const tickers = Array.from(
      new Set(
        rawTickers
          .map((t) => (typeof t === 'string' ? t.trim().toUpperCase() : ''))
          .filter(Boolean)
      )
    ).slice(0, 12);

    if (tickers.length === 0) {
      return NextResponse.json({ error: 'No valid tickers provided' }, { status: 400 });
    }

    // Validate dates (optional)
    const start = isISODate(body.start) ? body.start : undefined;
    const end = isISODate(body.end) ? body.end : undefined;

    // First attempt: respect date filters
    let series = await fetchHistory(tickers, start, end);

    // If everything is empty, retry without from/to (some sources ignore filters)
    const hasAnyBars = series.some((row) => Array.isArray(row.bars) && row.bars.length > 3);
    if (!hasAnyBars) {
      series = await fetchHistory(tickers, undefined, undefined);
    }

    return NextResponse.json({ series });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'history error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}