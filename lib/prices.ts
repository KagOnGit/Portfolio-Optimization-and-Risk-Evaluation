// lib/prices.ts
// Robust price utilities with FMP primary + Stooq fallback (with .us fix).

export type Bar = { date: string; close: number };
export type Series = { symbol: string; bars: Bar[] };

// --- helpers -------------------------------------------------
function parseCSV(csv: string): Bar[] {
  // Stooq CSV: DATE,OPEN,HIGH,LOW,CLOSE,VOLUME
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
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
    if (Number.isFinite(a) && Number.isFinite(b) && a !== 0) out.push(b / a - 1);
  }
  return out;
}

// --- internal: stooq fetch with .us fallback ----------------
async function fetchStooqDaily(symbolUpper: string): Promise<Bar[]> {
  // Try without suffix (e.g., spy) then with .us (spy.us)
  const candidates = [symbolUpper.toLowerCase(), `${symbolUpper.toLowerCase()}.us`];

  for (const s of candidates) {
    try {
      const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(s)}&i=d`;
      const res = await fetch(url, { cache: 'no-store' });
      const text = await res.text();
      const bars = parseCSV(text);
      if (bars.length > 0) return bars.sort((a, b) => (a.date < b.date ? -1 : 1));
    } catch {
      // try next candidate
    }
  }
  return [];
}

// --- snapshots for ribbon -----------------------------------
export async function fetchQuoteSnapshot(symbols: string[]) {
  const FMP = process.env.FMP_API_KEY || '';
  const out: Record<string, { last: number | null; changePct: number | null }> = {};
  const syms = symbols.map((s) => s.toUpperCase());

  // Primary: FMP (if available)
  if (FMP) {
    try {
      const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(
        syms.join(',')
      )}?apikey=${FMP}`;
      // Using /quote instead of quote-short so we can get change percent if provided
      const res = await fetch(url, { cache: 'no-store' });
      const j = (await res.json()) as Array<{ symbol?: string; price?: number; changesPercentage?: number }>;
      for (const s of syms) {
        const row = j.find((r) => (r?.symbol || '').toUpperCase() === s);
        const price = Number((row as any)?.price);
        const pct = Number((row as any)?.changesPercentage);
        out[s] = {
          last: Number.isFinite(price) ? price : null,
          changePct: Number.isFinite(pct) ? pct : null,
        };
      }
      return out;
    } catch {
      // fall through to stooq
    }
  }

  // Fallback: compute last & changePct from last two stooq bars
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

// Keep old server-only name that your routes might import
export const fetchQuoteSnapshotServer = fetchQuoteSnapshot;

// --- history (primary: FMP; fallback: Stooq) -----------------
export async function fetchHistory(
  symbols: string[],
  start?: string,
  end?: string
): Promise<Series[]> {
  const FMP = process.env.FMP_API_KEY || '';
  const syms = symbols.map((s) => s.toUpperCase());

  // Try FMP first (if key present)
  if (FMP) {
    try {
      const results: Series[] = [];
      for (const sym of syms) {
        const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(
          sym
        )}?serietype=line${start ? `&from=${start}` : ''}${end ? `&to=${end}` : ''}&apikey=${FMP}`;
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
      // fall through to Stooq
    }
  }

  // Fallback: Stooq CSV (try plain + .us)
  const results: Series[] = [];
  for (const symU of syms) {
    try {
      let bars = await fetchStooqDaily(symU);
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