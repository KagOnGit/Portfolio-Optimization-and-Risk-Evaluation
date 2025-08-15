// app/api/macro/fred/route.ts
import { NextResponse } from 'next/server';

type Req = {
  series?: string[];
  start?: string;
  end?: string;
};

// Small helper to create a synthetic sparkline (works offline / no API)
function demoSeries(len = 120, base = 100, drift = 0.02, vol = 0.6): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < len; i++) {
    // random walk with slight drift
    v = v * (1 + drift / 100 + (Math.random() - 0.5) * vol / 100);
    out.push(+v.toFixed(3));
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Req;
    const series = (body.series && body.series.length ? body.series : ['CPIAUCSL', 'UNRATE', 'FEDFUNDS']).slice(0, 6);
    const start = body.start;
    const end = body.end;

    const FRED = process.env.FRED_API_KEY || '';
    // If no key, return deterministic demo data so tiles aren’t empty
    if (!FRED) {
      const data = series.map((id) => ({
        id,
        observations: demoSeries(120, id === 'UNRATE' ? 5 : id === 'FEDFUNDS' ? 2 : 100).map((v, i) => ({
          date: `D${i}`,
          value: String(v),
        })),
      }));
      return NextResponse.json({ data, demo: true });
    }

    // With a key: fetch each series from FRED
    const out: any[] = [];
    for (const id of series) {
      const url =
        `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(id)}` +
        (start ? `&observation_start=${start}` : '') +
        (end ? `&observation_end=${end}` : '') +
        `&api_key=${FRED}&file_type=json`;
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`FRED ${id} ${r.status}`);
      const j = await r.json();
      const observations: Array<{ date: string; value: string }> = Array.isArray(j?.observations) ? j.observations : [];
      out.push({ id, observations });
    }

    return NextResponse.json({ data: out, demo: false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fred error' }, { status: 500 });
  }
}