import { mean, stdev, sharpe, sortino, histVaR, histCVaR } from '@/lib/math';

describe('math helpers', () => {
  it('mean & stdev basic', () => {
    const xs = [1, 2, 3, 4, 5];
    expect(mean(xs)).toBe(3);
    const sd = stdev(xs);
    expect(sd).toBeGreaterThan(0);
    expect(sd).toBeCloseTo(Math.sqrt(2), 5); // population stdev
  });

  it('sharpe and sortino are finite for simple series', () => {
    const r = [0.01, -0.005, 0.02, 0.0, -0.01];
    expect(Number.isFinite(sharpe(r))).toBe(true);
    expect(Number.isFinite(sortino(r))).toBe(true);
  });

  it('hist VaR/CVaR 95%', () => {
    const r = [-0.03, -0.01, 0.0, 0.01, 0.02, -0.02];
    expect(histVaR(r, 0.95)).toBeGreaterThanOrEqual(0);
    expect(histCVaR(r, 0.95)).toBeGreaterThanOrEqual(0);
  });
});