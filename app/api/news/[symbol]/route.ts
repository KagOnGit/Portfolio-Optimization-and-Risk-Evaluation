export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// app/api/news/[symbol]/route.ts
import { NextResponse } from 'next/server';
import { DEFAULT_FEEDS, SYMBOL_FEEDS, ALLOWED_HOSTS } from '@/lib/newsSources';
import { parseRSS, fetchReadable } from '@/lib/newsExtract';
import { summarizeItems } from '@/lib/summarize';
import { cachedJson } from '@/lib/cachedFetch';

function parseSymbolFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const idx = parts.indexOf('news');
    const sym = parts[idx + 1] || '';
    return (sym || 'SPY').toUpperCase();
  } catch {
    return 'SPY';
  }
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function dedupe(items: { title: string; url: string; source: string; createdAt?: string; summary?: string }[]) {
  const seen = new Set<string>();
  const out: typeof items = [];
  for (const it of items) {
    const key = `${it.title}\u0001${it.url}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

export async function GET(req: Request) {
  try {
    const symbol = parseSymbolFromUrl(req.url);
    const feeds = [...(SYMBOL_FEEDS[symbol] || []), ...DEFAULT_FEEDS];

    // fetch RSS XML in parallel with short TTL cache
    const results = await Promise.all(
      feeds.map(async (f) => {
        try {
          const xml = await cachedJson<string>(f.url, {
            method: 'GET',
            ttl: 60_000,
            headers: { 'User-Agent': 'Mozilla/5.0 (PortfolioApp; like Gecko)' },
          });
          const items = await parseRSS(xml as unknown as string, f.name);
          return items;
        } catch {
          return [];
        }
      })
    );

    // flatten, filter by host, map, sort by recency
    const merged = results.flat().filter(x => x.url && ALLOWED_HOSTS.has(hostname(x.url)));

    const cleaned = dedupe(merged)
      .sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()))
      .slice(0, 40);

    // fetch readable text for top subset
    const top = cleaned.slice(0, 18);
    const readable = await Promise.all(
      top.map(async (it) => ({ ...it, full: await fetchReadable(it.url) }))
    );

    // build summarize inputs (fallback to parsed description if no readable text)
    const forSumm = readable.map(r => ({ title: r.title, summary: r.full || r.summary || '', url: r.url, source: r.source }));
    const { summary, bullets } = summarizeItems(forSumm, 5);

    // final items list with small excerpts
    const items = cleaned.map(it => ({
      title: it.title,
      url: it.url,
      source: it.source,
      createdAt: it.createdAt,
      excerpt: (it.summary || '').slice(0, 220)
    }));

    return NextResponse.json({
      symbol,
      updatedAt: new Date().toISOString(),
      summary,
      bullets,
      items,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ symbol: 'SPY', updatedAt: new Date().toISOString(), summary: '', bullets: [], items: [], error: e?.message || 'news error' }, { status: 200 });
  }
}
