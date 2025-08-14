import { NextResponse } from 'next/server';
import { fetchFredSeries } from '@/lib/macro';

const DEFAULT = ['CPIAUCSL','UNRATE','FEDFUNDS'];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { series = DEFAULT, start, end } = body || {};
    const key = process.env.FRED_API_KEY || '';

    if (!key) return NextResponse.json({ error: 'FRED_API_KEY missing' }, { status: 400 });

    const out = await Promise.all(
      (series as string[]).slice(0, 10).map(id => fetchFredSeries(id, key, start, end))
    );

    return NextResponse.json({  out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fred error' }, { status: 500 });
  }
}
