// components/TopTickerRibbon.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type Quote = { last: number | null; changePct: number | null };
type Quotes = Record<string, Quote>;

type Props = {
  symbols?: string[];
  refreshMs?: number;
  pxPerSec?: number;
  onSelect?: (symbol: string) => void;
};

const DEFAULTS = ['SPY','QQQ','AAPL','MSFT','TLT','GLD','BTC-USD'];

function fmtPrice(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pctClass(p: number | null): string {
  if (p == null || !Number.isFinite(p) || p === 0) return 'text-neutral-300';
  return p > 0 ? 'text-emerald-400' : 'text-red-400';
}
function fmtPct(p: number | null): string {
  if (p == null || !Number.isFinite(p)) return '—%';
  const s = p.toFixed(2);
  return `${p > 0 ? '+' : ''}${s}%`;
}

export default function TopTickerRibbon({
  symbols = DEFAULTS,
  refreshMs = 30_000,
  pxPerSec = 120,
  onSelect,
}: Props) {
  const [quotes, setQuotes] = useState<Quotes>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState<number>(30);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch('/api/prices/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols }),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`quote ${res.status}`);
        const j = await res.json();
        if (!stop) setQuotes(j || {});
      } catch {}
    }
    load();
    const id = setInterval(load, refreshMs);
    return () => { stop = true; clearInterval(id); };
  }, [symbols.join(','), refreshMs]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLDivElement>('[data-track="one"]');
    if (!first) return;
    const w = first.scrollWidth;
    if (w > 0) setDuration(Math.max(14, w / pxPerSec));
  }, [quotes, pxPerSec]);

  const items = symbols.map((sym) => {
    const q = quotes[sym] || { last: null, changePct: null };
    return (
      <div
        key={sym}
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => onSelect?.(sym)}
        role="button"
      >
        <span className="text-neutral-100 font-medium">{sym}</span>
        <span className="text-neutral-500">•</span>
        <span className="tabular-nums text-neutral-100">{fmtPrice(q.last)}</span>
        <span className={`tabular-nums ${pctClass(q.changePct)}`}>{fmtPct(q.changePct)}</span>
      </div>
    );
  });

  return (
    <div className="w-full border-b border-white/10 bg-black/40 sticky top-0 z-50">
      <div ref={containerRef} className="overflow-hidden ticker-mask" style={{ ['--dur' as any]: `${duration}s` }}>
        <div className="ticker-track gap-8">
          <div data-track="one" className="inline-flex gap-8 px-6 py-2">{items}</div>
          <div aria-hidden className="inline-flex gap-8 px-6 py-2">{items}</div>
        </div>
      </div>
    </div>
  );
}