import { NextResponse } from 'next/server';

type Item = {
  title: string;
  url: string;
  source: 'reddit';
  score: number;
  createdAt: string;
  permalink: string;
  subreddit: string;
};

function pickRedditItems(json: any, symbol: string): Item[] {
  const out: Item[] = [];
  const children = json?.data?.children || [];
  const word = symbol.toUpperCase();
  const re = new RegExp(`\\b${word}\\b`, 'i');

  for (const c of children) {
    const d = c?.data || {};
    const title: string = String(d.title || '');
    if (!re.test(title)) continue; // keep posts that actually mention the ticker
    out.push({
      title,
      url: d.url_overridden_by_dest || `https://www.reddit.com${d.permalink}`,
      source: 'reddit',
      score: Number(d.score || 0),
      createdAt: new Date((Number(d.created_utc) || 0) * 1000).toISOString(),
      permalink: `https://www.reddit.com${d.permalink}`,
      subreddit: String(d.subreddit || ''),
    });
  }
  return out;
}

export async function GET(
  _req: Request,
  { params }: { params: { symbol: string } }
) {
  const symbol = (params.symbol || '').toUpperCase();
  if (!symbol) {
    return NextResponse.json({ items: [] });
  }

  const subs = ['stocks', 'investing', 'wallstreetbets'];
  const headers = { 'User-Agent': 'PortfolioOptimizerBot/1.0 (contact: you@example.com)' };

  try {
    const results: Item[] = [];
    // query each sub with “new” posts in the past week
    await Promise.all(
      subs.map(async (sub) => {
        const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(
          symbol
        )}&restrict_sr=1&sort=new&t=week&limit=25`;
        const res = await fetch(url, { headers, cache: 'no-store' });
        if (!res.ok) return;
        const j = await res.json();
        results.push(...pickRedditItems(j, symbol));
      })
    );

    // sort by score/time and de-dup by title
    const seen = new Set<string>();
    const unique = results
      .sort((a, b) => b.score - a.score || (a.createdAt < b.createdAt ? 1 : -1))
      .filter((r) => (seen.has(r.title) ? false : (seen.add(r.title), true)))
      .slice(0, 20);

    return NextResponse.json({ items: unique });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}