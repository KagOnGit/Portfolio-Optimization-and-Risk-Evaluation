// app/api/prices/quote/route.ts
import { NextResponse } from 'next/server';
import { fetchQuoteSnapshot } from '@/lib/prices';

export const runtime = 'nodejs';

function parseSymbolsFromUrl(url: string): string[] {
  try {
    const u = new URL(url);
    const raw = u.searchParams.get('symbols') || '';
    const list = raw.split(',').map(s => s.trim()).filter(Boolean);
    return Array.from(new Set(list.map(s => s.toUpperCase()))).slice(0, 24);
  } catch {
    return [];
  }
}

async function getSymbolsFromRequest(req: Request): Promise<string[]> {
  if (req.method === 'GET') {
    return parseSymbolsFromUrl(req.url);
  }
  // POST fallback
  try {
    const body = await req.json().catch(() => ({}));
    const arr: string[] = Array.isArray(body?.symbols) ? body.symbols : [];
    return Array.from(new Set(arr.map(s => s.toUpperCase()))).slice(0, 24);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const symbols = await getSymbolsFromRequest(req);
    if (symbols.length === 0) {
      return NextResponse.json({ error: 'no-symbols' }, { status: 400 });
    }
    const snap = await fetchQuoteSnapshot(symbols);
    return NextResponse.json(snap, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'quote-failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const symbols = await getSymbolsFromRequest(req);
    if (symbols.length === 0) {
      return NextResponse.json({ error: 'no-symbols' }, { status: 400 });
    }
    const snap = await fetchQuoteSnapshot(symbols);
    return NextResponse.json(snap, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'quote-failed' }, { status: 500 });
  }
}
