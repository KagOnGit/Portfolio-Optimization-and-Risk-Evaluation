// app/api/macro/fred/route.ts
import { NextResponse } from 'next/server';
import { fetchFredSeries } from '@/lib/macro';

 type Body = { series?: string[]; start?: string; end?: string };

async function fetchFredCsv(seriesId: string, start?: string, end?: string) {
  try {
    const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
    const res = await fetch(url, { cache: 'no-store' });
    const csv = await res.text();
    const lines = csv.trim().split(/\r?\n/);
    const out: { date: string; value: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const [date, value] = lines[i].split(',');
      if (!date) continue;
      if (start && date < start) continue;
      if (end && date > end) continue;
      // keep raw string value to match client toNumbers()
      out.push({ date, value });
    }
    return out;
  } catch {
    return [] as { date: string; value: string }[];
  }
}

function parseQuery(url: string) {
  const u = new URL(url);
  const qp = u.searchParams;
  const one = qp.get('series');
  const series = one ? one.split(',').map(s => s.trim()).filter(Boolean) : ['CPIAUCSL','UNRATE','FEDFUNDS'];
  const start = qp.get('start') || undefined;
  const end = qp.get('end') || undefined;
  return { series, start, end };
}

async function getData(ids: string[], start?: string, end?: string) {
  const key = process.env.FRED_API_KEY || '';
  if (key) {
    const rs = await Promise.all(ids.map(id => fetchFredSeries(id, key, start, end)));
    return rs.map(r => ({ id: r.id, observations: r.observations.map(o => ({ date: o.date, value: String(o.value) })) }));
  }
  // CSV fallback -> map to observations with string values
  const rs = await Promise.all(ids.map(async id => ({ id, observations: await fetchFredCsv(id, start, end) })));
  return rs;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const ids = (Array.isArray(body.series) && body.series.length ? body.series : ['CPIAUCSL','UNRATE','FEDFUNDS']).slice(0, 10);
    const data = await getData(ids, body.start, body.end);
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ data: [], error: e?.message || 'fred error' }, { status: 200 });
  }
}

export async function GET(req: Request) {
  try {
    const { series, start, end } = parseQuery(req.url);
    const data = await getData(series, start, end);
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ data: [], error: e?.message || 'fred error' }, { status: 200 });
  }
}
