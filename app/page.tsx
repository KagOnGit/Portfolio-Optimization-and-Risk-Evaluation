// app/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TopTickerRibbon from '@/components/TopTickerRibbon';
import KpiCard from '@/components/KpiCard';
import ControlPanel from '@/components/ControlPanel';
import ChartContainer from '@/components/ChartContainer';
import FundamentalsCard from '@/components/FundamentalsCard';
import NewsList from '@/components/NewsList';

type Metrics = {
  sharpe: number;
  sortino: number;
  var: number;
  cvar: number;
  max_drawdown: number;
};

type MacroMap = Record<string, number[]>;

function toNumbers(values: Array<{ value: string } | { date: string; value: string }>): number[] {
  const out: number[] = [];
  for (const v of values as any[]) {
    const s = String(v.value ?? '');
    if (!s || s === '.' || s.toLowerCase() === 'nan') continue;
    const n = parseFloat(s);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

// date-range presets
type Preset = '1Y' | '3Y' | '5Y' | 'MAX';
function calcRange(preset: Preset) {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  let start: string;
  if (preset === '1Y')
    start = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  else if (preset === '3Y')
    start = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  else if (preset === '5Y')
    start = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
  else start = '1900-01-01';
  return { start, end };
}

export default function DashboardPage() {
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [equityCurve, setEquityCurve] = useState<{ x: number; y: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [macro, setMacro] = useState<MacroMap>({});

  // NEW: fundamentals/news state
  const [funda, setFunda] = useState<Record<string, any>>({});
  const [news, setNews] = useState<Record<string, any[]>>({});

  // presets + date range
  const [selectedPreset, setSelectedPreset] = useState<Preset>('1Y');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => calcRange('1Y'));
  function handlePresetClick(p: Preset) {
    setSelectedPreset(p);
    setDateRange(calcRange(p));
  }

  // tickers (can wire to ControlPanel later)
  const defaultTickers = useMemo(() => ['SPY', 'QQQ', 'TLT'], []);
  const visibleTickers = defaultTickers; // simple for now

  async function runOptimize(tickers: string[], method: string) {
    try {
      setError('');
      const res = await fetch('/api/portfolio/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers, method }),
      });
      if (!res.ok) throw new Error(`Optimize failed: ${res.status}`);
      const data = await res.json();
      setWeights(data.weights);
    } catch (e: any) {
      setError(e.message || 'Optimize error');
    }
  }

  // Load metrics + equity curve (with cancel)
  useEffect(() => {
    const ctrl = new AbortController();
    let mounted = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const r = await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tickers: visibleTickers,
            start: dateRange.start,
            end: dateRange.end,
          }),
          signal: ctrl.signal,
        });
        if (!r.ok) {
          if (mounted) setError(`Metrics failed: ${r.status}`);
          return;
        }
        const d = await r.json();
        if (!mounted) return;
        setMetrics(d.metrics ?? d);
        if (Array.isArray(d.equityCurve) && d.equityCurve.length > 0) {
          setEquityCurve(d.equityCurve.map((val: number, idx: number) => ({ x: idx, y: val })));
        } else {
          setEquityCurve([{ x: 0, y: 1 }, { x: 1, y: 1 }]);
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError' && mounted) setError(e.message || 'Metrics error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [visibleTickers.join(','), dateRange.start, dateRange.end]);

  // Load macro (bound to range) with cancel
  useEffect(() => {
    const ctrl = new AbortController();
    let mounted = true;

    (async () => {
      try {
        const resp = await fetch('/api/macro/fred', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            series: ['CPIAUCSL', 'UNRATE', 'FEDFUNDS'],
            start: dateRange.start,
            end: dateRange.end,
          }),
          signal: ctrl.signal,
        });
        if (!resp.ok) return;
        const j = await resp.json();
        if (!mounted) return;
        const map: MacroMap = {};
        if (Array.isArray(j?.data)) {
          for (const s of j.data) {
            const id = String(s?.id || '');
            const arr = Array.isArray(s?.observations) ? toNumbers(s.observations) : [];
            if (id) map[id] = arr;
          }
          setMacro(map);
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        // silent log
        console.warn('Macro load error', e);
      }
    })();

    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [dateRange.start, dateRange.end]);

  // Fundamentals for first 3 tickers
  useEffect(() => {
    (async () => {
      const f: Record<string, any> = {};
      for (const s of visibleTickers) {
        try {
          const r = await fetch(`/api/fundamentals/${s}`);
          if (r.ok) f[s] = await r.json();
        } catch {}
      }
      setFunda(f);
    })();
  }, [visibleTickers.join(',')]);

  // News for first 3 tickers
  useEffect(() => {
    (async () => {
      const m: Record<string, any[]> = {};
      for (const s of visibleTickers) {
        try {
          const r = await fetch(`/api/news/${s}`);
          if (r.ok) {
            const j = await r.json();
            m[s] = j?.items || [];
          }
        } catch {}
      }
      setNews(m);
    })();
  }, [visibleTickers.join(',')]);

  const sparkline = (arr: number[]) => arr.slice(-30);

  return (
    <div className="min-h-screen">
      <TopTickerRibbon />

      {/* Preset buttons */}
      <div className="mx-auto max-w-screen-2xl px-6 pt-4 flex gap-3">
        {(['1Y', '3Y', '5Y', 'MAX'] as const).map((v) => (
          <button
            key={v}
            className={`px-3 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              selectedPreset === v
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
            }`}
            onClick={() => handlePresetClick(v)}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-screen-2xl p-6 grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <ControlPanel onRun={runOptimize} />
          <div className="mt-4 rounded-lg border p-4">
            <div className="text-sm font-medium mb-2">Weights</div>
            <pre className="text-xs overflow-auto max-h-60">{JSON.stringify(weights, null, 2)}</pre>
          </div>
          {error ? (
            <div className="mt-4 rounded-lg border border-red-500 p-3 text-sm text-red-400 bg-red-950/30">
              {error}
            </div>
          ) : null}
        </div>

        <div className="col-span-12 md:col-span-9 space-y-4">
          {/* Equity curve */}
          <ChartContainer title="Portfolio Equity Curve" series={loading ? [{ x: 0, y: 1 }, { x: 1, y: 1 }] : equityCurve} />

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <KpiCard label="Sharpe" value={loading ? '—' : metrics?.sharpe ?? '—'} />
            <KpiCard label="Sortino" value={loading ? '—' : metrics?.sortino ?? '—'} />
            <KpiCard label="VaR(95%)" value={loading ? '—' : metrics?.var ?? '—'} />
            <KpiCard label="CVaR(95%)" value={loading ? '—' : metrics?.cvar ?? '—'} />
            <KpiCard label="Max DD" value={loading ? '—' : metrics?.max_drawdown ?? '—'} />
          </div>

          {/* Diagnostics placeholder */}
          <div className="rounded-lg border p-4">
            <div className="font-medium mb-1">Diagnostics</div>
            <div className="text-sm text-neutral-400">
              First run for this selection. Metrics initialized.
              <br />
              Run at least twice to compare changes.
            </div>
          </div>

          {/* Macro sparklines */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['CPIAUCSL', 'UNRATE', 'FEDFUNDS'].map((id) => (
              <ChartContainer
                key={id}
                title={id}
                series={
                  macro[id]
                    ? (sparkline(macro[id]).map((y, i) => ({ x: i, y })) as { x: number; y: number }[])
                    : []
                }
              />
            ))}
          </div>

          {/* Fundamentals + News per ticker */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visibleTickers.map((s) => (
              <div key={`f-${s}`} className="space-y-4">
                <FundamentalsCard symbol={s} data={funda[s] || {}} />
                <NewsList items={news[s] || []} title={`${s} News`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}