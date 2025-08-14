import { NextResponse } from 'next/server';
import { fetchQuoteSnapshot } from '@/lib/prices';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const symbols = (body.symbols as string[] | undefined) || ['SPY','QQQ','AAPL','MSFT','TLT','GLD','BTC-USD'];

    const data: Record<string, { last: number | null; changePct: number | null }> = {};
    await Promise.all(symbols.map(async (s) => {
      try {
        const snapshot = await fetchQuoteSnapshot([s]);
        const q = snapshot[s.toUpperCase()] || { last: null, changePct: null };
        data[s.toUpperCase()] = {
          last: q.last != null ? q.last : null,
          changePct: q.changePct != null ? q.changePct : null
        };
      } catch {
        data[s.toUpperCase()] = { last: null, changePct: null };
      }
    }));

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'quote fetch error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ info: 'POST { symbols: [...] } to fetch live quotes' });
}