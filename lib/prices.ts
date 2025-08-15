// lib/prices.ts
import { fetchWithBackoff } from './backoff';

export type PriceBar = { date: string; open: number; high: number; low: number; close: number; volume: number };
export type Series = { symbol: string; bars: PriceBar[] };
export type Quote = { last: number | null; prevClose: number | null; changePct: number | null };

const STQ_DAILY = 'https://stooq.com/q/d/l/';
const STQ_QUOTE = 'https://stooq.com/q/l/';

/** Map user symbol -> Stooq symbol */
export function toStooqSymbol(input: string): string {
  const s = input.trim().toUpperCase();
  if (s === 'BTC-USD' || s === 'BTCUSD') return 'btcusd';
  if (/\.[a-z]{2,3}$/i.test(s)) return s.toLowerCase();
  return `${s.toLowerCase()}.us`;
}

/** Fetch full daily CSV for a symbol and parse to bars */
export async function fetchStooqDailyCSV(symbol: string): Promise<PriceBar[]> {
  const sto = toStooqSymbol(symbol);
  const url = `${STQ_DAILY}?s=${encodeURIComponent(sto)}&i=d`;
  const res = await fetchWithBackoff(url, { cache: 'no-store' }, 3, 700);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  const out: PriceBar[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, open, high, low, close, volume] = lines[i].split(',').map(v => v.trim());
    const c = parseFloat(close);
    if (!Number.isFinite(c)) continue;
    out.push({
      date,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: c,
      volume: parseFloat(volume)
    });
  }
  return out;
}

/** Batch history for several symbols */
export async function fetchHistory(symbols: string[]): Promise<Series[]> {
  const results = await Promise.all(symbols.map(async s => {
    const bars = await fetchStooqDailyCSV(s);
    return { symbol: s.toUpperCase(), bars };
  }));
  return results;
}

/** Close-to-close returns */
export function closesToReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) r.push(closes[i] / closes[i-1] - 1);
  return r;
}

/** Helper: fetch last two daily closes (fallback path) */
async function fetchStooqDailyLastTwo(stoSymbol: string): Promise<{ last: number|null; prev: number|null }> {
  const url = `${STQ_DAILY}?s=${encodeURIComponent(stoSymbol)}&i=d`;
  const res = await fetchWithBackoff(url, { cache: 'no-store' }, 3, 700);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 3) return { last: null, prev: null };
  const lastRow = lines[lines.length - 1].split(',').map(x=>x.trim());
  const prevRow = lines[lines.length - 2].split(',').map(x=>x.trim());
  const last = parseFloat(lastRow[4]);
  const prev = parseFloat(prevRow[4]);
  return {
    last: Number.isFinite(last) ? last : null,
    prev: Number.isFinite(prev) ? prev : null
  };
}

/**
 * Robust server-side snapshot:
 * 1) Try lightweight quote CSV (may give only "close")
 * 2) Always compute prevClose via daily CSV
 * 3) Compute changePct when possible
 */
export async function fetchQuoteSnapshotServer(symbols: string[]): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  await Promise.all(symbols.map(async (sym) => {
    const key = sym.toUpperCase();
    const sto = toStooqSymbol(sym);
    try {
      // Attempt lightweight quote first
      const url = `${STQ_QUOTE}?s=${encodeURIComponent(sto)}&f=sd2t2ohlcv&h&e=csv`;
      const res = await fetchWithBackoff(url, { cache: 'no-store' }, 3, 700);
      const text = await res.text();
      const lines = text.trim().split(/\r?\n/);
      if (lines.length >= 2) {
        const row = lines[1].split(',');
        const close = parseFloat(row[6]);
        let last: number|null = Number.isFinite(close) ? close : null;

        const d = await fetchStooqDailyLastTwo(sto);
        const prevClose = d.prev;

        let changePct: number|null = null;
        if (last == null) last = d.last;
        if (last != null && prevClose != null && prevClose !== 0) {
          changePct = ((last - prevClose) / prevClose) * 100;
        }

        out[key] = { last, prevClose, changePct };
        return;
      }
      throw new Error('no rows');
    } catch {
      // full daily fallback
      try {
        const { last, prev } = await fetchStooqDailyLastTwo(sto);
        const changePct = (last != null && prev != null && prev !== 0)
          ? ((last - prev) / prev) * 100
          : null;
        out[key] = { last, prevClose: prev, changePct };
      } catch {
        out[key] = { last: null, prevClose: null, changePct: null };
      }
    }
  }));
  return out;
}