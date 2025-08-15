import { NextResponse } from 'next/server';
import { evaluateRules, Rule } from '@/lib/alerts';
import { fetchQuoteSnapshotServer } from '@/lib/prices';

type Body = {
  tickers?: string[];
  rules?: Rule[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const tickers = (body.tickers && body.tickers.length ? body.tickers : ['SPY', 'QQQ', 'TLT'])
      .map((s) => s.toUpperCase())
      .slice(0, 20);
    const rules = Array.isArray(body.rules) ? body.rules : [];

    if (tickers.length === 0) {
      return NextResponse.json({ error: 'No tickers provided' }, { status: 400 });
    }

    // Fetch quotes via server helper
    const snapshot = await fetchQuoteSnapshotServer(tickers);

    // Normalize to the evaluator's expected shape
    const quotes: Record<string, { last: number | null; changePct: number | null }> = {};
    for (const sym of tickers) {
      const q = (snapshot as any)[sym] || {};
      const last = Number(q.last);
      const cp = Number(q.changePct);
      quotes[sym] = {
        last: Number.isFinite(last) ? last : null,
        changePct: Number.isFinite(cp) ? cp : null,
      };
    }

    const evals = evaluateRules(quotes, rules);
    const matched = evals.filter((e) => e.matched);

    return NextResponse.json({ quotes, evals, matched });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'alerts error' }, { status: 500 });
  }
}