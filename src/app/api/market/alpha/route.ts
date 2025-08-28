import { NextResponse } from 'next/server';
import { fetchAlphaVantage } from '@/lib/api/fetchers';

export const revalidate = 3600;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fn = searchParams.get('function') || 'TIME_SERIES_MONTHLY_ADJUSTED';
  const symbol = searchParams.get('symbol') || 'SPY';
  try {
    // DEMO HOOK
    const data = (process.env.ALPHAVANTAGE_API_KEY ? await fetchAlphaVantage('query', { function: fn, symbol }) : await (await import('@/lib/api/fetchers')).demoAlpha());
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
