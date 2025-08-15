import { fetchWithBackoff } from './backoff';
import { getCache, setCache } from './cache';

export type NewsItem = {
  symbol: string;
  title: string;
  site?: string;
  url?: string;
  publishedAt?: string; // ISO or date-like string
  sentiment?: 'pos' | 'neg' | 'neu';
};

const TWO_HOURS = 2 * 60 * 60 * 1000;

function simpleSentiment(title: string): 'pos' | 'neg' | 'neu' {
  const t = (title || '').toLowerCase();
  const pos = ['beats','surge','record','profit','growth','upgrade','raises','strong','outperform'];
  const neg = ['miss','falls','cuts','downgrade','loss','decline','lawsuit','weak','plunge'];
  if (pos.some(w => t.includes(w))) return 'pos';
  if (neg.some(w => t.includes(w))) return 'neg';
  return 'neu';
}

export async function fetchNews(symbol: string, limit = 10): Promise<NewsItem[]> {
  const sym = symbol.toUpperCase();
  const key = `news:${sym}:${limit}`;
  const cached = getCache<NewsItem[]>(key);
  if (cached) return cached;

  const fmpKey = process.env.FMP_API_KEY || '';
  const url = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${encodeURIComponent(sym)}&limit=${limit}${fmpKey ? `&apikey=${fmpKey}` : ''}`;

  try {
    const res = await fetchWithBackoff(url, { cache: 'no-store' }, 3, 700);
    const j = await res.json();
    const items: NewsItem[] = Array.isArray(j)
      ? j.map((n: any) => ({
          symbol: sym,
          title: n?.title || '',
          site: n?.site || n?.source,
          url: n?.url,
          publishedAt: n?.publishedDate || n?.date,
          sentiment: simpleSentiment(n?.title || ''),
        }))
      : [];
    setCache(key, items, TWO_HOURS);
    return items;
  } catch {
    const empty: NewsItem[] = [];
    setCache(key, empty, TWO_HOURS);
    return empty;
  }
}