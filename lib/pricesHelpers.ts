// lib/pricesHelpers.ts
// Small, framework-agnostic helpers used by prices/news utilities.

export type Bar = { date: string; close: number };

/** Parse a Stooq-style CSV (DATE,OPEN,HIGH,LOW,CLOSE,VOLUME) into daily bars. */
export function parseCSV(csv: string): Bar[] {
  const lines = (csv || '').trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const out: Bar[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 5) continue;
    const date = parts[0];
    const close = Number(parts[4]);
    if (date && Number.isFinite(close)) out.push({ date, close });
  }
  // Ensure ascending by date (ISO strings compare lexicographically)
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
}

/** Inclusive ISO date filter: keeps records inside [start, end]. */
export function withinRange(dateISO: string, start?: string, end?: string): boolean {
  if (!dateISO) return false;
  if (start && dateISO < start) return false;
  if (end && dateISO > end) return false;
  return true;
}

/** Convert close prices to simple returns (b/a - 1). Skips non-finite and zero-divide. */
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

/** Minimal Stooq mapping for common US tickers/ETFs; default to `${lower}.us`. */
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
export function toStooqSymbol(sym: string): string {
  const u = (sym || '').toUpperCase();
  return STOOQ_MAP[u] ?? `${u.toLowerCase()}.us`;
}