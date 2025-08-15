// components/TopTickerRibbon.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Quote = { last: number | null; changePct: number | null };
type QuotesMap = Record<string, Quote>;

const DEFAULT_TICKERS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TLT', 'GLD', 'BTC-USD'];

function fmtPrice(n: number | null) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${n.toLocaleString()}`;
}

function changeClass(p: number | null) {
  if (p == null || !Number.isFinite(p)) return 'text-neutral-400';
  if (p > 0) return 'text-emerald-400';
  if (p < 0) return 'text-red-400';
  return 'text-neutral-400';
}

export default function TopTickerRibbon({
  symbols = DEFAULT_TICKERS,
  refreshMs = 60_000,
  pxPerSec = 120,
  onSelect,
}: {
  symbols?: string[];
  refreshMs?: number;
  pxPerSec?: number;
  onSelect?: (symbol: string) => void;
}) {
  const [quotes, setQuotes] = useState<QuotesMap>({});
  const [err, setErr] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState<number>(30);

  async function load() {
    try {
      setErr('');
      const r = await fetch('/api/prices/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      });
      if (!r.ok) throw new Error(`quote ${r.status}`);
      const j = await r.json();
      const cleaned: QuotesMap = {};
      for (const s of symbols) {
        const d = j?.[s.toUpperCase()];
        const last = Number.isFinite(d?.last) ? Number(d.last) : null;
        const changePct = Number.isFinite(d?.changePct) ? Number(d.changePct) : null;
        cleaned[s.toUpperCase()] = { last, changePct };
      }
      setQuotes(cleaned);
    } catch (e: any) {
      setErr(e?.message || 'ribbon error');
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [symbols.join(','), refreshMs]);

  // Build visible items + duplicate for seamless loop
  const items = useMemo(() => {
    return symbols.map((s) => {
      const q = quotes[s.toUpperCase()];
      return {
        symbol: s.toUpperCase(),
        price: fmtPrice(q?.last ?? null),
        changePct: q?.changePct ?? null,
      };
    });
  }, [symbols, quotes]);

  const loopData = useMemo(() => [...items, ...items], [items]);

  // Measure content width and set animation duration for smooth speed
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // width of one set = half of the duplicated track
    const oneSet = el.scrollWidth / 2;
    const d = oneSet ? Math.max(12, oneSet / pxPerSec) : 30;
    setDuration(d);
  }, [items, pxPerSec]);

  return (
    <div className="sticky top-0 z-50 w-full border-b border-neutral-800 bg-neutral-950/90 backdrop-blur ticker-mask">
      <div className="mx-auto max-w-screen-2xl">
        <div className="relative h-9 overflow-hidden">
          <div
            ref={containerRef}
            className="ticker-track"
            style={{ ['--dur' as any]: `${duration}s` }}
            aria-live="polite"
          >
            {loopData.map((it, idx) => (
              <button
                key={`${it.symbol}-${idx}`}
                onClick={onSelect ? () => onSelect(it.symbol) : undefined}
                className="flex items-center gap-2 pr-6 text-[13px] leading-none bg-transparent hover:bg-white/0"
                title={onSelect ? `Add/remove ${it.symbol}` : it.symbol}
              >
                <span className="font-medium text-neutral-200">{it.symbol}</span>
                <span className="text-neutral-500">•</span>
                <span className="tabular-nums text-neutral-100">{it.price}</span>
                <span className={`tabular-nums ${changeClass(it.changePct)}`}>
                  {it.changePct == null
                    ? '—'
                    : `${it.changePct >= 0 ? '+' : ''}${it.changePct.toFixed(2)}%`}
                </span>
              </button>
            ))}
          </div>
        </div>
        {err ? (
          <div className="px-3 pb-1 text-xs text-red-400">{err}</div>
        ) : null}
      </div>
    </div>
  );
}