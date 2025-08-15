// lib/fundamentals.ts
// Safe fundamentals fetch with AV primary + FMP fallback, null-safe merge.

import { fetchWithBackoff } from './backoff';
import { getCache, setCache } from './cache';

export type Fundamentals = {
  symbol: string;
  marketCap: number | null;
  pe: number | null;
  forwardPE: number | null;
  dividendYield: number | null;
  beta: number | null;
  week52High: number | null;
  week52Low: number | null;
};

const ONE_DAY = 24 * 60 * 60 * 1000;

function toNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** first non-null/finite number in args, else null */
function pickFirst(...vals: Array<number | null | undefined>): number | null {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function fetchAlphaVantageOverview(symbol: string): Promise<any | null> {
  const avKey = process.env.ALPHAVANTAGE_API_KEY || '';
  if (!avKey) return null;
  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(
    symbol
  )}&apikey=${avKey}`;
  try {
    const res = await fetchWithBackoff(url, { cache: 'no-store' }, 3, 700);
    if (!res.ok) return null;
    const j = await res.json();
    // If AV quota or invalid symbol, it returns {} or note.
    if (!j || typeof j !== 'object' || Object.keys(j).length === 0) return null;
    return j;
  } catch {
    return null;
  }
}

async function fetchFmpProfile(symbol: string): Promise<any | null> {
  const fmp = process.env.FMP_API_KEY || '';
  const base = `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(symbol)}`;
  const url = fmp ? `${base}?apikey=${fmp}` : base;
  try {
    const res = await fetchWithBackoff(url, { cache: 'no-store' }, 3, 700);
    if (!res.ok) return null;
    const j = await res.json();
    // FMP returns an array; use first element if present
    if (Array.isArray(j) && j.length > 0 && j[0] && typeof j[0] === 'object') return j[0];
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch & merge fundamentals from providers.
 * All fields are numbers or null; never undefined.
 */
export async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  const sym = symbol.toUpperCase();
  const cacheKey = `fund:${sym}`;
  const cached = getCache<Fundamentals>(cacheKey);
  if (cached) return cached;

  // Providers (either can be null)
  const [av, fmp] = await Promise.all([
    fetchAlphaVantageOverview(sym),
    fetchFmpProfile(sym),
  ]);

  // Null-safe access (THIS is the important fix):
  // Use optional chaining + ?? null so TypeScript never sees undefined,
  // and our pickFirst() only receives numbers or nulls.
  const result: Fundamentals = {
    symbol: sym,
    marketCap: pickFirst(
      toNum(av?.MarketCapitalization ?? null),
      toNum(fmp?.mktCap ?? fmp?.marketCap ?? null)
    ),
    pe: pickFirst(
      toNum(av?.PERatio ?? null),
      toNum(fmp?.pe ?? fmp?.priceEarningsRatio ?? null)
    ),
    forwardPE: pickFirst(
      toNum(av?.ForwardPE ?? null),
      toNum(fmp?.forwardPE ?? fmp?.priceEarningsRatioForward ?? null)
    ),
    dividendYield: pickFirst(
      toNum(av?.DividendYield ?? null),
      toNum(fmp?.lastDiv ?? fmp?.dividendYield ?? null) // FMP profile sometimes exposes lastDiv; yield may be pct
    ),
    beta: pickFirst(
      toNum(av?.Beta ?? null),
      toNum(fmp?.beta ?? null)
    ),
    week52High: pickFirst(
      toNum(av?.['52WeekHigh'] ?? null),
      // FMP profile has "range" like "120.00-160.00"; try to parse the high
      (() => {
        const r = String(fmp?.range ?? '');
        if (!r.includes('-')) return null;
        const hi = r.split('-')[1]?.trim();
        return toNum(hi);
      })()
    ),
    week52Low: pickFirst(
      toNum(av?.['52WeekLow'] ?? null),
      (() => {
        const r = String(fmp?.range ?? '');
        if (!r.includes('-')) return null;
        const lo = r.split('-')[0]?.trim();
        return toNum(lo);
      })()
    ),
  };

  setCache(cacheKey, result, ONE_DAY);
  return result;
}

export type { Fundamentals as FundamentalsType };