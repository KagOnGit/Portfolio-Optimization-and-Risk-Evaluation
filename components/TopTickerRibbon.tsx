// components/TopTickerRibbon.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type TickerItem = { symbol: string; price: number | null; changePct: number | null };

const DEFAULT_TICKERS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TLT', 'GLD', 'BTC-USD'];

function classByChange(x: number | null) {
  if (x == null) return 'text-neutral-400';
  return x > 0 ? 'text-emerald-500' : x < 0 ? 'text-red-500' : 'text-neutral-400';
}

export default function TopTickerRibbon({
  symbols = DEFAULT_TICKERS,
  refreshMs = 60_000,
  pxPerSec = 120,
  onSelect, // <-- NEW optional prop
}: {
  symbols?: string[];
  refreshMs?: number;
  pxPerSec?: number;
  onSelect?: (symbol: string) => void;
}) {
  const [rows, setRows] = useState<TickerItem[]>(
    symbols.map((s) => ({ symbol: s.toUpperCase(), price: null, changePct: null }))
  );
  const [err, setErr] = useState('');
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState(30);

  async function load() {
    try {
      setErr('');
      const r = await fetch('/api/prices/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
        cache: 'no-store',
      });
      if (!r.ok) throw new Error(`quote ${r.status}`);
      const data = await r.json();
      const mapped = symbols.map((s) => {
        const d = data[s.toUpperCase()];
        const last = Number(d?.last);
        const cp = Number(d?.changePct);
        return {
          symbol: s.toUpperCase(),
          price: Number.isFinite(last) ? last : null,
          changePct: Number.isFinite(cp) ? cp : null,
        } as TickerItem;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(','), refreshMs]);

  // Two copies for seamless loop
  const setData = useMemo(() => rows, [rows]);

  // Measure and set duration based on width
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const oneSetWidth = el.scrollWidth / 2; // because we render two sets
    if (oneSetWidth > 0) setDuration(Math.max(12, oneSetWidth / pxPerSec));
  }, [rows, pxPerSec]);

  return (
    <div className="sticky top-0 z-40 w-full border-b bg-neutral-950/85 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto max-w-screen-2xl">
        <div className="h-10 overflow-hidden relative ticker-mask">
          <div
            ref={trackRef}
            className="ticker-track whitespace-nowrap"
            style={{ ['--dur' as any]: `${duration}s` }}
            aria-live="polite"
          >
            {[0, 1].map((rep) => (
              <div key={rep} className="flex gap-6 pr-12">
                {setData.map((it, idx) => {
                  const pct =
                    it.changePct == null ? '—' : `${it.changePct >= 0 ? '+' : ''}${it.changePct.toFixed(2)}%`;
                  const price =
                    it.price == null
                      ? '—'
                      : it.symbol === 'BTC-USD'
                      ? `$${it.price.toLocaleString()}`
                      : it.price.toLocaleString();
                  return (
                    <button
                      key={`${rep}-${it.symbol}-${idx}`}
                      type="button"
                      onClick={() => onSelect?.(it.symbol)}
                      className="flex items-center gap-1 text-sm hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-label={`Select ${it.symbol}`}
                    >
                      <span className="font-medium text-neutral-200">{it.symbol}</span>
                      <span className="text-neutral-500">•</span>
                      <span className="tabular-nums text-neutral-100">{price}</span>
                      <span className={`tabular-nums ${classByChange(it.changePct)}`}>{pct}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {err ? <div className="px-3 pb-2 text-xs text-red-400">{err}</div> : null}
      </div>
    </div>
  );
}