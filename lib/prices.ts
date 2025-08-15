// lib/prices.ts
// Robust price utilities with FMP primary + Stooq fallback.

export type Bar = { date: string; close: number };
export type Series = { symbol: string; bars: Bar[] };

// ---------- helpers ----------
function parseCSV(csv: string): Bar[] {
  // Stooq CSV: DATE,OPEN,HIGH,LOW,CLOSE,VOLUME
  const lines = csv.trim().split(/\r?\n/);
  const out: Bar[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 5) continue;
    const date = parts[0];
    const close = Number(parts[4]);
    if (date && Number.isFinite(close)) out.push({ date, close });
  }
  return out;
}

function withinRange(dateISO: string, start?: string, end?: string) {
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

// ---------- snapshots for ribbon ----------
export async function fetchQuoteSnapshotServer(symbols: string[]) {
  const FMP = process.env.FMP_API_KEY || '';
  const out: Record<string, { last: number | null; changePct: number | null }> = {};
  const syms = symbols.map((s) => s.toUpperCase());

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
      return out;
    }
  } catch {
    // fall through
  }

  // Fallback: derive last + changePct from history
  const hist = await fetchHistory(syms);
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

// ---------- history (FMP first; Stooq fallback) ----------
export async function fetchHistory(
  symbols: string[],
  start?: string,
  end?: string
): Promise<Series[]> {
  const FMP = process.env.FMP_API_KEY || '';
  const syms = symbols.map((s) => s.toUpperCase());

  if (FMP) {
    try {
      const results: Series[] = [];
      for (const sym of syms) {
        const url =
          `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(sym)}?serietype=line` +
          (start ? `&from=${start}` : '') +
          (end ? `&to=${end}` : '') +
          `&apikey=${FMP}`;
        const res = await fetch(url, { cache: 'no-store' });
        const j = (await res.json()) as { historical?: Array<{ date?: string; close?: number }> };
        const hist = Array.isArray(j?.historical) ? j.historical : [];
        const bars: Bar[] = hist
          .map((h: { date?: string; close?: number }): Bar => ({
            date: String(h?.date || ''),
            close: Number(h?.close),
          }))
          .filter((b: Bar) => b.date && Number.isFinite(b.close))
          .sort((a: Bar, b: Bar) => (a.date < b.date ? -1 : 1));
        results.push({ symbol: sym, bars });
      }
      if (results.some((r) => r.bars.length > 2)) return results;
    } catch {
      // fall through
    }
  }

  // Stooq fallback (no key); expects lower-case tickers
  const results: Series[] = [];
  for (const symU of syms) {
    const sym = symU.toLowerCase();
    try {
      const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(sym)}&i=d`;
      const res = await fetch(url, { cache: 'no-store' });
      const csv = await res.text();
      let bars = parseCSV(csv);
      if (start || end) {
        bars = bars.filter((b) => withinRange(b.date, start, end));
      }
      bars.sort((a, b) => (a.date < b.date ? -1 : 1));
      results.push({ symbol: symU, bars });
    } catch {
      results.push({ symbol: symU, bars: [] });
    }
  }
  return results;
}