import { NextResponse } from 'next/server';
import { fetchFMP } from '@/lib/api/fetchers';

export const revalidate = 3600;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'AAPL';
  try {
    const data = await fetchFMP(`profile/${symbol}`);
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok:false, error }, { status: 500 });
  }
}
