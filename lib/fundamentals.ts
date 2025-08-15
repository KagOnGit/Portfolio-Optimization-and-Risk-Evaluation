import { fetchWithBackoff } from './backoff';
import { getCache, setCache } from './cache';

export type Fundamentals = {
  symbol: string;
  marketCap?: number | null;
  pe?: number | null;
  forwardPE?: number | null;
  peg?: number | null;
  profitMargin?: number | null;
  roe?: number | null;
  dividendYield?: number | null;
  beta?: number | null;
  week52High?: number | null;
  week52Low?: number | null;
};

const ONE_DAY = 24 * 60 * 60 * 1000;

function num(x: any): number | null {
  const n = typeof x === 'string' ? parseFloat(x) : (typeof x === 'number' ? x : NaN);
  return Number.isFinite(n) ? n : null;
}

export async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  const sym = symbol.toUpperCase();
  const key = `fund:${sym}`;
  const cached = getCache<Fundamentals>(key);
  if (cached) return cached;

  const avKey = process.env.ALPHAVANTAGE_API_KEY || '';
  if (!avKey) {
    const fallback = { symbol: sym };
    setCache(key, fallback, ONE_DAY);
    return fallback;
  }

  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(sym)}&apikey=${avKey}`;
    const res = await fetchWithBackoff(url, { cache: 'no-store' }, 3, 700);
    const j = await res.json();

    const f: Fundamentals = {
      symbol: sym,
      marketCap: num(j?.MarketCapitalization),
      pe: num(j?.PERatio),
      forwardPE: num(j?.ForwardPE),
      peg: num(j?.PEGRatio),
      profitMargin: num(j?.ProfitMargin),
      roe: num(j?.ReturnOnEquityTTM),
      dividendYield: num(j?.DividendYield),
      beta: num(j?.Beta),
      week52High: num(j?.['52WeekHigh']),
      week52Low: num(j?.['52WeekLow']),
    };

    setCache(key, f, ONE_DAY);
    return f;
  } catch {
    const fallback = { symbol: sym };
    setCache(key, fallback, ONE_DAY);
    return fallback;
  }
}