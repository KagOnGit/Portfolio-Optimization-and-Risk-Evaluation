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
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
