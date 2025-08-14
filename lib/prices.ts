// Free Stooq CSV fetchers + simple snapshot builder with robust fallbacks.
// For U.S. tickers, Stooq uses `.us` suffix (e.g., spy.us, aapl.us).
// For BTC-USD we use stooq btcusd for a simple last; if unavailable, we mock.

export type Quote = {
  last: number | null;
  prevClose: number | null;
  changePct: number | null;
};

const STQ_BASE = 'https://stooq.com/q/l/';
const STQ_DAILY = 'https://stooq.com/q/d/l/';

// Map user symbol -> stooq symbol
function toStooqSymbol(input: string): string {
  const s = input.trim().toUpperCase();
  if (s === 'BTC-USD' || s === 'BTCUSD') return 'btcusd';
  // If it already looks like stooq with .us, pass through
  if (/\.[a-z]{2,3}$/i.test(s)) return s.toLowerCase();
  return `${s.toLowerCase()}.us`;
}

// Fetch current quote (CSV last + previous close if available)
async function fetchStooqQuoteCSV(stooqSymbol: string): Promise<Quote> {
  // Lightweight quote endpoint: q/l/?s=spy.us,i=0  -> CSV: symbol,price,change,open,high,low,volume
  // But reliability varies; as a fallback, fetch last two daily candles and compute.
  try {
    const url = `${STQ_BASE}?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`stooq quote ${stooqSymbol} ${res.status}`);
    const text = await res.text();
    // Parse CSV header + first row
    // symbol,date,time,open,high,low,close,volume
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error('no rows');
    const row = lines[1].split(',');
    const close = parseFloat(row[6]);
    if (Number.isFinite(close)) {
      return { last: close, prevClose: null, changePct: null };
    }
    throw new Error('bad close');
  } catch {
    // Fallback to last two daily candles
    try {
      const url = `${STQ_DAILY}?s=${encodeURIComponent(stooqSymbol)}&i=d`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`stooq daily ${stooqSymbol} ${res.status}`);
      const text = await res.text();
      // date,open,high,low,close,volume
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 3) throw new Error('not enough candles');
      const last = lines[lines.length - 1].split(',').map((x) => x.trim());
      const prev = lines[lines.length - 2].split(',').map((x) => x.trim());
      const lastClose = parseFloat(last[4]);
      const prevClose = parseFloat(prev[4]);
      if (!Number.isFinite(lastClose) || !Number.isFinite(prevClose)) throw new Error('bad numbers');
      const changePct = prevClose === 0 ? 0 : ((lastClose - prevClose) / prevClose) * 100;
      return { last: lastClose, prevClose, changePct };
    } catch {
      return { last: null, prevClose: null, changePct: null };
    }
  }
}

// MOCK if all else fails to keep ribbon stable
const MOCK: Record<string, Quote> = {
  'SPY': { last: 553.12, prevClose: 550.00, changePct: ((553.12 - 550) / 550) * 100 },
  'QQQ': { last: 504.77, prevClose: 502.10, changePct: ((504.77 - 502.10) / 502.10) * 100 },
  'AAPL': { last: 227.31, prevClose: 226.50, changePct: ((227.31 - 226.50) / 226.50) * 100 },
  'MSFT': { last: 455.62, prevClose: 453.00, changePct: ((455.62 - 453.00) / 453.00) * 100 },
  'TLT': { last: 93.41, prevClose: 93.90, changePct: ((93.41 - 93.90) / 93.90) * 100 },
  'GLD': { last: 234.15, prevClose: 233.50, changePct: ((234.15 - 233.50) / 233.50) * 100 },
  'BTC-USD': { last: 63_500, prevClose: 62_900, changePct: ((65_00 - 62_90) / 62_90) }, // harmless placeholder
};

export async function fetchQuoteSnapshot(symbols: string[]): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  await Promise.all(
    symbols.map(async (sym) => {
      const key = sym.toUpperCase();
      try {
        const sto = toStooqSymbol(sym);
        const q = await fetchStooqQuoteCSV(sto);
        if (q.last != null && q.changePct == null && q.prevClose != null) {
          q.changePct = q.prevClose === 0 ? 0 : ((q.last - q.prevClose) / q.prevClose) * 100;
        }
        if (q.last == null && MOCK[key]) {
          out[key] = MOCK[key];
        } else {
          out[key] = q;
        }
      } catch {
        out[key] = MOCK[key] || { last: null, prevClose: null, changePct: null };
      }
    })
  );
  return out;
}
