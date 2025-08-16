// app/api/prices/history/route.ts
import { NextResponse } from 'next/server';
import { fetchHistory } from '@/lib/prices';

type Body = {
  tickers?: string[];
  start?: string;
  end?: string;
};

function parseQuery(url: string) {
  const u = new URL(url);
  const qp = u.searchParams;
  // support symbols=SPY,QQQ or symbols[]=SPY&symbols[]=QQQ
  const list: string[] = [];
  const multi = qp.getAll('symbols');
  if (multi && multi.length > 1) list.push(...multi);
  const one = qp.get('symbols');
  if (one) list.push(...one.split(',').map(s => s.trim()));
  const arr = Array.from(new Set(list.filter(Boolean).map(s => s.toUpperCase()))).slice(0, 20);
  const start = qp.get('start') || undefined;
  const end = qp.get('end') || undefined;
  return { symbols: arr, start, end };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const symbols = Array.isArray(body.tickers) && body.tickers.length
      ? Array.from(new Set(body.tickers.map(s => s.toUpperCase()))).slice(0, 20)
      : ['SPY', 'QQQ', 'TLT'];
    const start = body.start || undefined;
    const end = body.end || undefined;
    const series = await fetchHistory(symbols, start, end);
    return NextResponse.json({ series }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ series: [], error: e?.message || 'history error' }, { status: 200 });
  }
}

export async function GET(req: Request) {
  try {
    const { symbols, start, end } = parseQuery(req.url);
    const syms = symbols.length ? symbols : ['SPY', 'QQQ', 'TLT'];
    const series = await fetchHistory(syms, start, end);
    return NextResponse.json({ series }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ series: [], error: e?.message || 'history error' }, { status: 200 });
  }
}
