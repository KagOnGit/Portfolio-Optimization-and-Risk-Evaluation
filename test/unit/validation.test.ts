import { pricesHistoryQuerySchema } from '@/lib/validation';

describe('validation', () => {
  it('accepts a valid query', () => {
    const parsed = pricesHistoryQuerySchema.parse({ symbol: 'SPY', range: '1y' });
    expect(parsed.symbol).toBe('SPY');
  });

  it('rejects invalid range', () => {
    expect(() =>
      pricesHistoryQuerySchema.parse({ symbol: 'SPY', range: 'forever' })
    ).toThrow();
  });

  it('normalizes symbols and defaults', () => {
    const p = pricesHistoryQuerySchema.parse({ symbol: ' spy ' });
    expect(p.symbol).toBe('SPY');
    expect(p.range).toBe('6mo'); // default
  });
});