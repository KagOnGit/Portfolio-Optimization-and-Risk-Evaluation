'use client';

import { useEffect, useMemo, useState } from 'react';
import { cachedJson } from '@/lib/cachedFetch';

type Quote = { last: number | null; changePct: number | null };
type Quotes = Record<string, Quote>;

const DEFAULTS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TLT', 'GLD', 'NVDA', 'GOOG'];

function Row({
  symbols,
  quotes,
  onSelect,
}: {
  symbols: string[];
  quotes: Quotes;
  onSelect?: (s: string) => void;
}) {
  return (
    <>
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
            key={`${s}-${pct ?? 'na'}`}
            className="flex items-baseline gap-2 px-4 py-2 text-sm text-neutral-200 hover:text-white whitespace-nowrap"
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
    </>
  );
}

export default function TopTickerRibbon({
  onSelect,
  tickers = DEFAULTS,
  pollMs = 30_000,
  speedSec = 40, // lower = faster
}: {
  onSelect?: (symbol: string) => void;
  tickers?: string[];
  pollMs?: number;
  speedSec?: number;
}) {
  const [quotes, setQuotes] = useState<Quotes>({});
  const symbols = useMemo(
    () => Array.from(new Set(tickers.map((s) => s.toUpperCase()))),
    [tickers.join(',')]
  );

  async function load() {
    try {
      const j = await cachedJson<{ quotes: Quotes }>('/api/prices/quote', {
        method: 'POST',
        body: { tickers: symbols },
        ttl: 25_000,
      });
      setQuotes(j?.quotes || {});
    } catch {
      /* keep last values */
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
      <div className="mx-auto max-w-screen-2xl overflow-hidden">
        <div
          className="flex animate-ticker will-change-transform hover:[animation-play-state:paused]"
          style={{
            animationDuration: `${speedSec}s`,
          }}
        >
          <Row symbols={symbols} quotes={quotes} onSelect={onSelect} />
          {/* duplicate content to make the loop seamless */}
          <Row symbols={symbols} quotes={quotes} onSelect={onSelect} />
        </div>
      </div>

      {/* Local keyframes (styled-jsx global) */}
      <style jsx global>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker-scroll linear infinite;
        }
      `}</style>
    </div>
  );
}