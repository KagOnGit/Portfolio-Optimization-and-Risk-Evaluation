// Lightweight Yahoo Finance helpers (no key). Cache aggressively server-side.
import { cachedJson } from './cachedFetch';

type YNum = { raw?: number; fmt?: string };
type QuoteSummary = {
  price?: {
    marketCap?: YNum;
    regularMarketPrice?: YNum;
  };
  summaryDetail?: {
    trailingPE?: YNum;
    forwardPE?: YNum;
    dividendYield?: YNum; // fraction e.g. 0.015
    beta?: YNum;
    fiftyTwoWeekHigh?: YNum;
    fiftyTwoWeekLow?: YNum;
  };
};

function buildURL(symbol: string) {
  const mods = [
    'price',
    'summaryDetail',
    'defaultKeyStatistics',
  ].join('%2C');
  return `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${mods}`;
}

export async function fetchFundamentalsYahoo(symbol: string) {
  const url = buildURL(symbol);
  const data = await cachedJson<any>(url, {
    ttl: 6 * 60 * 60 * 1000, // 6h
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortfolioApp/1.0)' }
  });
  const result: QuoteSummary | undefined =
    data?.quoteSummary?.result?.[0] ?? undefined;

  const sd = result?.summaryDetail;
  const price = result?.price;

  const fmtPct = (x?: number) => (typeof x === 'number' ? x * 100 : undefined);

  return {
    marketCap: price?.marketCap?.raw ?? null,
    pe: sd?.trailingPE?.raw ?? null,
    fwdPE: sd?.forwardPE?.raw ?? null,
    dividendYieldPct: fmtPct(sd?.dividendYield?.raw) ?? null,
    beta: sd?.beta?.raw ?? null,
    week52High: sd?.fiftyTwoWeekHigh?.raw ?? null,
    week52Low: sd?.fiftyTwoWeekLow?.raw ?? null,
  };
}