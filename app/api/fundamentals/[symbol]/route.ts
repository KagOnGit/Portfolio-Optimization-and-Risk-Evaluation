// app/api/fundamentals/[symbol]/route.ts
import { NextResponse } from 'next/server';

type FmpProfile = {
  symbol?: string;
  price?: number;
  mktCap?: number;
  marketCap?: number;
  pe?: number;
  forwardPE?: number;
  beta?: number;
  lastDiv?: number;
  '52WeekHigh'?: number;
  '52WeekLow'?: number;
};

type FmpQuote = {
  price?: number;
  marketCap?: number;
  pe?: number;
  forwardPE?: number;
  beta?: number;
  lastDiv?: number;
  yearHigh?: number; // sometimes used
  yearLow?: number;  // sometimes used
};

function pickNum(...candidates: Array<unknown>): number | null {
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n !== 0) return n;
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: { symbol: string } }
) {
  const sym = String(params.symbol || '').toUpperCase();
  const key = process.env.FMP_API_KEY || '';

  let profile: FmpProfile | null = null;
  let quote: FmpQuote | null = null;

  if (key) {
    try {
      // profile has mktCap / 52w values fairly consistently
      const pr = await fetch(
        `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(
          sym
        )}?apikey=${key}`,
        { cache: 'no-store' }
      );
      const pj = (await pr.json()) as any[];
      profile = Array.isArray(pj) && pj.length ? (pj[0] as FmpProfile) : null;
    } catch {}

    try {
      // quote fills gaps when profile misses something
      const qr = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(
          sym
        )}?apikey=${key}`,
        { cache: 'no-store' }
      );
      const qj = (await qr.json()) as any[];
      quote = Array.isArray(qj) && qj.length ? (qj[0] as FmpQuote) : null;
    } catch {}
  }

  // If we still have nothing, return explicit nulls so the UI shows “—”
  const marketCap = pickNum(profile?.mktCap, profile?.marketCap, quote?.marketCap);
  const pe = pickNum(profile?.pe, quote?.pe);
  const forwardPE = pickNum(profile?.forwardPE, quote?.forwardPE);
  const dividendYield = pickNum(profile?.lastDiv, quote?.lastDiv);
  const beta = pickNum(profile?.beta, quote?.beta);
  const week52High = pickNum(
    (profile as any)?.['52WeekHigh'],
    (profile as any)?.['52 week high'],
    quote?.yearHigh
  );
  const week52Low = pickNum(
    (profile as any)?.['52WeekLow'],
    (profile as any)?.['52 week low'],
    quote?.yearLow
  );

  return NextResponse.json({
    symbol: sym,
    marketCap,
    pe,
    forwardPE,
    dividendYield,
    beta,
    week52High,
    week52Low,
  });
}