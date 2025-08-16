// lib/prices.ts
// Quotes via Yahoo (no key), fundamentals via Yahoo, history via FMP -> Stooq fallback.

export type Bar = { date: string; close: number };
export type Series = { symbol: string; bars: Bar[] };

// ----------------- helpers -----------------

/** Parse a Stooq CSV into daily bars (ascending by date) */
export function parseCSV(csv: string): Bar[] {
  const lines = csv.trim().split(/\r?\n/);
  const out: Bar[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 5) continue;
    const date = parts[0];
    const close = Number(parts[4]);
    if (date && Number.isFinite(close)) out.push({ date, close });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

/** Inclusive start/end ISO filter (yyyy-mm-dd) */
export function withinRange(dateISO: string, start?: string, end?: string): boolean {
  if (start && dateISO < start) return false;
  if (end && dateISO > end) return false;
  return true;
}

/** Convert a close-price series to simple returns */
export function closesToReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1];
    const b = closes[i];
    if (Number.isFinite(a) && Number.isFinite(b) && a !== 0) {
      out.push(b / a - 1);
    }
  }
  return out;
}

// ----------------- Stooq symbol mapping -----------------

const STOOQ_MAP: Record<string, string> = {
  SPY: 'spy.us',
  QQQ: 'qqq.us',
  TLT: 'tlt.us',
  GLD: 'gld.us',
  AAPL: 'aapl.us',
  MSFT: 'msft.us',
  NVDA: 'nvda.us',
  AMZN: 'amzn.us',
  META: 'meta.us',
  GOOG: 'goog.us',
  GOOGL: 'googl.us',
};

export const toStooqSymbol = (s: string) =>
  STOOQ_MAP[s.toUpperCase()] ?? `${s.toLowerCase()}.us`;

// ----------------- QUOTES (Yahoo) -----------------

type YQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
};

export async function fetchQuoteSnapshot(symbols: string[]) {
  const syms = Array.from(new Set(symbols.map((s) => s.toUpperCase()))).slice(0, 24);
  if (syms.length === 0) return {};

  // Primary: Yahoo Finance quote endpoint (no key)
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
      syms.join(',')
    )}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (portfolio-app)' },
      cache: 'no-store',
    });
    const j = (await res.json()) as { quoteResponse?: { result?: YQuote[] } };
    const arr = j?.quoteResponse?.result ?? [];
    const out: Record<string, { last: number | null; changePct: number | null }> = {};
    let missing: string[] = [];
    for (const s of syms) {
      const row = arr.find((r) => (r.symbol || '').toUpperCase() === s);
      const last = Number(row?.regularMarketPrice);
      const chg = Number(row?.regularMarketChangePercent);
      const lastVal = Number.isFinite(last) ? last : null;
      const chgVal = Number.isFinite(chg) ? chg : null;
      out[s] = { last: lastVal, changePct: chgVal };
      if (lastVal == null || chgVal == null) missing.push(s);
    }

    // If any are missing, backfill from recent history (last two closes)
    if (missing.length) {
      const hist = await fetchHistory(missing);
      for (const s of missing) {
        const bars = (hist.find((h) => h.symbol === s)?.bars || []).slice(-2);
        if (bars.length >= 1) {
          const lastClose = bars[bars.length - 1].close;
          if (out[s].last == null && Number.isFinite(lastClose)) out[s].last = lastClose;
        }
        if (bars.length === 2) {
          const prev = bars[0].close;
          const lastClose = bars[1].close;
          const pct = prev ? ((lastClose - prev) / prev) * 100 : null;
          if (out[s].changePct == null && (pct == null || Number.isFinite(pct))) out[s].changePct = pct as any;
        }
      }
    }

    return out;
  } catch {
    // fall through to history approximation
  }

  // Fallback: approximate % change from last two bars of recent history
  const hist = await fetchHistory(syms);
  const out: Record<string, { last: number | null; changePct: number | null }> = {};
  for (const s of syms) {
    const bars = (hist.find((h) => h.symbol === s)?.bars || []).slice(-2);
    let last: number | null = null;
    let pct: number | null = null;
    if (bars.length) {
      last = bars[bars.length - 1].close;
      if (bars.length === 2) {
        const prev = bars[0].close;
        pct = prev ? ((last - prev) / prev) * 100 : null;
      }
    }
    out[s] = { last, changePct: pct };
  }
  return out;
}

/** Back-compat alias (older code may import this name) */
export const fetchQuoteSnapshotServer = fetchQuoteSnapshot;

// ----------------- FUNDAMENTALS (Yahoo) -----------------

