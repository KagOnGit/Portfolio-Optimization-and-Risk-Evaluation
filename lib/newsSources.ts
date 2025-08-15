// lib/newsSources.ts
// Whitelisted, reputable feeds. No paywalls; stable RSS.
// Extend per your needs, but keep to allowed hosts.

export type Feed = { name: string; url: string };
export type SymbolFeeds = Record<string, Feed[]>;

export const DEFAULT_FEEDS: Feed[] = [
  { name: 'Reuters Markets', url: 'https://www.reuters.com/markets/rss' },
  { name: 'CNBC Markets',   url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
];

export const SYMBOL_FEEDS: SymbolFeeds = {
  SPY: [
    { name: 'Yahoo Finance: SPY', url: 'https://finance.yahoo.com/rss/headline?s=SPY' },
    { name: 'Nasdaq: SPY',        url: 'https://www.nasdaq.com/feed/rssoutbound?symbol=SPY' },
  ],
  QQQ: [
    { name: 'Yahoo Finance: QQQ', url: 'https://finance.yahoo.com/rss/headline?s=QQQ' },
    { name: 'Nasdaq: QQQ',        url: 'https://www.nasdaq.com/feed/rssoutbound?symbol=QQQ' },
  ],
  TLT: [
    { name: 'Yahoo Finance: TLT', url: 'https://finance.yahoo.com/rss/headline?s=TLT' },
    { name: 'Nasdaq: TLT',        url: 'https://www.nasdaq.com/feed/rssoutbound?symbol=TLT' },
  ],
};

export const ALLOWED_HOSTS = new Set<string>([
  'www.reuters.com',
  'www.cnbc.com',
  'finance.yahoo.com',
  'www.nasdaq.com',
]);