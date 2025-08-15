import { NextResponse } from 'next/server';
import { fetchNews } from '@/lib/news';

export async function GET(_req: Request, ctx: { params: { symbol: string } }) {
  try {
    const sym = ctx.params.symbol?.toUpperCase();
    if (!sym) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
    const data = await fetchNews(sym, 8);
    return NextResponse.json({ items: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'news error' }, { status: 500 });
  }
}