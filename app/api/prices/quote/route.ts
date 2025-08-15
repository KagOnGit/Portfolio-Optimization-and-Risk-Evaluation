// app/api/prices/quote/route.ts
import { NextResponse } from 'next/server';
import { fetchQuoteSnapshotServer, fetchHistory } from '@/lib/prices';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { symbols = ['SPY','QQQ','AAPL','MSFT','TLT','GLD','BTC-USD'] } = body || {};
    const upper = (symbols as string[]).map(s => s.toUpperCase()).slice(0, 24);

    // Primary snapshot (may not include changePct for some providers)
    const snap = await fetchQuoteSnapshotServer(upper);

    // If any symbol has null changePct, try to compute it from last two bars of history
    const needPct = upper.filter(s => !(snap as any)?.[s] || (snap as any)[s].changePct == null);
    if (needPct.length) {
      const hist = await fetchHistory(needPct);
      for (const h of hist) {
        const bars = (h?.bars || []).slice(-2);
        if (bars.length === 2) {
          const prev = bars[0].close;
          const last = bars[1].close;
          const pct = prev ? ((last - prev) / prev) * 100 : null;
          const existing = (snap as any)[h.symbol] || {};
          (snap as any)[h.symbol] = {
            last: Number.isFinite(last) ? last : (existing.last ?? null),
            changePct: Number.isFinite(pct!) ? pct : (existing.changePct ?? null)
          };
        }
      }
    }

    return NextResponse.json(snap);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'quote error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ info: 'POST { symbols: string[] } → { [symbol]: { last, changePct } }' });
}