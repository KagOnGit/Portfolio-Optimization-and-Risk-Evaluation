// Portfolio optimization utilities

export interface PriceData {
  [symbol: string]: {
    [date: string]: number;
  };
}

export interface OptimizationResult {
  risk: number;
  ret: number;
  weights: Record<string, number>;
  sharpe: number;
}

export interface FrontierResult {
  frontier: OptimizationResult[];
  bestSharpe: OptimizationResult;
  symbols: string[];
}

// Helper functions
function pctReturns(series: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < series.length; i++) {
    r.push((series[i] - series[i-1]) / series[i-1]);
  }
  return r;
}

function mean(v: number[]): number {
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

function dot(a: number[], b: number[]): number {
  return a.reduce((s, ai, i) => s + ai * b[i], 0);
}

function matVec(M: number[][], v: number[]): number[] {
  return M.map(row => dot(row, v));
}

function covMatrix(cols: number[][]): number[][] {
  const n = cols.length;
  const m = cols[0]?.length || 0;
  const means = cols.map(c => mean(c));
  const C = Array.from({length: n}, () => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let c = 0;
      for (let t = 0; t < m; t++) {
        c += (cols[i][t] - means[i]) * (cols[j][t] - means[j]);
      }
      c = m > 1 ? c / (m - 1) : 0;
      C[i][j] = C[j][i] = c;
    }
  }
  return C;
}

export function optimizeRandomFrontier(
  prices: PriceData,
  symbols: string[],
  riskFree: number = 0,
  numPoints: number = 1000
): FrontierResult {
  // Extract aligned time series
  const dates = Object.keys(prices[symbols[0]] || {}).sort();
  const P = symbols.map(sym => dates.map(d => prices[sym]?.[d] || 0).filter(v => v > 0));
  const L = Math.min(...P.map(a => a.length));
  const R = P.map(p => pctReturns(p.slice(-L)));
  const T = Math.min(...R.map(r => r.length));
  const Rt = R.map(r => r.slice(-T));
  
  // Calculate mean returns and covariance matrix
  const mu = Rt.map(mean);
  const C = covMatrix(Rt);
  
  const frontier: OptimizationResult[] = [];
  let best: OptimizationResult = { risk: Infinity, ret: -Infinity, weights: {}, sharpe: -Infinity };
  
  // Generate random portfolios
  for (let k = 0; k < numPoints; k++) {
    // Random weights that sum to 1
    const w = Array.from({length: symbols.length}, () => Math.random());
    const sum = w.reduce((a, b) => a + b, 0) || 1;
    const weights = w.map(v => v / sum);
    
    // Calculate portfolio metrics
    const v = dot(weights, matVec(C, weights));
    const risk = Math.sqrt(Math.max(v, 0));
    const ret = dot(weights, mu);
    const sharpe = (ret - riskFree) / (risk || 1e-8);
    
    const result: OptimizationResult = {
      risk,
      ret,
      weights: Object.fromEntries(symbols.map((s, i) => [s, weights[i]])),
      sharpe
    };
    
    frontier.push(result);
    if (sharpe > best.sharpe) {
      best = result;
    }
  }
  
  // Sort by risk
  frontier.sort((a, b) => a.risk - b.risk);
  
  return { frontier, bestSharpe: best, symbols };
}
