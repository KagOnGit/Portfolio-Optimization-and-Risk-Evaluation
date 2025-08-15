'use client';

import { useEffect, useRef, useState } from 'react';
import TopTickerRibbon from '@/components/TopTickerRibbon';
import KpiCard from '@/components/KpiCard';
import ControlPanel from '@/components/ControlPanel';
import ChartContainer from '@/components/ChartContainer';
import FundamentalsCard from '@/components/FundamentalsCard';
import NewsList from '@/components/NewsList';
import DiagnosticsPanel from '@/components/DiagnosticsPanel';
import { usePersistentState } from '@/hooks/usePersistentState';

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

function calcRange(preset: '1Y'|'3Y'|'5Y'|'MAX') {
  const today = new Date();
  const end = today.toISOString().slice(0,10);
  let start: string;
  if (preset === '1Y') start = new Date(today.getFullYear()-1, today.getMonth(), today.getDate()).toISOString().slice(0,10);
  else if (preset === '3Y') start = new Date(today.getFullYear()-3, today.getMonth(), today.getDate()).toISOString().slice(0,10);
  else if (preset === '5Y') start = new Date(today.getFullYear()-5, today.getMonth(), today.getDate()).toISOString().slice(0,10);
  else start = '1900-01-01';
  return { start, end };
}

