// lib/newsExtract.ts
// RSS parser + full-article extractor with Mozilla Readability.

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export type ParsedItem = {
  title: string;
  url: string;
  source: string;
  createdAt?: string;
  summary?: string;   // extracted paragraph(s)
};

const UA =
  process.env.SEC_USER_AGENT ||
  'PortfolioEduBot/1.0 (contact: you@example.com)';

const FETCH_OPTS: RequestInit = {
  headers: { 'User-Agent': UA },
  cache: 'no-store',
};

export async function parseRSS(xml: string, source: string): Promise<ParsedItem[]> {
  // Very light XML parse via DOM; robust enough for common finance feeds
  const dom = new JSDOM(xml, { contentType: 'text/xml' });
  const doc = dom.window.document;
  const items = Array.from(doc.querySelectorAll('item, entry'));

  return items.map(el => {
    const get = (sel: string) => el.querySelector(sel)?.textContent?.trim() || '';
    const link = get('link') || el.querySelector('link')?.getAttribute('href') || '';
    const title = get('title');
    const pub = get('pubDate') || get('updated') || get('published') || undefined;

    return {
      title,
      url: link,
      source,
      createdAt: pub,
      summary: el.querySelector('description')?.textContent?.replace(/<[^>]+>/g, '').trim() || undefined,
    };
  }).filter(x => x.title && x.url);
}

export async function fetchReadable(url: string, timeoutMs = 5000): Promise<string> {
  // Fetch HTML and run Readability to get main content
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...FETCH_OPTS, signal: controller.signal });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return '';
    const html = await res.text();

    // Guard: skip massive pages
    if (html.length > 1_000_000) return '';

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article?.textContent) return '';

    // Normalize and trim
    const text = article.textContent.replace(/\s+/g, ' ').trim();
    return text.slice(0, 2000); // keep brief; we only need a compact basis for summary
  } catch {
    return '';
  } finally {
    clearTimeout(id);
  }
}