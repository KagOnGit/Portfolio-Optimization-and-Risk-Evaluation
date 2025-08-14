'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Quote = { symbol: string; last: number | null; changePct: number | null };
const DEFAULT_TICKERS = ['SPY','QQQ','AAPL','MSFT','TLT','GLD','BTC-USD'];

function classByChange(changePct: number | null) {
  if (changePct == null || Number.isNaN(changePct)) return 'text-neutral-400';
  if (changePct > 0) return 'text-emerald-500';
  if (changePct < 0) return 'text-red-500';
  return 'text-neutral-400';
}

export default function TopTickerRibbon({
  symbols = DEFAULT_TICKERS,
  refreshMs = 30000
}: {
  symbols?: string[];
  refreshMs?: number;
}) {
  const [quotes, setQuotes] = useState<Quote[]>(symbols.map(s => ({ symbol: s, last: null, changePct: null })));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState(40); // seconds, default

  async function fetchQuotes() {
    try {
      const res = await fetch('/api/prices/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      });
      if (!res.ok) throw new Error(`Quote fetch failed: ${res.status}`);
      const data = await res.json();

      setQuotes(symbols.map(s => {
        const q = data[s.toUpperCase()] || {};
        const last = Number.isFinite(q.last) ? q.last : null;
        const changePct = Number.isFinite(q.changePct) ? q.changePct : null;

        if (last === null || changePct === null) {
          console.warn(`Missing quote data for ${s.toUpperCase()}`, q);
        }

        return { symbol: s.toUpperCase(), last, changePct };
      }));
    } catch (e) {
      console.warn('Ribbon fetch error', e);
    }
  }

  // Initial fetch + interval
  useEffect(() => {
    fetchQuotes();
    const id = setInterval(fetchQuotes, refreshMs);
    return () => clearInterval(id);
  }, [symbols.join(','), refreshMs]);

  // Triple list for seamless scrolling
  const loopData = useMemo(() => [...quotes, ...quotes, ...quotes], [quotes]);

  // Adaptive duration based on scroll width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollWidth = el.scrollWidth / 3; // width of one repetition
    const pxPerSec = 120; // pixels per second, adjust speed here
    if (scrollWidth) setDuration(Math.max(12, scrollWidth / pxPerSec));
  }, [quotes]);

  return (
    <div className="sticky top-0 z-40 w-full border-b bg-white/85 dark:bg-neutral-950/85 overflow-hidden h-10">
      <div
        ref={containerRef}
        className="flex gap-6 whitespace-nowrap"
        style={{ animation: `scrollTicker ${duration}s linear infinite` }}
        aria-busy={quotes.some(q => q.last === null)}
        aria-live="polite"
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
      `}</style>
    </div>
  );
}
