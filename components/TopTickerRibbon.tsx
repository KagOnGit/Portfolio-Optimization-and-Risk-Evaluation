// components/TopTickerRibbon.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Snapshot = Record<string, { last: number | null; changePct: number | null }>;

export default function TopTickerRibbon({
  symbols = ['SPY','QQQ','AAPL','MSFT','TLT','GLD','BTC-USD'],
  refreshMs = 45000,
  pxPerSec = 120,
  onSelect,
}: {
  symbols?: string[];
  refreshMs?: number;
  pxPerSec?: number;
  onSelect?: (symbol: string) => void;
}) {
  const [snap, setSnap] = useState<Snapshot>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState<number>(30);

  // fetch quotes
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch('/api/prices/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols }),
        });
        if (!r.ok) return;
        const j = (await r.json()) as Snapshot;
        if (alive) setSnap(j);
      } catch {}
    }
    load();
    const t = setInterval(load, Math.max(8000, refreshMs));
    return () => { alive = false; clearInterval(t); };
  }, [symbols.join(','), refreshMs]);

  // update duration to content width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const oneSet = el.scrollWidth / 2; // track holds 2× content
    if (!oneSet) return;
    setDuration(Math.max(18, oneSet / pxPerSec));
  }, [snap, pxPerSec]);

  const items = useMemo(() => {
    return symbols.map((s) => {
      const q = snap[s.toUpperCase()];
      const last = Number.isFinite(q?.last as number) ? (q!.last as number) : null;
      const cp = Number.isFinite(q?.changePct as number) ? (q!.changePct as number) : null;
      return { s, last, cp };
    });
  }, [symbols.join(','), snap]);

  const fmtPrice = (v: number | null) =>
    v == null ? '—' : `$${Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v)}`;

  const fmtPct = (v: number | null) =>
    v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

  return (
    <div className="sticky top-0 z-40 bg-neutral-950 border-b border-neutral-800">
      <div className="overflow-hidden ticker-mask">
        <div
          ref={containerRef}
          className="ticker-track"
          style={{ ['--dur' as any]: `${duration}s` }}
        >
          {[...Array(2)].map((_, k) => (
            <div key={k} className="flex gap-8 px-6">
              {items.map(({ s, last, cp }) => {
                const up = (cp ?? 0) >= 0;
                const pctClass = cp == null
                  ? 'text-neutral-400'
                  : up ? 'text-emerald-400' : 'text-rose-400';
                return (
                  <button
                    key={`${k}-${s}`}
                    className="flex items-center gap-2 text-sm py-2 text-neutral-200 hover:text-white"
                    onClick={() => onSelect?.(s)}
                    aria-label={`Select ${s}`}
                  >
                    <span className="font-medium">{s}</span>
                    <span className="opacity-60">•</span>
                    <span className="tabular-nums">{fmtPrice(last)}</span>
                    <span className={`tabular-nums ${pctClass}`}>{fmtPct(cp)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}