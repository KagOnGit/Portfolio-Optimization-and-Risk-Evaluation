// components/TopTickerRibbon.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type TickerItem = {
  symbol: string;
  price: number | null;
  changePct: number | null;
};

const DEFAULT_TICKERS = ['SPY','QQQ','AAPL','MSFT','TLT','GLD','BTC-USD'];

function classByChange(changePct: number | null) {
  if (changePct == null) return 'text-neutral-400';
  if (changePct > 0) return 'text-emerald-500';
  if (changePct < 0) return 'text-red-500';
  return 'text-neutral-400';
}

export default function TopTickerRibbon({
  symbols = DEFAULT_TICKERS,
  refreshMs = 60_000,
  pxPerSec = 120,
}: {
  symbols?: string[];
  refreshMs?: number;
  pxPerSec?: number;
}) {
  const [rows, setRows] = useState<TickerItem[]>(
    symbols.map(s => ({ symbol: s.toUpperCase(), price: null, changePct: null }))
  );
  const [err, setErr] = useState<string>('');
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState<number>(30);

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

      const mapped: TickerItem[] = symbols.map((s) => {
        const d = data[s.toUpperCase()];
        const last = Number(d?.last);
        const cp = Number(d?.changePct);
        return {
          symbol: s.toUpperCase(),
          price: Number.isFinite(last) ? last : null,
          changePct: Number.isFinite(cp) ? cp : null,
        };
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

  // We render 2 identical sets; animation moves by -50% = one-set width → seamless loop
  const setData = useMemo(() => rows, [rows]);

  // Measure width of one set to compute consistent speed
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const oneSetWidth = el.scrollWidth / 2; // track renders two sets
    if (oneSetWidth > 0) {
      setDuration(Math.max(12, oneSetWidth / pxPerSec)); // seconds = pixels / pxPerSec
    }
  }, [rows, pxPerSec]);

  return (
    <div className="sticky top-0 z-40 w-full border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-neutral-950/85 dark:supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto max-w-screen-2xl">
        <div className="h-10 overflow-hidden relative ticker-mask">
          <div
            ref={trackRef}
            className="ticker-track whitespace-nowrap"
            style={{ ['--dur' as any]: `${duration}s` }}
            aria-live="polite"
          >
            {[0, 1].map(rep => (
              <div key={rep} className="flex gap-6 pr-12">
                {setData.map((item, idx) => {
                  const cls = classByChange(item.changePct);
                  const pct =
                    item.changePct == null
                      ? '—'
                      : `${item.changePct >= 0 ? '+' : ''}${item.changePct.toFixed(2)}%`;
                  const price =
                    item.price == null
                      ? '—'
                      : item.symbol === 'BTC-USD'
                      ? `$${item.price.toLocaleString()}`
                      : item.price.toLocaleString();
                  return (
                    <div key={`${rep}-${item.symbol}-${idx}`} className="flex items-center gap-1 text-sm">
                      <span className="font-medium text-neutral-700 dark:text-neutral-200">{item.symbol}</span>
                      <span className="text-neutral-500">•</span>
                      <span className="tabular-nums text-neutral-800 dark:text-neutral-100">{price}</span>
                      <span className={`tabular-nums ${cls}`}>{pct}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {err ? (
          <div className="px-3 pb-2 text-xs text-red-600 dark:text-red-400">{err}</div>
        ) : null}
      </div>
    </div>
  );
}