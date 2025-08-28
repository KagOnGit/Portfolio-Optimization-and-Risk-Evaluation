import { NextResponse } from 'next/server';
import { fetchSEC } from '@/lib/api/fetchers';

export const revalidate = 21600;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cik = searchParams.get('cik') || '0000320193'; // Apple
  try {
    const data = await fetchSEC(`/Archives/edgar/data/${cik}/index.json`);
    return NextResponse.json({ ok: true, data });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message }, { status: 500 });
  }
}
