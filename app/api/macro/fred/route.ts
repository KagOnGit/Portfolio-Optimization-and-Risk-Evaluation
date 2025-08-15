// app/api/macro/fred/route.ts
import { NextResponse } from 'next/server';

type Body = { series?: string[]; start?: string; end?: string };

function synth(seriesId: string, n = 60) {
  const out: { date: string; value: string }[] = [];
  const today = new Date();
  let base = seriesId === 'UNRATE' ? 4.0 : seriesId === 'FEDFUNDS' ? 3.5 : 260.0; // rough anchors
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setMonth(today.getMonth() - i);
    // tiny drift
    base += (Math.sin(i / 6) * 0.15);
    out.push({ date: d.toISOString().slice(0, 10), value: base.toFixed(2) });
  }
  return { id: seriesId, observations: out };
}

export async function POST(req: Request) {
  let body: Body = {};
  try { body = await req.json(); } catch {}

  const ids = (body.series?.length ? body.series : ['CPIAUCSL', 'UNRATE', 'FEDFUNDS']).slice(0, 10);
  const data = ids.map(id => synth(id, 120));
  return NextResponse.json({ data });
}

export async function GET() {
  return NextResponse.json({
    info: 'POST { series: string[], start?: string, end?: string }',
    example: { series: ['CPIAUCSL','UNRATE','FEDFUNDS'] }
  });
}