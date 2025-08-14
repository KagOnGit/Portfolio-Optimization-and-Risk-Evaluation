import { NextResponse } from 'next/server';

type Body = {
  tickers?: string[];
  method?: 'equal_weight' | 'min_var' | 'max_sharpe' | 'black_litterman';
};

// MOCK v1: equal-weight + mild tilt for non-equal methods
export async function POST(req: Request) {
  let body: Body = {};
  try { body = await req.json(); } catch {}
  const { tickers = ['SPY','QQQ','TLT'], method = 'equal_weight' } = body;
  const unique = Array.from(new Set(tickers.map(t => t.toUpperCase()))).slice(0, 12);
  const n = Math.max(1, unique.length);

  if (n === 0) {
    return NextResponse.json({ error: 'No tickers provided' }, { status: 400 });
  }

  let weights: Record<string, number> = {};
  if (method === 'equal_weight') {
    const w = 1 / n;
    unique.forEach(t => { weights[t] = +w.toFixed(4); });
  } else {
    const base = 1 / n;
    const tilt = Math.min(0.05, 0.5 / n);
    unique.forEach((t, i) => {
      weights[t] = +(base + (i === 0 ? tilt : -tilt/(n-1))).toFixed(4);
    });
  }

  return NextResponse.json({ weights, diagnostics: { turnover: 0.0 } });
}
