import { NextResponse } from 'next/server';
import { fetchFMP } from '@/lib/api/fetchers';

export const revalidate = 3600;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbols = (searchParams.get('symbols') || 'SPY,AGG,GLD').split(',').map(s=>s.trim().toUpperCase()).slice(0,25);
  try {
    const out:any[] = [];
    for (const sym of symbols) {
      const [profile, quote, km] = await Promise.all([
        fetchFMP(`profile/${sym}`),
        fetchFMP(`quote/${sym}`),
        fetchFMP(`key-metrics-ttm/${sym}`)
      ]);
      const p = Array.isArray(profile)? profile[0]: profile;
      const q = Array.isArray(quote)? quote[0]: quote;
      const k = Array.isArray(km)? km[0]: km;
      out.push({
        symbol: sym,
        name: p?.companyName ?? sym,
        sector: p?.sector ?? p?.industry ?? '—',
        beta: Number(p?.beta ?? q?.beta ?? NaN),
        pe: Number(q?.pe ?? k?.peRatioTTM ?? NaN),
        marketCap: Number(q?.marketCap ?? p?.mktCap ?? NaN)
      });
    }
    return NextResponse.json({ ok:true, factors: out });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message }, { status: 500 });
  }
}
