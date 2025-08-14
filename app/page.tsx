'use client';

import { useEffect, useState } from 'react';
import TopTickerRibbon from '@/components/TopTickerRibbon';
import KpiCard from '@/components/KpiCard';
import ControlPanel from '@/components/ControlPanel';
import ChartContainer from '@/components/ChartContainer';

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

export default function DashboardPage() {
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [macro, setMacro] = useState<MacroMap>({});

  async function runOptimize(tickers: string[], method: string) {
    try {
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

  // Load metrics (real, via POST)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers: ['SPY', 'QQQ', 'TLT'] }),
        });
        if (!r.ok) throw new Error(`Metrics failed: ${r.status}`);
        const d = await r.json();
        setMetrics(d);
      } catch (e: any) {
        setError(e.message || 'Metrics error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load macro (FRED)
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/macro/fred', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Optionally pass a date range: { series: [...], start: '2015-01-01' }
          body: JSON.stringify({ series: ['CPIAUCSL', 'UNRATE', 'FEDFUNDS'] }),
        });
        if (!resp.ok) {
          // Don’t surface macro errors in the main error box; keep UI usable
          console.warn('Macro load failed', resp.status);
          return;
        }
        const j = await resp.json();
        const map: MacroMap = {};
        // Expecting shape: {  [ { id, observations: [ {date,value}, ... ] }, ... ] }
        if (Array.isArray(j?.data)) {
          for (const s of j.data) {
            const id = String(s?.id || '');
            const arr = Array.isArray(s?.observations) ? toNumbers(s.observations) : [];
            if (id) map[id] = arr;
          }
          setMacro(map);
        }
      } catch (e) {
        console.warn('Macro load error', e);
      }
    })();
  }, []);

  // Example portfolio demo series (placeholder chart)
  const series = Array.from({ length: 40 }, (_, i) => ({
    x: 15 * i,
    y: 20 + 2 * i + Math.sin(i) * 5,
  }));

  // Example sparkline function for macro values
  const sparkline = (arr: number[]) => arr.slice(-30); // last 30 points

  return (
    <div className="min-h-screen">
      <TopTickerRibbon />
      <div className="mx-auto max-w-screen-2xl p-6 grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-3">
          <ControlPanel onRun={runOptimize} />
          <div className="mt-4 rounded-lg border p-4">
            <div className="text-sm font-medium mb-2">Weights</div>
            <pre className="text-xs overflow-auto max-h-60">{JSON.stringify(weights, null, 2)}</pre>
          </div>
          {error ? (
            <div className="mt-4 rounded-lg border border-red-500 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950">
              {error}
            </div>
          ) : null}
        </div>

        <div className="col-span-12 md:col-span-9 space-y-4">
          <ChartContainer title="Portfolio (demo)" series={series} />

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <KpiCard label="Sharpe" value={loading ? '—' : metrics?.sharpe ?? '—'} />
            <KpiCard label="Sortino" value={loading ? '—' : metrics?.sortino ?? '—'} />
            <KpiCard label="VaR(95%)" value={loading ? '—' : metrics?.var ?? '—'} />
            <KpiCard label="CVaR(95%)" value={loading ? '—' : metrics?.cvar ?? '—'} />
            <KpiCard label="Max DD" value={loading ? '—' : metrics?.max_drawdown ?? '—'} />
          </div>

          {/* Macro sparklines (FRED) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
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
        </div>
      </div>
    </div>
  );
}
