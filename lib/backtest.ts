// lib/backtest.ts
import { fetchHistory, closesToReturns, Series } from '@/lib/prices';

export type Weights = Record<string, number>; // symbol -> weight (0..1), should sum ~1
export type BacktestRequest = {
  tickers: string[];
  start?: string;
  end?: string;
  weights?: Weights;        // optional; if omitted we use equal-weight
  rebalance?: 'none'|'monthly'|'quarterly'|'annual'; // future use (currently 'none')
};
export type BacktestResponse = {
  dates: string[];    // ISO dates aligned across all tickers
  equity: number[];   // normalized to 1.0 on first date
  weightsUsed: Weights;
  meta: { nAssets: number; start?: string; end?: string };
};

// align series by common dates
function alignSeries(series: Series[]): { dates: string[]; closes: Record<string, number[]> } {
  if (!series.length) return { dates: [], closes: {} };
  // Build a date set intersection
  const sets = series.map(s => new Set(s.bars.map(b => b.date)));
  const common = new Set<string>(series[0].bars.map(b => b.date));
  for (let i = 1; i < sets.length; i++) {
    for (const d of Array.from(common)) {
      if (!sets[i].has(d)) common.delete(d);
    }
  }
  const dates = Array.from(common).sort((a,b)=>a<b?-1:1);
  const closes: Record<string, number[]> = {};
  for (const s of series) {
    const map = new Map(s.bars.map(b => [b.date, b.close] as const));
    closes[s.symbol] = dates.map(d => Number(map.get(d)));
  }
  return { dates, closes };
}

export async function runBacktest(req: BacktestRequest): Promise<BacktestResponse> {
  const syms = (req.tickers || []).map(s=>s.toUpperCase()).slice(0, 12);
  if (!syms.length) return { dates: [], equity: [], weightsUsed: {}, meta: { nAssets: 0, start: req.start, end: req.end } };

  const hist = await fetchHistory(syms, req.start, req.end); // uses FMP→Stooq fallback
  const { dates, closes } = alignSeries(hist);
  if (dates.length < 3) {
    return { dates: [], equity: [], weightsUsed: {}, meta: { nAssets: syms.length, start: req.start, end: req.end } };
  }

  // weights (equal-weight if not provided)
  const w: Weights = {};
  const activeSyms = syms.filter(s => (closes[s] || []).length === dates.length);
  const provided = req.weights && Object.keys(req.weights).length ? req.weights : undefined;
  if (provided) {
    // keep only symbols we actually have aligned data for
    const kept = Object.entries(provided).filter(([s, val]) => activeSyms.includes(s.toUpperCase()) && Number.isFinite(val));
    const sum = kept.reduce((a, [,v]) => a + Number(v), 0);
    for (const [s, v] of kept) w[s.toUpperCase()] = sum ? Number(v) / sum : 0;
  } else {
    const ew = activeSyms.length ? 1 / activeSyms.length : 0;
    for (const s of activeSyms) w[s] = ew;
  }

  // compute daily portfolio returns from closes
  // daily return per asset r_t = close_t / close_{t-1} - 1
  const portRets: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    let r = 0;
    for (const s of Object.keys(w)) {
      const cs = closes[s];
      if (!cs) continue;
      const prev = cs[i-1];
      const cur  = cs[i];
      if (Number.isFinite(prev) && Number.isFinite(cur) && prev !== 0) {
        r += w[s] * (cur / prev - 1);
      }
    }
    portRets.push(r);
  }
  // equity
  const equity: number[] = [1];
  for (const r of portRets) {
    const last = equity[equity.length-1];
    equity.push(last * (1 + r));
  }
  return {
    dates,
    equity,
    weightsUsed: w,
    meta: { nAssets: Object.keys(w).length, start: req.start, end: req.end },
  };
}