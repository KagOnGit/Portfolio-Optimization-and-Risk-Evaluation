import { NextResponse } from 'next/server';
import { fetchFRED } from '@/lib/api/fetchers';

export const revalidate = 3600;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const series = searchParams.get('series') || 'DGS10'; // 10Y Treasury
  const units = searchParams.get('units') || 'lin';
  try {
    // DEMO HOOK
    const data = (process.env.FRED_API_KEY ? await fetchFRED(series, { units }) : { observations: (await (await import('@/lib/api/fetchers')).demoFRED()).observations });
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
