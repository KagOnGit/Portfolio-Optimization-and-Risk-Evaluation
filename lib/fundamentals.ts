// lib/fundamentals.ts
// Fetch small set of fundamentals with Alpha Vantage primary + Yahoo Finance fallback.
// Cache 24h per symbol to respect quotas.

import { getCache, setCache } from './cache';

export type Fundamentals = {
  symbol: string;
  marketCap?: number | null;   // absolute number
  pe?: number | null;          // trailing P/E
  forwardPE?: number | null;
  dividendYield?: number | null; // fraction (0.015 => 1.5%)
  beta?: number | null;
  week52High?: number | null;
  week52Low?: number | null;
};

const ONE_DAY = 24 * 60 * 60 * 1000;

function num(x: any): number | null {
  const n = typeof x === 'number' ? x : Number(x);
  return Number.isFinite(n) ? n : null;
}

function pickFirst<T>(...vals: (T | null | undefined)[]): T | null {
  for (const v of vals) if (v != null) return v as T;
  return null;
}

// ---------- Alpha Vantage (OVERVIEW) ----------
async function fetchAV(symbol: string): Promise<Fundamentals | null> {
  const key = process.env.ALPHAVANTAGE_API_KEY || '';
  if (!key) return null;

  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(
      symbol
    )}&apikey=${key}`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const j: any = await res.json();
    if (!j || typeof j !== 'object' || Object.keys(j).length === 0 || j.Note) return null;

    // AV returns strings
    const out: Fundamentals = {
      symbol,
      marketCap: num(j.MarketCapitalization),
      pe: num(j.PERatio),
      forwardPE: num(j.ForwardPE),
      dividendYield: num(j.DividendYield), // already fraction
      beta: num(j.Beta),
      week52High: num(j['52WeekHigh']),
      week52Low: num(j['52WeekLow']),
    };

    // If at least one field exists, use it
    const hasAny =
      out.marketCap ?? out.pe ?? out.forwardPE ?? out.dividendYield ?? out.beta ?? out.week52High ?? out.week52Low;
    return hasAny != null ? out : null;
  } catch {
    return null;
  }
}

// ---------- Yahoo Finance (quoteSummary) fallback ----------
async function fetchYahoo(symbol: string): Promise<Fundamentals | null> {
  // We use public quoteSummary endpoint (server-side only).
  // modules we care about: summaryDetail, defaultKeyStatistics, price
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
      symbol
    )}?modules=summaryDetail,defaultKeyStatistics,price`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;

    const j: any = await res.json();
    const result = j?.quoteSummary?.result?.[0];
    if (!result) return null;

    const price = result.price || {};
    const summary = result.summaryDetail || {};
    const stats = result.defaultKeyStatistics || {};

    // Yahoo uses {raw, fmt}
    const out: Fundamentals = {
      symbol,
      marketCap: num(price.marketCap?.raw ?? stats.marketCap?.raw ?? stats.enterpriseValue?.raw),
      pe: num(summary.trailingPE?.raw ?? stats.trailingPE?.raw),
      forwardPE: num(summary.forwardPE?.raw ?? stats.forwardPE?.raw),
      dividendYield: num(summary.dividendYield?.raw ?? stats.lastDividendValue?.raw ? summary.dividendYield?.raw : null),
      beta: num(summary.beta?.raw ?? stats.beta?.raw),
      week52High: num(summary.fiftyTwoWeekHigh?.raw ?? price.fiftyTwoWeekHigh?.raw),
      week52Low: num(summary.fiftyTwoWeekLow?.raw ?? price.fiftyTwoWeekLow?.raw),
    };

    const hasAny =
      out.marketCap ?? out.pe ?? out.forwardPE ?? out.dividendYield ?? out.beta ?? out.week52High ?? out.week52Low;
    return hasAny != null ? out : null;
  } catch {
    return null;
  }
}

// ---------- Public function with cache & fallback ----------
export async function fetchFundamentals(symbolRaw: string): Promise<Fundamentals> {
  const symbol = symbolRaw.toUpperCase().trim();
  const cacheKey = `fund:${symbol}`;

  const cached = getCache<Fundamentals>(cacheKey);
  if (cached) return cached;

  // 1) Alpha Vantage
  const av = await fetchAV(symbol);

  // 2) Yahoo fallback (esp. for ETFs / crypto)
  let best = av;
  if (!best) {
    const y = await fetchYahoo(symbol);
    best = y || null;
  } else {
    // If AV returned but missed several ETF fields, try to enrich with Yahoo
    const y = await fetchYahoo(symbol);
    if (y) {
      best = {
        symbol,
        marketCap: pickFirst(av.marketCap, y.marketCap),
        pe: pickFirst(av.pe, y.pe),
        forwardPE: pickFirst(av.forwardPE, y.forwardPE),
        dividendYield: pickFirst(av.dividendYield, y.dividendYield),
        beta: pickFirst(av.beta, y.beta),
        week52High: pickFirst(av.week52High, y.week52High),
        week52Low: pickFirst(av.week52Low, y.week52Low),
      };
    }
  }

  // 3) If still nothing, return empty object so UI shows "N/A" or hides rows
  const finalData: Fundamentals =
    best || {
      symbol,
      marketCap: null,
      pe: null,
      forwardPE: null,
      dividendYield: null,
      beta: null,
      week52High: null,
      week52Low: null,
    };

  setCache(cacheKey, finalData, ONE_DAY);
  return finalData;
}