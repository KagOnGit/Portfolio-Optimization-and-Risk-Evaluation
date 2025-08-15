import { NextResponse } from 'next/server';

type Funda = {
  marketCap?: number | null;
  pe?: number | null;
  forwardPE?: number | null;
  dividendYield?: number | null;
  beta?: number | null;
  '52wHigh'?: number | null;
  '52wLow'?: number | null;
  source: 'alphavantage' | 'yahoo';
};

// helpers
function toNum(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export async function GET(
  _req: Request,
  { params }: { params: { symbol: string } }
) {
  const s = (params.symbol || '').toUpperCase();
  if (!s) return NextResponse.json({});

  const AV = process.env.ALPHAVANTAGE_API_KEY || '';

  // 1) Alpha Vantage OVERVIEW (free key)
  if (AV) {
    try {
      const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(s)}&apikey=${AV}`;
      const r = await fetch(url, { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        // AV returns empty {} when throttled/unknown
        if (Object.keys(j || {}).length > 0) {
          const out: Funda = {
            marketCap: toNum(j.MarketCapitalization),
            pe: toNum(j.PERatio),
            forwardPE: toNum(j.ForwardPE),
            dividendYield: toNum(j.DividendYield),
            beta: toNum(j.Beta),
            '52wHigh': toNum(j['52WeekHigh']),
            '52wLow': toNum(j['52WeekLow']),
            source: 'alphavantage',
          };
          return NextResponse.json(out);
        }
      }
    } catch { /* fall through */ }
  }

  // 2) Yahoo Finance quoteSummary fallback (no key; works server-side)
  try {
    const mods = ['summaryDetail', 'defaultKeyStatistics', 'financialData'];
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(s)}?modules=${mods.join(',')}`;
    const r = await fetch(url, { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      const res = j?.quoteSummary?.result?.[0] || {};

      const sd = res.summaryDetail || {};
      const ks = res.defaultKeyStatistics || {};
      const fd = res.financialData || {};

      // many values are objects like {raw: 123, fmt:'123'}
      const raw = (v: any) => (v && typeof v === 'object' && 'raw' in v ? v.raw : v);

      const out: Funda = {
        marketCap: toNum(raw(ks.marketCap) ?? raw(sd.marketCap)),
        pe: toNum(raw(sd.trailingPE)),
        forwardPE: toNum(raw(sd.forwardPE)),
        dividendYield: toNum(raw(sd.dividendYield)),
        beta: toNum(raw(ks.beta)),
        '52wHigh': toNum(raw(sd.fiftyTwoWeekHigh)),
        '52wLow': toNum(raw(sd.fiftyTwoWeekLow)),
        source: 'yahoo',
      };
      return NextResponse.json(out);
    }
  } catch { /* ignore */ }

  return NextResponse.json({}, { status: 200 });
}