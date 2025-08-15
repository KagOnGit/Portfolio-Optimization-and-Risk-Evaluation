// components/NewsPanel.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type NewsItem = {
  title: string;
  url: string;
  source: string;
  createdAt?: string;
  excerpt?: string;
};

type NewsResponse = {
  symbol: string;
  updatedAt: string;
  summary: string;
  bullets: string[];
  items: NewsItem[];
  error?: string;
};

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white dark:bg-neutral-900 p-4">
      <div className="mb-2 font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-500">
      <div className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
      Loading…
    </div>
  );
}

export default function NewsPanel({
  symbols = ['SPY', 'QQQ', 'TLT'],
  limitPerSymbol = 12,
}: {
  symbols?: string[];
  limitPerSymbol?: number;
}) {
  const uniq = useMemo(
    () => Array.from(new Set(symbols.map((s) => s.toUpperCase()))),
    [symbols]
  );

  const [data, setData] = useState<Record<string, NewsResponse | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      uniq.map(async (sym) => {
        try {
          const res = await fetch(`/api/news/${encodeURIComponent(sym)}`, {
            cache: 'no-store',
          });
          const j = (await res.json()) as NewsResponse;
          return [sym, j] as const;
        } catch {
          return [sym, null] as const;
        }
      })
    )
      .then((pairs) => {
        if (cancelled) return;
        const map: Record<string, NewsResponse | null> = {};
        for (const [sym, j] of pairs) map[sym] = j;
        setData(map);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uniq.join(',')]);

  // Build a cross-symbol meta-summary if available
  const combinedSummary = useMemo(() => {
    const summaries = uniq
      .map((s) => data[s]?.summary?.trim())
      .filter(Boolean) as string[];
    const bullets = uniq.flatMap((s) => data[s]?.bullets ?? []);
    return {
      summary: summaries.join(' '),
      bullets: bullets.slice(0, 8),
      updated:
        uniq
          .map((s) => data[s]?.updatedAt)
          .filter(Boolean)
          .sort()
          .slice(-1)[0] ?? '',
    };
  }, [data, uniq]);

  return (
    <div className="space-y-4">
      <Card title="Market News (summarized)">
        {loading ? (
          <Spinner />
        ) : combinedSummary.summary ? (
          <div className="space-y-2">
            <p className="text-sm leading-6">{combinedSummary.summary}</p>
            {combinedSummary.bullets.length > 0 && (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {combinedSummary.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
            {combinedSummary.updated && (
              <div className="text-xs text-neutral-500">
                Updated {new Date(combinedSummary.updated).toLocaleString()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-neutral-500">
            No summary available right now.
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {uniq.map((sym) => {
          const r = data[sym];
          return (
            <Card key={sym} title={`${sym} News`}>
              {!r ? (
                <div className="text-sm text-neutral-500">Failed to load.</div>
              ) : r.items.length === 0 ? (
                <div className="text-sm text-neutral-500">
                  No recent items.
                </div>
              ) : (
                <ul className="space-y-2">
                  {r.items.slice(0, limitPerSymbol).map((it, i) => (
                    <li key={i} className="text-sm">
                      <a
                        className="underline underline-offset-2 decoration-neutral-400 hover:decoration-neutral-200"
                        href={it.url}
                        target="_blank"
                        rel="noreferrer"
                        title={it.excerpt || it.title}
                      >
                        {it.title}
                      </a>
                      <div className="text-[11px] text-neutral-500">
                        {it.source}
                        {it.createdAt ? (
                          <> · {new Date(it.createdAt).toLocaleString()}</>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}