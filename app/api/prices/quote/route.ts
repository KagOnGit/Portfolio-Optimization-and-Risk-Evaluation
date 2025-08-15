// app/api/prices/quote/route.ts
import { NextResponse } from 'next/server';
import { fetchQuoteSnapshot } from '@/lib/prices'; // ✅ correct export

type Body = { tickers?: string[] };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const tickers = (body.tickers && body.tickers.length ? body.tickers : ['SPY', 'QQQ', 'TLT'])
      .map((s) => s.toUpperCase())
      .slice(0, 20);

    if (!tickers.length) {
      return NextResponse.json({ error: 'No tickers provided' }, { status: 400 });
    }

    const snapshot = await fetchQuoteSnapshot(tickers);
    return NextResponse.json({ snapshot });
  } catch (e: any) {
    console.error('[quote] 500', { message: e?.message });
    return NextResponse.json({ error: e?.message || 'quote error' }, { status: 500 });
  }
}

export async function GET() {
  // Simple doc stub
  return NextResponse.json({
    info: 'POST { tickers: string[] }',
    example: { tickers: ['SPY', 'QQQ', 'TLT'] },
  });
}