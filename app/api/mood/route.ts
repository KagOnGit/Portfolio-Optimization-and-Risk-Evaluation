import { NextResponse } from 'next/server';
import { fetchHistory, Series } from '@/lib/prices';

const DEFAULT = ['SPY','QQQ','AAPL','MSFT','NVDA','TLT','GLD','GOOG'];

function pct(a:number, b:number){ return b && a ? (b/a - 1) : 0; }
function stdev(xs:number[]){
  const m = xs.reduce((s,x)=>s+x,0)/xs.length || 0;
  const v = xs.reduce((s,x)=>s+(x-m)**2,0)/(xs.length||1);
  return Math.sqrt(v);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbols = (url.searchParams.get('symbols') || DEFAULT.join(','))
    .split(',').map(s=>s.trim().toUpperCase()).slice(0, 24);

  try {
    // pull last ~90 days to be safe
    const today = new Date();
    const start = new Date(today); start.setDate(start.getDate() - 120);
    const series: Series[] = await fetchHistory(symbols, start.toISOString().slice(0,10));

    const spy = series.find(s => s.symbol === 'SPY')?.bars ?? [];
    const closes = spy.map(b=>b.close);
    const n = closes.length;

    // Return (10d)
    const r10 = n > 10 ? pct(closes[n-11], closes[n-1]) : 0; // e.g. +0.02 = +2%
    // Vol (20d realized) – lower vol -> higher mood
    const rets = n > 21 ? closes.slice(-21).map((c,i,arr)=> i? (c/arr[i-1]-1):0).slice(1) : [];
    const vol20 = rets.length ? stdev(rets) * Math.sqrt(252) : 0.2; // annualized approx
    // Breadth over set: % with positive 5d return
    let breadth = 0;
    let denom = 0;
    for (const s of series) {
      const bars = s.bars;
      if (bars.length > 6) {
        const m = bars.length;
        const r5 = pct(bars[m-6].close, bars[m-1].close);
        denom++;
        if (r5 > 0) breadth++;
      }
    }
    const br = denom ? breadth / denom : 0.5;

    // Map to 0–100
    // Return: −5%..+5% => 0..100
    const scoreR = Math.max(0, Math.min(100, (r10 + 0.05) / 0.10 * 100));
    // Vol: 15%..35% => 100..0
    const scoreV = Math.max(0, Math.min(100, (0.35 - vol20) / 0.20 * 100));
    // Breadth: 0..1 => 0..100
    const scoreB = Math.max(0, Math.min(100, br * 100));

    const score = Math.round(0.45*scoreR + 0.35*scoreV + 0.20*scoreB);

    return NextResponse.json({
      score,
      parts: { scoreR: Math.round(scoreR), scoreV: Math.round(scoreV), scoreB: Math.round(scoreB) },
      used: symbols,
      updatedAt: new Date().toISOString()
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e:any) {
    return NextResponse.json({ score: 50, error: e?.message || 'mood-failed' }, { status: 200 });
  }
}