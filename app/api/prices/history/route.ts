// app/api/prices/history/route.ts
import { NextResponse } from 'next/server';

type Body = {
  tickers?: string[];
  start?: string;
  end?: string;
};

function genSeries(symbol: string, n = 252) {
  // deterministic pseudo-random walk based on symbol hash
  let seed = Array.from(symbol).reduce((a, c) => a + c.charCodeAt(0), 0);
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return (seed / 2 ** 32) - 0.5;
  }
  const bars: { date: string; close: number }[] = [];
  let price = 100;
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // ~1% daily vol synthetic series
    const ret = rnd() * 0.02;
    price = Math.max(1, price * (1 + ret));
    bars.push({ date: d.toISOString().slice(0, 10), close: +price.toFixed(2) });
  }
  return { symbol, bars };
}

export async function POST(req: Request) {
  let body: Body = {};
  try { body = await req.json(); } catch {}
  const tickers = (body.tickers?.length ? body.tickers : ['SPY', 'QQQ', 'TLT'])
    .map(s => s.toUpperCase())
    .slice(0, 12);

  const series = tickers.map(t => genSeries(t, 300));
  return NextResponse.json({ series });
}

export async function GET() {
  // convenience
  return NextResponse.json({ info: 'POST { tickers: string[], start?: string, end?: string }' });
}