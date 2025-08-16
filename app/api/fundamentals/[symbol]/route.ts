export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

type Fundamentals = {
  symbol: string;
  marketCap: number | null;
  pe: number | null;
  forwardPE: number | null;
  dividendYield: number | null;
  beta: number | null;
  high52w: number | null;
  low52w: number | null;
};

function num(x: any): number | null {
  if (x == null || x === 'None' || x === '-') return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

async function fetchFromYahoo(sym: string): Promise<Fundamentals | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
    const res = await fetch(url, {
      cache: 'no-store',
      next: { revalidate: 0 },
      headers: { 'User-Agent': 'Mozilla/5.0 (PortfolioApp; like Gecko)' },
    });
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json();
    const q = (j?.quoteResponse?.result || [])[0] || {};
    return {
      symbol: sym,
      marketCap: num(q.marketCap),
      pe: num(q.trailingPE),
      forwardPE: num(q.forwardPE),
      dividendYield: num(q.trailingAnnualDividendYield),
      beta: num(q.beta),
      high52w: num(q.fiftyTwoWeekHigh),
      low52w: num(q.fiftyTwoWeekLow),
    };
  } catch {
    return null;
  }
}

async function fetchFromAlphaVantage(sym: string): Promise<Fundamentals | null> {
  const AV = process.env.ALPHAVANTAGE_API_KEY || '';
  if (!AV) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(sym)}&apikey=${AV}`;
    const r = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0 (PortfolioApp; like Gecko)' } });
    const j = await r.json();
    return {
      symbol: sym,
      marketCap: num(j.MarketCapitalization),
      pe: num(j.PERatio),
      forwardPE: num(j.ForwardPE),
      dividendYield: num(j.DividendYield),
      beta: num(j.Beta),
      high52w: num(j['52WeekHigh']),
      low52w: num(j['52WeekLow']),
    };
  } catch {
    return null;
  }
}

async function fetchFromFmp(sym: string): Promise<Fundamentals | null> {
  const FMP = process.env.FMP_API_KEY || '';
  if (!FMP) return null;
  try {
    const url = `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(sym)}?apikey=${FMP}`;
    const r = await fetch(url, { cache: 'no-store' });
    const arr = await r.json();
    const j = Array.isArray(arr) ? arr[0] || {} : {};
    const dy = j.dividendYield ?? (j.lastDiv && j.price ? Number(j.lastDiv) / Number(j.price) : null);
const range = typeof j.range === 'string' ? j.range.split('-').map((s: string) => Number(s)) : [];
    return {
      symbol: sym,
      marketCap: num(j.mktCap),
      pe: num(j.pe ?? j.priceToEarningsRatioTTM),
      forwardPE: num(j.forwardPE),
      dividendYield: num(dy),
      beta: num(j.beta),
      high52w: num(j.yearHigh ?? range[1]),
      low52w: num(j.yearLow ?? range[0]),
    };
  } catch {
    return null;
  }
}

export async function GET(_req: Request, { params }: { params: { symbol: string } }) {
  const sym = (params.symbol || '').toUpperCase();
  if (!sym) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const fromYahoo = await fetchFromYahoo(sym);
  if (fromYahoo && Object.values(fromYahoo).some(v => v !== null)) {
    return NextResponse.json(fromYahoo, { headers: { 'Cache-Control': 'no-store' } });
  }

  const fromAv = await fetchFromAlphaVantage(sym);
  if (fromAv && Object.values(fromAv).some(v => v !== null)) {
    return NextResponse.json(fromAv, { headers: { 'Cache-Control': 'no-store' } });
  }

  const fromFmp = await fetchFromFmp(sym);
  if (fromFmp && Object.values(fromFmp).some(v => v !== null)) {
    return NextResponse.json(fromFmp, { headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json({
    symbol: sym,
    marketCap: null,
    pe: null,
    forwardPE: null,
    dividendYield: null,
    beta: null,
    high52w: null,
    low52w: null,
    error: 'fundamentals-failed',
  }, { status: 200 });
}
