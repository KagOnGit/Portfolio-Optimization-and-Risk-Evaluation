// Free Yahoo helpers (server-side). No API key required.
import { cachedJson } from '@/lib/cachedFetch';

type QuoteSummary = {
  price?: {
    marketCap?: { raw?: number };
    regularMarketPrice?: { raw?: number };
    symbol?: string;
  };
  summaryDetail?: {
    trailingPE?: { raw?: number };
    forwardPE?: { raw?: number };
    dividendYield?: { raw?: number };
    beta?: { raw?: number };
    fiftyTwoWeekHigh?: { raw?: number };
    fiftyTwoWeekLow?: { raw?: number };
  };
};

export type Fundamentals = {
  symbol: string;
  marketCap: number | null;
  pe: number | null;
  fpe: number | null;
  dividendYield: number | null;
  beta: number | null;
  high52w: number | null;
  low52w: number | null;
};

export async function fetchYahooFundamentals(symbol: string): Promise<Fundamentals> {
  const sym = symbol.toUpperCase();
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=price,summaryDetail`;
  const j = await cachedJson<{ quoteSummary?: { result?: QuoteSummary[] } }>(url, { ttl: 5 * 60_000 });

  const r = j?.quoteSummary?.result?.[0] || {};
  const sd = r.summaryDetail || {};
  const price = r.price || {};

  const num = (x: any) => (typeof x?.raw === 'number' ? x.raw : (typeof x === 'number' ? x : null));

  return {
    symbol: sym,
    marketCap: num(price.marketCap),
    pe: num(sd.trailingPE),
    fpe: num(sd.forwardPE),
    dividendYield: num(sd.dividendYield),       // fraction (e.g., 0.015) — format as percent client-side
    beta: num(sd.beta),
    high52w: num(sd.fiftyTwoWeekHigh),
    low52w: num(sd.fiftyTwoWeekLow),
  };
}