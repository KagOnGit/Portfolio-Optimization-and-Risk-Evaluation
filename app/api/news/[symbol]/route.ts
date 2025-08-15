// app/api/news/[symbol]/route.ts
import { NextResponse } from 'next/server';
import { DEFAULT_FEEDS, SYMBOL_FEEDS, ALLOWED_HOSTS } from '@/lib/newsSources';
import { parseRSS, fetchReadable, ParsedItem } from '@/lib/newsExtract';
import { summarizeItems } from '@/lib/summarize';

const UA =
  process.env.SEC_USER_AGENT ||
  'PortfolioEduBot/1.0 (contact: you@example.com)';

function hostOf(u: string) {
  try {
    return new URL(u).host;
  } catch {
    return '';
  }
}

/** Fetch an RSS/Atom feed as TEXT (no JSON parsing) */
async function fetchRSS(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    // Feeds change often; avoid stale caches
    cache: 'no-store',
  });
  if (!res.ok) return '';
  return await res.text();
}

export async function GET(
  _req: Request,
  { params }: { params: { symbol: string } }
) {
  const sym = (params.symbol || '').toUpperCase();
  const feeds = [...(SYMBOL_FEEDS[sym] || []), ...DEFAULT_FEEDS];

  try {
    // 1) Pull RSS feeds in parallel (as TEXT)
    const rssTexts = await Promise.all(
      feeds.map((f) => fetchRSS(f.url).catch(() => ''))
    );

    // 2) Parse items and keep reputable hosts
    const parsedArrays = await Promise.all(
      rssTexts.map((xml, i) =>
        xml ? parseRSS(xml, feeds[i].name) : Promise.resolve<ParsedItem[]>([])
      )
    );

    const items: ParsedItem[] = parsedArrays
      .flat()
      .filter((i) => ALLOWED_HOSTS.has(hostOf(i.url)))
      .slice(0, 40); // cap

    // 3) De-dup by URL/title (case-insensitive)
    const seen = new Set<string>();
    const dedup = items.filter((i) => {
      const k = (i.title + '|' + i.url).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // 4) Fetch full readable text for the top N recent (fallback to RSS summary)
    const enriched: ParsedItem[] = await Promise.all(
      dedup.slice(0, 18).map(async (it) => {
        const body = await fetchReadable(it.url).catch(() => '');
        return { ...it, summary: body || it.summary };
      })
    );

    // 5) Build a robust summary + bullets for display
    const { summary, bullets } = summarizeItems(
      enriched.map((e) => ({
        title: e.title,
        summary: e.summary || '',
        url: e.url,
        source: e.source,
      })),
      5
    );

    // 6) Return both the list (for detail cards) and the synthesized summary
    return NextResponse.json(
      {
        symbol: sym,
        updatedAt: new Date().toISOString(),
        summary,
        bullets,
        items: enriched.map((e) => ({
          title: e.title,
          url: e.url,
          source: e.source,
          createdAt: e.createdAt,
          // short excerpt for the card
          excerpt: (e.summary || '').slice(0, 320),
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        symbol: sym,
        summary: '',
        bullets: [],
        items: [],
        error: e?.message || 'news-failed',
      },
      { status: 200 }
    );
  }
}