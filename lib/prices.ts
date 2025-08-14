import { fetchWithBackoff } from './backoff';

export type PriceBar = { date: string; open: number; high: number; low: number; close: number; volume: number };
export type Series = { symbol: string; bars: PriceBar[] };
export type Quote = { last: number | null; prevClose: number | null; changePct: number | null };

const STQ_DAILY = 'https://stooq.com/q/d/l/';
const STQ_QUOTE = 'https://stooq.com/q/l/';

export function toStooqSymbol(input: string): string {
  const s = input.trim().toUpperCase();
  if (s === 'BTC-USD' || s === 'BTCUSD') return 'btcusd';
  if (/\.[a-z]{2,3}$/i.test(s)) return s.toLowerCase();
  return `${s.toLowerCase()}.us`;
}

export async function fetchStooqDailyCSV(symbol: string): Promise<PriceBar[]> {
  const sto = toStooqSymbol(symbol);
  const url = `${STQ_DAILY}?s=${encodeURIComponent(sto)}&i=d`;
  const res = await fetchWithBackoff(url, { cache: 'no-store' });
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

export async function fetchHistory(symbols: string[]): Promise<Series[]> {
  const results = await Promise.all(symbols.map(async s => {
    const bars = await fetchStooqDailyCSV(s);
    return { symbol: s.toUpperCase(), bars };
  }));
  return results;
}

export function closesToReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) r.push(closes[i] / closes[i-1] - 1);
  return r;
}

export async function fetchQuoteSnapshot(symbols: string[]): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  await Promise.all(symbols.map(async sym => {
    const sto = toStooqSymbol(sym);
    try {
      const url = `${STQ_QUOTE}?s=${encodeURIComponent(sto)}&f=sd2t2ohlcv&h&e=csv`;
      const res = await fetchWithBackoff(url, { cache: 'no-store' });
      const text = await res.text();
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) throw new Error('no rows');
      const row = lines[1].split(',');
      const close = parseFloat(row[6]);
      if (Number.isFinite(close)) {
        out[sym.toUpperCase()] = { last: close, prevClose: null, changePct: null };
        return;
      }
      throw new Error('bad close');
    } catch {
      try {
        const daily = await fetchStooqDailyCSV(sym);
        if (daily.length >= 2) {
          const last = daily[daily.length - 1].close;
          const prev = daily[daily.length - 2].close;
          out[sym.toUpperCase()] = {
            last,
            prevClose: prev,
            changePct: prev === 0 ? 0 : ((last - prev) / prev) * 100
          };
        } else {
          out[sym.toUpperCase()] = { last: null, prevClose: null, changePct: null };
        }
      } catch {
        out[sym.toUpperCase()] = { last: null, prevClose: null, changePct: null };
      }
    }
  }));
  return out;
}
