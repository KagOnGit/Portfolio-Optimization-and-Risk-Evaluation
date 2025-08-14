export function toReturns(prices: number[]) {
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) r.push(prices[i] / prices[i - 1] - 1);
  return r;
}
export function mean(xs: number[]) { return xs.reduce((a,b)=>a+b,0) / (xs.length || 1); }
export function stdev(xs: number[]) {
  const m = mean(xs);
  const v = mean(xs.map(x => (x - m) ** 2));
  return Math.sqrt(v);
}
export function sharpe(returns: number[], rf = 0) {
  const ex = returns.map(r => r - rf);
  const denom = stdev(ex) || 1e-9;
  return mean(ex) / denom;
}
export function sortino(returns: number[], rf = 0) {
  const ex = returns.map(r => r - rf);
  const neg = ex.filter(r => r < 0);
  const dd = Math.sqrt(mean(neg.map(r => r * r)) || 1e-12);
  return mean(ex) / dd;
}
export function histVaR(returns: number[], alpha = 0.95) {
  const s = [...returns].sort((a,b)=>a-b);
  const idx = Math.max(0, Math.floor((1 - alpha) * s.length) - 1);
  return -s[Math.max(0, idx)];
}
export function histCVaR(returns: number[], alpha = 0.95) {
  const s = [...returns].sort((a,b)=>a-b);
  const cutoff = Math.max(1, Math.floor((1 - alpha) * s.length));
  const tail = s.slice(0, cutoff);
  return -mean(tail);
}
