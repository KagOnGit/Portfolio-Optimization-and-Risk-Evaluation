import { NextResponse } from 'next/server';
import { fetchFRED } from '@/lib/api/fetchers';

export const revalidate = 3600;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const series = searchParams.get('series') || 'DGS10'; // 10Y Treasury
  const units = searchParams.get('units') || 'lin';
  try {
    const data = await fetchFRED(series, { units });
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
