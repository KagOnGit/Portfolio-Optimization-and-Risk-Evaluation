import { fetchHistory, closesToReturns } from '@/lib/prices';

export type Rebalance = 'NONE' | 'M' | 'Q';

export type BacktestInput = {
  tickers: string[];
  weights?: Record<string, number>; // optional, defaults to equal-weight
  start?: string;
  end?: string;
  rebalance?: Rebalance;
};

export type BacktestResult = {
  dates: string[];
  equity: number[];     // cumulative curve
  returns: number[];    // daily returns
  perTicker?: Record<string, { dates: string[]; closes: number[]; returns: number[] }>;
};

function filterRange<T extends { date: string }>(bars: T[], start?: string, end?: string) {
  if (!start && !end) return bars;
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  return bars.filter(b => {
    const d = new Date(b.date);
    if (s && d < s) return false;
    if (e && d > e) return false;
    return true;
  });
}

function normalizeWeights(tickers: string[], w?: Record<string, number>): number[] {
  if (!w) return Array(tickers.length).fill(1 / tickers.length);
  const arr = tickers.map(t => Math.max(0, w[t] ?? 0));
  const sum = arr.reduce((a,b) => a + b, 0) || 1;
  return arr.map(x => x / sum);
}

function rebalanceMask(len: number, mode: 'NONE'|'M'|'Q', dates: string[]): boolean[] {
  const mask = Array(len).fill(false);
  if (mode === 'NONE') { mask[0] = true; return mask; }
  mask[0] = true;
  for (let i = 1; i < len; i++) {
    const d = new Date(dates[i]);
    const prev = new Date(dates[i-1]);
    const isMonthChange = d.getUTCMonth() !== prev.getUTCMonth() || d.getUTCFullYear() !== prev.getUTCFullYear();
    if (mode === 'M' && isMonthChange) mask[i] = true;
    if (mode === 'Q' && isMonthChange && [0,3,6,9].includes(d.getUTCMonth())) mask[i] = true;
  }
  return mask;
}

export async function runBacktest(inp: BacktestInput): Promise<BacktestResult> {
  const tickers = inp.tickers.map(s => s.toUpperCase());
  const series = await fetchHistory(tickers);

  // Align on shortest length after date filtering
  const filtered = series.map(s => {
    const bars = filterRange(s.bars, inp.start, inp.end);
    return { symbol: s.symbol.toUpperCase(), bars };
  }).filter(s => s.bars.length > 2);

  if (filtered.length === 0) {
    return { dates: [], equity: [], returns: [] };
  }

  const datesArr = filtered.map(s => s.bars.map(b => b.date));
  const minLen = Math.min(...datesArr.map(a => a.length));
  const aligned = filtered.map(s => ({
    symbol: s.symbol,
    bars: s.bars.slice(s.bars.length - minLen)
  }));

  const dates = aligned[0].bars.map(b => b.date);
  const closesMap: Record<string, number[]> = {};
  for (const s of aligned) closesMap[s.symbol] = s.bars.map(b => b.close);

  const returnsMap: Record<string, number[]> = {};
  for (const s of aligned) returnsMap[s.symbol] = closesToReturns(closesMap[s.symbol]);

  const weights = normalizeWeights(tickers, inp.weights);
  const rebmask = rebalanceMask(returnsMap[aligned[0].symbol].length, (inp.rebalance || 'NONE'), dates.slice(1));

  // Accumulate portfolio with periodic weight reset
  let currentW = weights.slice(0, aligned.length);
  const portR: number[] = [];
  for (let i = 0; i < rebmask.length; i++) {
    if (rebmask[i]) {
      // reset to target weights on rebalance day
      currentW = normalizeWeights(aligned.map(s => s.symbol), inp.weights);
    }
    const dayReturn = aligned.reduce((acc, s, idx) => acc + (currentW[idx] || 0) * returnsMap[s.symbol][i], 0);
    portR.push(dayReturn);
  }

  const equity: number[] = [];
  let eq = 1;
  for (const r of portR) { eq *= (1+r); equity.push(eq); }

  const perTicker: BacktestResult['perTicker'] = {};
  for (const s of aligned) {
    perTicker![s.symbol] = {
      dates: s.bars.map(b => b.date),
      closes: closesMap[s.symbol],
      returns: returnsMap[s.symbol]
    };
  }

  return { dates: dates.slice(1), equity, returns: portR, perTicker };
}