export default function DashboardPage() {
  // Persisted watchlist + preset
  const [tickers, setTickers] = usePersistentState<string[]>('po.tickers', ['SPY','QQQ','TLT']);
  const [selectedPreset, setSelectedPreset] = usePersistentState<'1Y'|'3Y'|'5Y'|'MAX'>('po.preset', '1Y');
  const [dateRange, setDateRange] = usePersistentState<{ start: string; end: string }>('po.range', calcRange('1Y'));

  // When preset changes, recompute range and persist
  useEffect(() => { setDateRange(calcRange(selectedPreset)); }, [selectedPreset, setDateRange]);

  const [weights, setWeights] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [prevMetrics, setPrevMetrics] = useState<Metrics | null>(null);
  const [equityCurve, setEquityCurve] = useState<{ x: number; y: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [macro, setMacro] = useState<MacroMap>({});
  const [diagSummary, setDiagSummary] = useState<string>('');
  const firstLoadRef = useRef(true);

  async function runOptimize(sel: string[], method: string) {
    try {
      setError('');
      // Also persist user-entered tickers from ControlPanel if provided
      if (Array.isArray(sel) && sel.length) setTickers(sel.map(s => s.trim().toUpperCase()));
      const res = await fetch('/api/portfolio/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: sel, method }),
      });
      if (!res.ok) throw new Error(`Optimize failed: ${res.status}`);
      const data = await res.json();
      setWeights(data.weights);
    } catch (e: any) {
      setError(e.message || 'Optimize error');
    }
  }

  // Metrics + Equity Curve (Abort-safe)
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
          body: JSON.stringify({ tickers, start: dateRange.start, end: dateRange.end }),
          signal: ctrl.signal
        });
        if (!r.ok) {
          if (mounted) setError(`Metrics failed: ${r.status}`);
          return;
        }
        const d = await r.json();
        if (!mounted) return;

        // Diagnostics: keep last and compute summary
        if (!firstLoadRef.current) setPrevMetrics(metrics ?? null);
        setMetrics(d.metrics ?? d);
        if (Array.isArray(d.equityCurve) && d.equityCurve.length > 0) {
          setEquityCurve(d.equityCurve.map((val: number, idx: number) => ({ x: idx, y: val })));
        } else {
          setEquityCurve([{ x: 0, y: 1 }, { x: 1, y: 1 }]);
        }
        firstLoadRef.current = false;
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        if (mounted) setError(e.message || 'Metrics error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; ctrl.abort(); };
  }, [tickers.join(','), dateRange.start, dateRange.end]); // re-run on tickers/range

  // Diagnostics call (prev vs current)
  useEffect(() => {
    const ctrl = new AbortController();
    let mounted = true;

    (async () => {
      if (!metrics) return;
      try {
        const r = await fetch('/api/diagnostics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prev: prevMetrics,
            curr: metrics,
            tickers,
            range: dateRange
          }),
          signal: ctrl.signal
        });
        if (!r.ok) return;
        const j = await r.json();
        if (!mounted) return;
        setDiagSummary(j?.summary || '');
      } catch { /* ignore */ }
    })();

    return () => { mounted = false; ctrl.abort(); };
  }, [metrics, prevMetrics, tickers.join(','), dateRange.start, dateRange.end]);

  // Macro (range-bound)
  useEffect(() => {
    const ctrl = new AbortController();
    let mounted = true;

    (async () => {
      try {
        const resp = await fetch('/api/macro/fred', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ series: ['CPIAUCSL','UNRATE','FEDFUNDS'], start: dateRange.start, end: dateRange.end }),
          signal: ctrl.signal
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
      }
    })();

    return () => { mounted = false; ctrl.abort(); };
  }, [dateRange.start, dateRange.end]);

  // Fundamentals + News for first N tickers
  const [funda, setFunda] = useState<Record<string, any>>({});
  const [news, setNews] = useState<Record<string, any[]>>({});
  useEffect(() => {
    const ctrl = new AbortController();
    let mounted = true;

    (async () => {
      const top = tickers.slice(0, 3);
      const f: Record<string, any> = {};
      for (const s of top) {
        try {
          const r = await fetch(`/api/fundamentals/${encodeURIComponent(s)}`, { signal: ctrl.signal });
          if (r.ok) f[s] = await r.json();
        } catch {}
      }
      if (mounted) setFunda(f);
    })();

    return () => { mounted = false; ctrl.abort(); };
  }, [tickers.join(',')]);

  useEffect(() => {
    const ctrl = new AbortController();
    let mounted = true;

    (async () => {
      const top = tickers.slice(0, 3);
      const m: Record<string, any[]> = {};
      for (const s of top) {
        try {
          const r = await fetch(`/api/news/${encodeURIComponent(s)}`, { signal: ctrl.signal });
          if (r.ok) {
            const j = await r.json();
            m[s] = j?.items || [];
          }
        } catch {}
      }
      if (mounted) setNews(m);
    })();

    return () => { mounted = false; ctrl.abort(); };
  }, [tickers.join(',')]);

  const sparkline = (arr: number[]) => arr.slice(-30);

  return (
    <div className="min-h-screen">
      <TopTickerRibbon />

      {/* Preset buttons */}
      <div className="mx-auto max-w-screen-2xl p-4 flex gap-3">
        {(['1Y','3Y','5Y','MAX'] as const).map(v => (
          <button
            key={v}
            className={`px-3 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              selectedPreset === v ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            }`}
            onClick={() => setSelectedPreset(v)}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-screen-2xl p-6 grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          {/* Your ControlPanel already lets users enter tickers/method; we persist tickers on Optimize */}
          <ControlPanel onRun={runOptimize} />
          <div className="mt-4 rounded-lg border p-4">
            <div className="text-sm font-medium mb-2">Weights</div>
            <pre className="text-xs overflow-auto max-h-60">{JSON.stringify(weights, null, 2)}</pre>
          </div>
          {error && (
            <div className="mt-4 rounded-lg border border-red-500 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950">
              {error}
            </div>
          )}
        </div>

        <div className="col-span-12 md:col-span-9 space-y-4">
          {/* Equity Curve */}
          <ChartContainer title="Portfolio Equity Curve" series={loading ? [{ x:0, y:1 }, { x:1, y:1 }] : equityCurve} />

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <KpiCard label="Sharpe" value={loading ? '—' : metrics?.sharpe ?? '—'} />
            <KpiCard label="Sortino" value={loading ? '—' : metrics?.sortino ?? '—'} />
            <KpiCard label="VaR(95%)" value={loading ? '—' : metrics?.var ?? '—'} />
            <KpiCard label="CVaR(95%)" value={loading ? '—' : metrics?.cvar ?? '—'} />
            <KpiCard label="Max DD" value={loading ? '—' : metrics?.max_drawdown ?? '—'} />
          </div>

          {/* Diagnostics */}
          <DiagnosticsPanel summary={diagSummary} prev={prevMetrics} curr={metrics} />

          {/* Macro sparklines */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {['CPIAUCSL','UNRATE','FEDFUNDS'].map(id => (
              <ChartContainer
                key={id}
                title={id}
                series={macro[id] ? sparkline(macro[id]).map((y, i) => ({ x: i, y })) : []}
              />
            ))}
          </div>

          {/* Fundamentals + News for top 3 tickers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {tickers.slice(0,3).map((s) => (
              <div key={`f-${s}`} className="space-y-4">
                <FundamentalsCard symbol={s} data={funda[s] || {}} />
                <NewsList items={news[s] || []} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}