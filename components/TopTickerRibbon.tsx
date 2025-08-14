'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Quote = {
  symbol: string;
  last: number | null;
  changePct: number | null;
};

const DEFAULT_TICKERS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TLT', 'GLD', 'BTC-USD'];

function classByChange(changePct: number | null) {
  if (changePct == null) return 'text-neutral-400';
  if (changePct > 0) return 'text-emerald-500';
  if (changePct < 0) return 'text-red-500';
  return 'text-neutral-400';
}

export default function TopTickerRibbon({ symbols = DEFAULT_TICKERS, refreshMs = 30_000, speedSec = 40 }: { symbols?: string[]; refreshMs?: number; speedSec?: number }) {
  const [quotes, setQuotes] = useState<Quote[]>(
    symbols.map(s => ({ symbol: s.toUpperCase(), last: null, changePct: null }))
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function fetchQuotes() {
    try {
      const res = await fetch('/api/prices/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      });
      if (!res.ok) throw new Error(`Quote fetch failed: ${res.status}`);
      const data = await res.json();
      setQuotes(symbols.map(s => {
        const d = data[s.toUpperCase()] || {};
        return { symbol: s.toUpperCase(), last: d.last ?? null, changePct: d.changePct ?? null };
      }));
    } catch (e) {
      console.warn('Ribbon fetch error', e);
    }
  }

  useEffect(() => {
    fetchQuotes();
    const id = setInterval(fetchQuotes, refreshMs);
    return () => clearInterval(id);
  }, [symbols.join(','), refreshMs]);

  // Duplicate quotes 3x for seamless infinite scroll
  const loopData = useMemo(() => [...quotes, ...quotes, ...quotes], [quotes]);

  return (
    <div className="sticky top-0 z-40 w-full border-b bg-white/85 dark:bg-neutral-950/85 overflow-hidden h-10">
      <div
        ref={containerRef}
        className="flex gap-6 whitespace-nowrap animate-ticker"
        style={{ animation: `scrollTicker ${speedSec}s linear infinite` }}
      >
        {loopData.map((q, idx) => {
          const cls = classByChange(q.changePct);
          const pct = q.changePct == null ? '—' : `${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%`;
          const price = q.last == null ? '—' : (q.symbol === 'BTC-USD' ? `$${q.last.toLocaleString()}` : q.last.toLocaleString());
          return (
            <div key={`${q.symbol}-${idx}`} className="flex items-center gap-1 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-200">{q.symbol}</span>
              <span className="text-neutral-500">•</span>
              <span className="tabular-nums text-neutral-800 dark:text-neutral-100">{price}</span>
              <span className={`tabular-nums ${cls}`}>{pct}</span>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes scrollTicker {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-ticker {
          display: inline-flex;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}