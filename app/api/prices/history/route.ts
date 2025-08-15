// app/api/prices/history/route.ts
import { NextResponse } from 'next/server';
import { fetchHistory, Series } from '@/lib/prices';

type Body = {
  // Accept either "tickers" (what the UI sends) or "symbols" (older code)
  tickers?: string[];
  symbols?: string[];
  start?: string;
  end?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const input = Array.isArray(body.tickers) && body.tickers.length
      ? body.tickers
      : Array.isArray(body.symbols) && body.symbols.length
      ? body.symbols
      : ['SPY', 'QQQ', 'TLT'];

    const tickers = input.map((s) => s.toUpperCase()).slice(0, 25);
    const start = body.start && String(body.start);
    const end = body.end && String(body.end);

    const series: Series[] = await fetchHistory(tickers, start, end);

    return NextResponse.json({ series });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'history error' }, { status: 500 });
  }
}

// Optional: a simple GET that documents usage
export async function GET() {
  return NextResponse.json({
    info: 'POST { tickers?: string[], start?: "YYYY-MM-DD", end?: "YYYY-MM-DD" }',
    example: { tickers: ['SPY', 'QQQ', 'TLT'] },
  });
}