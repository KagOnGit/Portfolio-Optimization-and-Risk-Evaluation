'use client';

import { useEffect, useState } from 'react';
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

export default function DashboardPage() {
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  async function runOptimize(tickers: string[], method: string) {
    try {
      const res = await fetch('/api/portfolio/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers, method })
      });
      if (!res.ok) throw new Error(`Optimize failed: ${res.status}`);
      const data = await res.json();
      setWeights(data.weights);
    } catch (e: any) {
      setError(e.message || 'Optimize error');
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/metrics');
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

  const series = Array.from({length: 40}, (_,i)=>({x: 15*i, y: 20 + 2*i + Math.sin(i)*5}));

  return (
    <div className="p-6 grid grid-cols-12 gap-4">
      <div className="col-span-12 md:col-span-3">
        <ControlPanel onRun={runOptimize}/>
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
        <ChartContainer title="Portfolio (demo)" series={series}/>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <KpiCard label="Sharpe" value={loading ? '—' : metrics?.sharpe ?? '—'}/>
          <KpiCard label="Sortino" value={loading ? '—' : metrics?.sortino ?? '—'}/>
          <KpiCard label="VaR(95%)" value={loading ? '—' : metrics?.var ?? '—'}/>
          <KpiCard label="CVaR(95%)" value={loading ? '—' : metrics?.cvar ?? '—'}/>
          <KpiCard label="Max DD" value={loading ? '—' : metrics?.max_drawdown ?? '—'}/>
        </div>
      </div>
    </div>
  );
}
