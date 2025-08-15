// components/TopTickerRibbon.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Quote = { last: number | null; changePct: number | null };
type Quotes = Record<string, Quote>;

export default function TopTickerRibbon({
  symbols = ['SPY','QQQ','AAPL','MSFT','TLT','GLD','BTC-USD'],
  refreshMs = 45_000,
  pxPerSec = 120,
  onSelect,
}: {
  symbols?: string[];
  refreshMs?: number;
  pxPerSec?: number;
  onSelect?: (symbol: string) => void;
}) {
  const [quotes, setQuotes] = useState<Quotes>({});
  const [duration, setDuration] = useState<number>(24);
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const r = await fetch('/api/prices/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      });
      if (!r.ok) return;
      const j = await r.json();
      setQuotes(j || {});
    } catch {}
  }

  useEffect(() => {
    load();
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [symbols.join(','), refreshMs]);

  // measure width to set animation duration (smooth on any screen)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const oneSetWidth = el.scrollWidth / 3; // we render 3x below
    if (!oneSetWidth) return;
    const d = Math.max(14, oneSetWidth / pxPerSec);
    setDuration(d);
  }, [quotes, pxPerSec]);

  const items = useMemo(() => {
    // normalize into an ordered list
    return symbols.map((s) => {
      const q = quotes[s.toUpperCase()];
      const last = Number.isFinite(q?.last as number) ? (q!.last as number) : null;
      const pct = Number.isFinite(q?.changePct as number) ? (q!.changePct as number) : null;
      return { symbol: s.toUpperCase(), last, pct };
    });
  }, [quotes, symbols]);

  const prettyPrice = (n: number | null) => {
    if (n == null) return '—';
    // dollar sign for everything to keep it consistent/elegant
    const abs = Math.abs(n) < 10 ? n.toFixed(2) : Math.abs(n) < 100 ? n.toFixed(2) : n.toFixed(2);
    return `$${abs}`;
  };

  const prettyPct = (p: number | null) => {
    if (p == null) return '—%';
    const sign = p > 0 ? '+' : p < 0 ? '' : '';
    return `${sign}${p.toFixed(2)}%`;
  };

  const pctClass = (p: number | null) =>
    p == null
      ? 'text-neutral-400'
      : p > 0
      ? 'text-emerald-400'
      : p < 0
      ? 'text-red-400'
      : 'text-neutral-300';

  // triple the list to create a seamless infinite scroll
  const tripled = [...items, ...items, ...items];

  return (
    <div className="sticky top-0 z-40 border-b bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="overflow-hidden ticker-mask">
        <div
          ref={containerRef}
          className="ticker-track whitespace-nowrap"
          style={{ ['--dur' as any]: `${duration}s` }}
        >
          {tripled.map((it, i) => (
            <div
              key={`${it.symbol}-${i}`}
              className="inline-flex items-center gap-2 px-5 py-2 cursor-pointer hover:bg-white/5"
              onClick={() => onSelect?.(it.symbol)}
            >
              <span className="font-medium text-neutral-200">{it.symbol}</span>
              <span className="text-neutral-400">•</span>
              <span className="tabular-nums text-neutral-200">{prettyPrice(it.last)}</span>
              <span className={`tabular-nums ${pctClass(it.pct)}`}>{prettyPct(it.pct)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}