export type Fundamentals = {
  marketCap?: number | null;
  pe?: number | null;
  forwardPE?: number | null;
  dividendYield?: number | null;
  beta?: number | null;
  high52w?: number | null;
  low52w?: number | null;
};

export async function fetchFundamentalsYahoo(symbol: string): Promise<Fundamentals> {
  const s = symbol.toUpperCase();

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(s)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (portfolio-app)' },
    cache: 'no-store',
  });
  const j = (await res.json()) as { quoteResponse?: { result?: any[] } };
  const q = (j.quoteResponse?.result || [])[0] || {};

  return {
    marketCap: Number.isFinite(q.marketCap) ? q.marketCap : null,
    pe: Number.isFinite(q.trailingPE) ? q.trailingPE : null,
    forwardPE: Number.isFinite(q.forwardPE) ? q.forwardPE : null,
    dividendYield: Number.isFinite(q.trailingAnnualDividendYield)
      ? q.trailingAnnualDividendYield
      : null,
    beta: Number.isFinite(q.beta) ? q.beta : null,
    high52w: Number.isFinite(q.fiftyTwoWeekHigh) ? q.fiftyTwoWeekHigh : null,
    low52w: Number.isFinite(q.fiftyTwoWeekLow) ? q.fiftyTwoWeekLow : null,
  };
}

// ----------------- HISTORY (FMP -> Stooq) -----------------

async function fetchYahooHistory(symbol: string, start?: string, end?: string): Promise<Bar[]> {
  try {
    const s = symbol.toUpperCase();
    let url = '';
    if (start || end) {
      // Yahoo requires unix seconds for period1/period2; default ranges around bounds
      const toSec = (iso: string) => Math.floor(new Date(iso + 'T00:00:00Z').getTime() / 1000);
      const p1 = start ? toSec(start) : Math.floor(Date.now() / 1000) - 5 * 365 * 24 * 3600;
      const p2 = end ? toSec(end) : Math.floor(Date.now() / 1000);
      url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&period1=${p1}&period2=${p2}`;
    } else {
      url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=5y`;
    }
    const res = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0 (portfolio-app)' } });
    const j = await res.json();
    const result = j?.chart?.result?.[0];
    const ts: number[] = result?.timestamp || [];
    const closeArr: number[] = result?.indicators?.quote?.[0]?.close || result?.indicators?.adjclose?.[0]?.adjclose || [];
    const out: Bar[] = [];
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i];
      const c = Number(closeArr[i]);
      if (!Number.isFinite(c) || !t) continue;
      const d = new Date(t * 1000).toISOString().slice(0, 10);
      if (start && d < start) continue;
      if (end && d > end) continue;
      out.push({ date: d, close: c });
    }
    out.sort((a, b) => (a.date < b.date ? -1 : 1));
    return out;
  } catch {
    return [];
  }
}

export async function fetchHistory(
  symbols: string[],
  start?: string,
  end?: string
): Promise<Series[]> {
  const FMP = process.env.FMP_API_KEY || '';
  const syms = symbols.map((s) => s.toUpperCase());

  // Primary: FMP historical-price-full (supports from/to)
  if (FMP) {
    try {
      const out: Series[] = [];
      for (const s of syms) {
        const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(
          s
        )}?serietype=line${start ? `&from=${start}` : ''}${end ? `&to=${end}` : ''}&apikey=${FMP}`;
        const r = await fetch(url, { cache: 'no-store' });
        const j = (await r.json()) as { historical?: Array<{ date?: string; close?: number }> };
        const bars = (j.historical || [])
          .map((h) => ({ date: String(h.date || ''), close: Number(h.close) }))
          .filter((b) => b.date && Number.isFinite(b.close))
          .sort((a, b) => (a.date < b.date ? -1 : 1));
        out.push({ symbol: s, bars });
      }
      // If any symbol returned decent data, use it
      if (out.some((x) => x.bars.length > 2)) return out;
    } catch {
      // fall through
    }
  }

  // Secondary: Yahoo chart API (no key)
  try {
    const out: Series[] = [];
    for (const s of syms) {
      const bars = await fetchYahooHistory(s, start, end);
      out.push({ symbol: s, bars });
    }
    if (out.some((x) => x.bars.length > 2)) return out;
  } catch {
    // fall through
  }

  // Fallback: Stooq CSV (no key)
  const out: Series[] = [];
  for (const s of syms) {
    try {
      const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(toStooqSymbol(s))}&i=d`;
      const r = await fetch(url, { cache: 'no-store' });
      const csv = await r.text();
      let bars = parseCSV(csv);
      if (start || end) bars = bars.filter((b) => withinRange(b.date, start, end));
      out.push({ symbol: s, bars });
    } catch {
      out.push({ symbol: s, bars: [] });
    }
  }
  return out;
}
