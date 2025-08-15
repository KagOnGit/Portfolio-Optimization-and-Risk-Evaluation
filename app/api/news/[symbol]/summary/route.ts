import { NextResponse } from 'next/server';
import { summarizeItems, NewsItem } from '@/lib/summarize';

// Calls your existing /api/news/[symbol] to get parsed Items,
// then returns a concise summary + bullets.
export async function GET(_req: Request, { params }: { params: { symbol: string } }) {
  const sym = (params.symbol || '').toUpperCase();
  if (!sym) return NextResponse.json({ summary: '', bullets: [] });

  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/news/${sym}`, { cache: 'no-store' });
    const j = await r.json();
    const items: NewsItem[] = Array.isArray(j?.items) ? j.items : [];
    const { summary, bullets } = summarizeItems(items, 4);
    return NextResponse.json({ summary, bullets, count: items.length, symbol: sym });
  } catch {
    return NextResponse.json({ summary: '', bullets: [] }, { status: 200 });
  }
}