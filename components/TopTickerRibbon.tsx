// components/TopTickerRibbon.tsx
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

type Tkr = { symbol: string; last?: number | null; pct?: number | null };

const POLL_MS = 30_000;       // fetch every 30s
const SPEED_PX_S = 40;        // marquee speed

export default function TopTickerRibbon({
  tickers = ['SPY','QQQ','AAPL','MSFT','NVDA','TLT','GLD','GOOG'],
  onSelect,
}: { tickers?: string[]; onSelect?: (sym: string) => void }) {
  const [data, setData] = useState<Tkr[]>(tickers.map(s => ({ symbol: s })));
  const trackRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false); // avoid duplicate intervals in dev StrictMode

  async function pullOnce(symbols: string[]) {
    try {
      const qs = encodeURIComponent(symbols.join(','));
      const res = await fetch(`/api/prices/quote?symbols=${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('quote api failed');
      const j = await res.json() as Record<string, { last: number|null; changePct: number|null }>;
      const arr: Tkr[] = symbols.map(s => ({
        symbol: s,
        last: (j?.[s]?.last ?? null),
        pct:  (j?.[s]?.changePct ?? null),
      }));
      setData(arr);
    } catch {
      // keep last known; show dashes
    }
  }

  useEffect(() => {
    // one immediate pull
    pullOnce(tickers);

    // guard for dev double-invoke
    if (startedRef.current) return;
    startedRef.current = true;

    // install interval
    timerRef.current = setInterval(() => pullOnce(tickers), POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers.join(',')]); // stable unless tickers list actually changes

const items = useMemo(() => {
    const fmtPct = (p?: number | null) =>
      (p == null ? '— %' : `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`);
    const fmtPrice = (x?: number | null) => {
      if (x == null) return '—';
      const n = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x);
      return `$${n}`;
    };
    return data.map(d => ({
      key: d.symbol,
      node: (
        <div
          className="px-4 py-1 flex items-center gap-2 cursor-pointer select-none"
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : -1}
          aria-label={onSelect ? `Select ${d.symbol}` : undefined}
          onClick={onSelect ? () => onSelect(d.symbol) : undefined}
          onKeyDown={onSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(d.symbol); } } : undefined}
        >
          <span className="font-medium">{d.symbol}</span>
          <span className="text-neutral-300 tabular-nums">{fmtPrice(d.last)}</span>
          <span className={
            d.pct == null ? 'text-neutral-400'
            : d.pct >= 0 ? 'text-emerald-400' : 'text-red-400'
          }>
            {fmtPct(d.pct)}
          </span>
        </div>
      )
    }));
  }, [data]);

  // duplicate list for seamless loop
  const doubled = useMemo(() => [...items, ...items], [items]);

  return (
    <div className="relative w-full overflow-hidden border-b border-neutral-800">
      <div
        ref={trackRef}
        className="flex whitespace-nowrap will-change-transform animate-marquee"
        style={{
          animationDuration: `${Math.max(
            8,
            (trackRef.current?.scrollWidth ?? 1000) / SPEED_PX_S
          )}s`,
        }}
      >
        {doubled.map((i, idx) => <div key={`${i.key}-${idx}`}>{i.node}</div>)}
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation-name: marquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
}
