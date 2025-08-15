// lib/prices.ts
// Robust price utilities with FMP primary + Stooq fallback, plus light symbol mapping for Stooq.

export type Bar = { date: string; close: number };
export type Series = { symbol: string; bars: Bar[] };

// --- helpers -------------------------------------------------

/** Parse a Stooq CSV into daily bars */
function parseCSV(csv: string): Bar[] {
  // Stooq CSV: DATE,OPEN,HIGH,LOW,CLOSE,VOLUME
  const lines: string[] = csv.trim().split(/\r?\n/);
  const out: Bar[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts: string[] = lines[i].split(',');
    if (parts.length < 5) continue;
    const date = parts[0];
    const close = Number(parts[4]);
    if (date && Number.isFinite(close)) out.push({ date, close });
  }
  // Ensure ascending by date
  out.sort((a: Bar, b: Bar) => (a.date < b.date ? -1 : 1));
  return out;
}

/** Date filter helper (ISO yyyy-mm-dd) */
function withinRange(dateISO: string, start?: string, end?: string): boolean {
  if (!start && !end) return true;
  if (start && dateISO < start) return false;
  if (end && dateISO > end) return false;
  return true;
}

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

// --- Stooq symbol mapping -----------------------------------

/**
 * Minimal Stooq mapping for common US tickers/ETFs.
 * If no explicit mapping exists, default to `${lower}.us`.
 */
const STOOQ_MAP: Record<string, string> = {
  SPY: 'spy.us',
  QQQ: 'qqq.us',
  TLT: 'tlt.us',
  GLD: 'gld.us',
  AAPL: 'aapl.us',
  MSFT: 'msft.us',
  META: 'meta.us',
  AMZN: 'amzn.us',
  NVDA: 'nvda.us',
  GOOG: 'goog.us',
  GOOGL: 'googl.us',
};

function toStooqSymbol(symU: string): string {
  const upper = symU.toUpperCase();
  if (STOOQ_MAP[upper]) return STOOQ_MAP[upper];
  // crude default for US listings
  return `${upper.toLowerCase()}.us`;
}

// --- snapshots for ribbon -----------------------------------

export async function fetchQuoteSnapshot(symbols: string[]) {
  const FMP = process.env.FMP_API_KEY || '';
  const out: Record<string, { last: number | null; changePct: number | null }> = {};
  const syms: string[] = symbols.map((s) => s.toUpperCase());

  // Try FMP (quote-short for price)
  try {
    if (FMP) {
      const url = `https://financialmodelingprep.com/api/v3/quote-short/${encodeURIComponent(
        syms.join(',')
      )}?apikey=${FMP}`;
      const res = await fetch(url, { cache: 'no-store' });
      const j = (await res.json()) as Array<{ symbol?: string; price?: number }>;
      for (const s of syms) {
        const row = j.find((r) => (r?.symbol || '').toUpperCase() === s);
        const price = Number(row?.price);
        out[s] = { last: Number.isFinite(price) ? price : null, changePct: null };
      }
      // If we have some prices but not % change, estimate using last two bars
      const hist = await fetchHistory(syms, undefined, undefined);
      for (const s of syms) {
        if (out[s]?.last != null && out[s]?.changePct == null) {
          const bars = (hist.find((h) => h.symbol === s)?.bars || []).slice(-2);
          if (bars.length === 2) {
            const prev = bars[0].close;
            const last = bars[1].close;
            const cp = prev ? ((last - prev) / prev) * 100 : null;
            out[s].changePct = Number.isFinite(cp as number) ? (cp as number) : null;
          }
        }
      }
      return out;
    }
  } catch {
    // fall through to fallback path
  }

  // Fallback: approximate from last bar of history (Stooq)
  const hist = await fetchHistory(syms, undefined, undefined);
  for (const s of syms) {
    const bars = (hist.find((h) => h.symbol === s)?.bars || []).slice(-2);
    let last: number | null = null;
    let changePct: number | null = null;
    if (bars.length) {
      last = bars[bars.length - 1].close;
      if (bars.length === 2) {
        const prev = bars[0].close;
        changePct = prev ? ((last - prev) / prev) * 100 : null;
      }
    }
    out[s] = { last, changePct };
  }
  return out;
}

// --- history (primary: FMP; fallback: Stooq) -----------------

export async function fetchHistory(
  symbols: string[],
  start?: string,
  end?: string
): Promise<Series[]> {
  const FMP = process.env.FMP_API_KEY || '';
  const syms: string[] = symbols.map((s) => s.toUpperCase());

  // Try FMP first
  if (FMP) {
    try {
      const results: Series[] = [];
      for (const sym of syms) {
        // historical-price-full supports from/to
        const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(
          sym
        )}?serietype=line${start ? `&from=${start}` : ''}${end ? `&to=${end}` : ''}&apikey=${FMP}`;
        const res = await fetch(url, { cache: 'no-store' });
        const j = (await res.json()) as { historical?: Array<{ date?: string; close?: number }> };
        const hist = Array.isArray(j?.historical) ? j.historical : [];
        const bars: Bar[] = hist
          .map((h: { date?: string; close?: number }) => ({
            date: String(h?.date || ''),
            close: Number(h?.close),
          }))
          .filter((b: Bar) => b.date && Number.isFinite(b.close))
          .sort((a: Bar, b: Bar) => (a.date < b.date ? -1 : 1));
        results.push({ symbol: sym, bars });
      }
      // If at least one symbol returned data, ship it
      if (results.some((r) => r.bars.length > 2)) return results;
    } catch {
      // fall through to Stooq
    }
  }

  // Fallback: Stooq CSV (no API key).
  const results: Series[] = [];
  for (const symU of syms) {
    const stooqSym = toStooqSymbol(symU);
    try {
      const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSym)}&i=d`;
      const res = await fetch(url, { cache: 'no-store' });
      const csv = await res.text();
      let bars = parseCSV(csv);
      if (start || end) {
        bars = bars.filter((b: Bar) => withinRange(b.date, start, end));
      }
      results.push({ symbol: symU, bars });
    } catch {
      results.push({ symbol: symU, bars: [] });
    }
  }
  return results;
}