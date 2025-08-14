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
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [equityCurve, setEquityCurve] = useState<{ x: number; y: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [macro, setMacro] = useState<MacroMap>({});

  const [selectedPreset, setSelectedPreset] = useState<'1Y'|'3Y'|'5Y'|'MAX'>('1Y');
  const [dateRange, setDateRange] = useState<{ start:string, end:string }>(() => calcRange('1Y'));

  function handlePresetClick(p: '1Y'|'3Y'|'5Y'|'MAX') {
    setSelectedPreset(p);
    setDateRange(calcRange(p));
  }

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

  // Metrics + Equity Curve fetch with AbortController
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
          body: JSON.stringify({ tickers:['SPY','QQQ','TLT'], start: dateRange.start, end: dateRange.end }),
          signal: ctrl.signal
        });
        if (!r.ok) {
          if (mounted) setError(`Metrics failed: ${r.status}`);
          return;
        }
        const d = await r.json();
        if (!mounted) return;
        setMetrics(d.metrics ?? d);
        if (Array.isArray(d.equityCurve) && d.equityCurve.length>0) {
          setEquityCurve(d.equityCurve.map((val:number, idx:number) => ({ x: idx, y: val })));
        } else {
          setEquityCurve([{x:0,y:1},{x:1,y:1}]);
        }
      } catch(e:any) {
        if (e?.name==='AbortError') return;
        if (mounted) setError(e.message || 'Metrics error');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted=false;
      ctrl.abort();
    };
  }, [dateRange.start, dateRange.end]);

  // Macro fetch
  useEffect(() => {
    const ctrl = new AbortController();
    let mounted = true;

    (async () => {
      try {
        const resp = await fetch('/api/macro/fred', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ series:['CPIAUCSL','UNRATE','FEDFUNDS'], start:dateRange.start, end:dateRange.end }),
          signal: ctrl.signal
        });
        if (!resp.ok) return console.warn('Macro load failed', resp.status);
        const j = await resp.json();
        if (!mounted) return;
        const map: MacroMap = {};
        if (Array.isArray(j?.data)) {
          for (const s of j.data) {
            const id = String(s?.id || '');
            const arr = Array.isArray(s?.observations)? toNumbers(s.observations):[];
            if (id) map[id] = arr;
          }
          setMacro(map);
        }
      } catch(e:any) {
        if (e?.name==='AbortError') return;
        console.warn('Macro load error', e);
      }
    })();

    return () => { mounted=false; ctrl.abort(); };
  }, [dateRange.start, dateRange.end]);

  const sparkline = (arr:number[])=>arr.slice(-30);

  return (
    <div className="min-h-screen">
      <TopTickerRibbon />

      {/* Preset buttons */}
      <div className="mx-auto max-w-screen-2xl p-4 flex gap-3">
        {(['1Y','3Y','5Y','MAX'] as const).map(v=>(
          <button
            key={v}
            className={`px-3 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              selectedPreset===v?'bg-blue-600 text-white':'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            }`}
            onClick={()=>handlePresetClick(v)}
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
            <pre className="text-xs overflow-auto max-h-60">{JSON.stringify(weights,null,2)}</pre>
          </div>
          {error && (
            <div className="mt-4 rounded-lg border border-red-500 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950">
              {error}
            </div>
          )}
        </div>

        <div className="col-span-12 md:col-span-9 space-y-4">
          <ChartContainer title="Portfolio Equity Curve" series={loading?[{x:0,y:1},{x:1,y:1}]:equityCurve}/>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <KpiCard label="Sharpe" value={loading?'—':metrics?.sharpe ?? '—'} />
            <KpiCard label="Sortino" value={loading?'—':metrics?.sortino ?? '—'} />
            <KpiCard label="VaR(95%)" value={loading?'—':metrics?.var ?? '—'} />
            <KpiCard label="CVaR(95%)" value={loading?'—':metrics?.cvar ?? '—'} />
            <KpiCard label="Max DD" value={loading?'—':metrics?.max_drawdown ?? '—'} />
          </div>

          {/* Macro sparklines */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {['CPIAUCSL','UNRATE','FEDFUNDS'].map(id=>(
              <ChartContainer
                key={id}
                title={id}
                series={macro[id]?sparkline(macro[id]).map((y,i)=>({x:i,y})):[]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}