'use client';

import { useEffect, useMemo, useState } from 'react';
import { cachedJson } from '@/lib/cachedFetch';

type Quote = { last: number | null; changePct: number | null };
type Quotes = Record<string, Quote>;

const DEFAULTS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TLT', 'GLD', 'NVDA', 'GOOG'];

export default function TopTickerRibbon({
  onSelect,
  tickers = DEFAULTS,
  pollMs = 30_000,
}: {
  onSelect?: (symbol: string) => void;
  tickers?: string[];
  pollMs?: number;
}) {
  const [quotes, setQuotes] = useState<Quotes>({});
  const symbols = useMemo(
    () => Array.from(new Set(tickers.map((s) => s.toUpperCase()))),
    [tickers.join(',')],
  );

  async function load() {
    try {
      const j = await cachedJson<{ quotes: Quotes }>('/api/prices/quote', {
        method: 'POST',
        body: { tickers: symbols },
        ttl: 25_000, // light cache between polls
      });
      setQuotes(j?.quotes || {});
    } catch {
      // ignore; keep old values
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      const id = setInterval(() => alive && load(), pollMs);
      return () => clearInterval(id);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(','), pollMs]);

  return (
    <div className="sticky top-0 z-20 w-full border-b bg-neutral-950/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto max-w-screen-2xl px-4 overflow-x-auto">
        <div className="flex gap-6 py-2 min-w-max">
          {symbols.map((s) => {
            const q = quotes[s];
            const pct = typeof q?.changePct === 'number' ? q.changePct : null;
            const last = typeof q?.last === 'number' ? q.last : null;
            const color =
              pct == null ? 'text-neutral-400'
              : pct > 0     ? 'text-emerald-400'
                            : 'text-rose-400';
            return (
              <button
                key={s}
                className="flex items-baseline gap-2 text-sm text-neutral-200 hover:text-white"
                onClick={() => onSelect?.(s)}
                title={last != null ? `${s} • ${last.toFixed(2)}` : s}
              >
                <span className="font-medium">{s}</span>
                <span className={`text-xs ${color}`}>
                  {pct == null ? '— %' : `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}