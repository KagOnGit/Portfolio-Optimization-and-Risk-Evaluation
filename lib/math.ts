export function mean(xs: number[]) { return xs.reduce((a,b)=>a+b,0) / (xs.length || 1); }
export function stdev(xs: number[]) { const m = mean(xs); return Math.sqrt(mean(xs.map(x => (x - m) ** 2))); }
export function sharpe(returns: number[], rf = 0) { const ex = returns.map(r => r - rf); return mean(ex) / (stdev(ex) || 1e-9); }
export function sortino(returns: number[], rf = 0) { const ex = returns.map(r => r - rf); const neg = ex.filter(r => r < 0); const dd = Math.sqrt(mean(neg.map(r => r * r)) || 1e-12); return mean(ex) / dd; }
export function histVaR(returns: number[], alpha = 0.95) { const s = [...returns].sort((a,b)=>a-b); const idx = Math.max(0, Math.floor((1 - alpha) * s.length) - 1); return -s[Math.max(0, idx)]; }
export function histCVaR(returns: number[], alpha = 0.95) { const s = [...returns].sort((a,b)=>a-b); const cutoff = Math.max(1, Math.floor((1 - alpha) * s.length)); const tail = s.slice(0, cutoff); return -mean(tail); }
export function maxDrawdown(equity: number[]) {
  if (!equity || equity.length === 0) return 0;
  let peak = equity[0];
  let maxDD = 0;
  for (const value of equity) {
    if (value > peak) peak = value;
    if (peak > 0) {
      const dd = (peak - value) / peak;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD; // 0.15 = 15%
}
