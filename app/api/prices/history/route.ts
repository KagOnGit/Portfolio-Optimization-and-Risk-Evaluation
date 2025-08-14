import { NextResponse } from 'next/server';
import { fetchHistory } from '@/lib/prices';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tickers = ['SPY','QQQ','TLT'], start, end } = body || {};
    const upper = (tickers as string[]).map(s => s.toUpperCase()).slice(0, 20);

    const series = await fetchHistory(upper);
    // Optional: date filtering server-side
    // For simplicity, return all; client can slice by dates for now.

    return NextResponse.json({ series });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'history error' }, { status: 500 });
  }
}
