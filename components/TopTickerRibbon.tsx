'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchQuoteSnapshot, Quote } from '@/lib/prices';

type TickerItem = {
  symbol: string;
  price: number | null;
  changePct: number | null;
  error?: string;
};

const DEFAULT_TICKERS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TLT', 'GLD', 'BTC-USD'];

function classByChange(changePct: number | null) {
  if (changePct == null) return 'text-neutral-400';
  if (changePct > 0) return 'text-emerald-500';
  if (changePct < 0) return 'text-red-500';
  return 'text-neutral-400';
}

export default function TopTickerRibbon({
  symbols = DEFAULT_TICKERS,
  refreshMs = 60_000,
  speedSec = 30,
}: {
  symbols?: string[];
  refreshMs?: number;
  speedSec?: number; // scroll duration in seconds
}) {
  const [rows, setRows] = useState<TickerItem[]>(
    symbols.map((s) => ({ symbol: s.toUpperCase(), price: null, changePct: null }))
  );
  const [err, setErr] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load quotes
  async function load() {
    try {
      setErr('');
      const data = await fetchQuoteSnapshot(symbols);
      const mapped: TickerItem[] = symbols.map((s) => {
        const d: Quote | undefined = data[s.toUpperCase()];
        if (!d) return { symbol: s.toUpperCase(), price: null, changePct: null, error: 'no data' };
        return { symbol: s.toUpperCase(), price: d.last, changePct: d.changePct };
      });
      setRows(mapped);
    } catch (e: any) {
      setErr(e?.message || 'Ticker load error');
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [symbols.join(','), refreshMs]);

  // Duplicate rows for smooth loop
  const loopData = useMemo(() => [...rows, ...rows], [rows]);

  return (
    <div className="sticky top-0 z-40 w-full border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-neutral-950/85 dark:supports-[backdrop-filter]:bg-neutral-950/60 overflow-hidden h-10">
      <div
        ref={containerRef}
        className="flex gap-6 whitespace-nowrap animate-ticker"
        style={{
          animation: `ticker ${speedSec}s linear infinite`,
        }}
      >
        {loopData.map((item, idx) => {
          const cls = classByChange(item.changePct);
          const pct =
            item.changePct == null ? '—' : `${(item.changePct >= 0 ? '+' : '')}${item.changePct.toFixed(2)}%`;
          const price =
            item.price == null
              ? '—'
              : item.symbol === 'BTC-USD'
              ? `$${item.price.toLocaleString()}`
              : item.price.toLocaleString();
          return (
            <div key={`${item.symbol}-${idx}`} className="flex items-center gap-1 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-200">{item.symbol}</span>
              <span className="text-neutral-500">•</span>
              <span className="tabular-nums text-neutral-800 dark:text-neutral-100">{price}</span>
              <span className={`tabular-nums ${cls}`}>{pct}</span>
            </div>
          );
        })}
      </div>
      {err && <div className="px-3 pb-2 text-xs text-red-600 dark:text-red-400">{err}</div>}
      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          display: inline-flex;
        }
      `}</style>
    </div>
  );
}
