export type Feed = { name: string; url: string };

// Symbol-specific feeds (optional)
export const SYMBOL_FEEDS: Record<string, Feed[]> = {
  SPY: [
    { name: 'Yahoo Finance', url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=SPY&region=US&lang=en-US' },
    { name: 'Google News',   url: 'https://news.google.com/rss/search?q=SPY+stock+OR+ETF&hl=en-US&gl=US&ceid=US:en' },
  ],
  QQQ: [
    { name: 'Yahoo Finance', url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=QQQ&region=US&lang=en-US' },
    { name: 'Google News',   url: 'https://news.google.com/rss/search?q=QQQ+Nasdaq+100+ETF&hl=en-US&gl=US&ceid=US:en' },
  ],
  TLT: [
    { name: 'Yahoo Finance', url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=TLT&region=US&lang=en-US' },
    { name: 'Google News',   url: 'https://news.google.com/rss/search?q=TLT+Treasury+ETF&hl=en-US&gl=US&ceid=US:en' },
  ],
};

// Broad finance feeds used for any symbol
export const DEFAULT_FEEDS: Feed[] = [
  { name: 'Yahoo Finance Top', url: 'https://finance.yahoo.com/news/rssindex' },
  { name: 'Google News Markets', url: 'https://news.google.com/rss/search?q=stock+market+OR+equities+OR+ETF&hl=en-US&gl=US&ceid=US:en' },
];

// Reputable hosts we’ll keep
export const ALLOWED_HOSTS = new Set<string>([
  // majors
  'finance.yahoo.com', 'news.yahoo.com',
  'www.reuters.com', 'www.bloomberg.com', 'www.ft.com', 'www.wsj.com',
  'www.cnbc.com', 'www.marketwatch.com', 'www.investors.com',
  'www.seekingalpha.com', 'www.barrons.com',
  // misc sources that show up in Google News/Yahoo feeds
  'www.morningstar.com', 'www.fool.com', 'www.zacks.com',
  'www.theguardian.com', 'www.nytimes.com', 'www.economist.com',
  'www.kiplinger.com', 'www.forbes.com',
]);