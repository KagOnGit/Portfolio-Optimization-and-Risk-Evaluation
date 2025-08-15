// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import TopTickerRibbon from '@/components/TopTickerRibbon';
import KpiCard from '@/components/KpiCard';
import ControlPanel from '@/components/ControlPanel';
import ChartContainer from '@/components/ChartContainer';
import FundamentalsCard from '@/components/FundamentalsCard';
import NewsList from '@/components/NewsList';
import { CardSkeleton, ChartSkeleton } from '@/components/LoadingSkeleton';
import DateRangePicker from '@/components/DateRangePicker';
import RiskReturnChart, { RiskPoint } from '@/components/RiskReturnChart';
import { load as loadPersist, save as savePersist } from '@/lib/persist';

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

type Preset = '1Y' | '3Y' | '5Y' | 'MAX' | 'CUSTOM';
function calcRange(preset: Exclude<Preset, 'CUSTOM'>) {
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

// Annualize mean/stdev and compute Sharpe (risk-free ~ 0 for simplicity)
function annualize(returns: number[]) {
  const n = returns.length;
  if (!n) return { mu: 0, sigma: 0, sharpe: 0 };
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const sigmaD = Math.sqrt(variance);
  const muA = mean * 252;
  const sigA = sigmaD * Math.sqrt(252);
  const sharpe = sigA ? muA / sigA : 0;
  return { mu: muA, sigma: sigA, sharpe };
}

export default function DashboardPage() {
  // Persisted selections
  const [tickers, setTickers] = useState<string[]>(() => loadPersist('tickers', ['SPY', 'QQQ', 'TLT']));
  const [selectedPreset, setSelectedPreset] = useState<Preset>(() => loadPersist('preset', '1Y' as Preset));
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() =>
    loadPersist('dateRange', calcRange('1Y'))
  );

  // Core state
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [equityCurve, setEquityCurve] = useState<{ x: number; y: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [macro, setMacro] = useState<MacroMap>({});
  const [funda, setFunda] = useState<Record<string, any>>({});
  const [news, setNews] = useState<Record<string, any[]>>({});
  const [riskPoints, setRiskPoints] = useState<RiskPoint[]>([]);

  // Persist whenever these change
  useEffect(() => savePersist('tickers', tickers), [tickers]);
  useEffect(() => savePersist('preset', selectedPreset), [selectedPreset]);
  useEffect(() => savePersist('dateRange', dateRange), [dateRange.start, dateRange.end]);

  // Ribbon selection
  function handleRibbonSelect(sym: string) {
    setTickers((prev) => {
      const has = prev.includes(sym);
      const next = has ? prev.filter((s) => s !== sym) : [sym, ...prev].slice(0, 6);
      return Array.from(new Set(next));
    });
  }

  async function runOptimize(userTickers: string[], method: string) {
    try {
      setError('');
      const res = await fetch('/api/portfolio/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: userTickers, method }),
      });
      if (!res.ok) throw new Error(`Optimize failed: ${res.status}`);
      const data = await res.json();
      setWeights(data.weights);
    } catch (e: any) {
      setError(e.message || 'Optimize error');
    }
  }

  // Metrics + Equity curve
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
          signal: ctrl.signal,
        });

        if (!r.ok) {
          let msg = `Metrics failed: ${r.status}`;
          try {
            const j = await r.json();
            if (j?.error && r.status === 400) {
              msg = `${j.error}. Try a wider date range like 1Y or MAX.`;
            }
          } catch {}
          if (mounted) setError(msg);
          return;
        }

        const d = await r.json();
        if (!mounted) return;

        setMetrics(d.metrics ?? d);
        if (Array.isArray(d.equityCurve) && d.equityCurve.length > 0) {
          setEquityCurve(d.equityCurve.map((val: number, idx: number) => ({ x: idx, y: val })));
        } else {
          setEquityCurve([{ x: 0, y: 1 }, { x: 1, y: 1 }]); // safe placeholder
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
  }, [tickers.join(','), dateRange.start, dateRange.end]);

  // Macro series
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
        }
        setMacro(map);
      } catch {}
    })();
    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [dateRange.start, dateRange.end]);

  // Fundamentals
  useEffect(() => {
    (async () => {
      const f: Record<string, any> = {};
      for (const s of tickers) {
        try {
          const r = await fetch(`/api/fundamentals/${s}`);
          if (r.ok) f[s] = await r.json();
        } catch {}
      }
      setFunda(f);
    })();
  }, [tickers.join(',')]);

  // News
  useEffect(() => {
    (async () => {
      const m: Record<string, any[]> = {};
      for (const s of tickers) {
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
  }, [tickers.join(',')]);

  // Risk–Return points from price history (respect selected dateRange)
  useEffect(() => {
    const ctrl = new AbortController();
    let mounted = true;
    (async () => {
      try {
        const r = await fetch('/api/prices/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers, start: dateRange.start, end: dateRange.end }),
          signal: ctrl.signal,
        });
        if (!r.ok) return;
        const j = await r.json();
        const series = Array.isArray(j?.series) ? j.series : [];

        const points: RiskPoint[] = [];
        for (const s of series as Array<{ symbol: string; bars: { date: string; close: number }[] }>) {
          const barsInRange = (s.bars || []).filter(
            (b) => b.date >= dateRange.start && b.date <= dateRange.end
          );
          const closes = barsInRange.map((b) => b.close).filter((n) => Number.isFinite(n));
          if (closes.length < 3) continue;

          const rets: number[] = [];
          for (let i = 1; i < closes.length; i++) rets.push(closes[i] / closes[i - 1] - 1);
          const { mu, sigma, sharpe } = annualize(rets);
          points.push({ x: sigma, y: mu, label: s.symbol, sharpe });
        }

        if (mounted) setRiskPoints(points);
      } catch {}
    })();
    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [tickers.join(','), dateRange.start, dateRange.end]);

  // Preset button handler
  function handlePresetClick(p: Exclude<Preset, 'CUSTOM'>) {
    setSelectedPreset(p);
    setDateRange(calcRange(p));
  }

  return (
    <div className="min-h-screen">
      <TopTickerRibbon onSelect={handleRibbonSelect} />

      {/* Presets + Custom Date */}
      <div className="mx-auto max-w-screen-2xl px-6 pt-4 flex flex-wrap items-center gap-3">
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
        <div className="ml-auto">
          <DateRangePicker
            value={dateRange}
            onChange={(rng) => {
              setSelectedPreset('CUSTOM');
              setDateRange(rng);
            }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-screen-2xl p-6 grid grid-cols-12 gap-4">
        {/* Left column */}
        <div className="col-span-12 md:col-span-3">
          {/* IMPORTANT: pass (panelTickers, method) to match ControlPanel’s onRun signature */}
          <ControlPanel
            onRun={(panelTickers: string[], method: string) => {
              setTickers(panelTickers);
              runOptimize(panelTickers, method);
            }}
          />
          <div className="mt-4 rounded-lg border p-4">
            <div className="text-sm font-medium mb-2">Selected Tickers</div>
            <div className="text-xs">{tickers.join(', ')}</div>
          </div>
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

        {/* Right column */}
        <div className="col-span-12 md:col-span-9 space-y-4">
          {/* Equity curve */}
          {loading ? <ChartSkeleton /> : <ChartContainer title="Portfolio Equity Curve" series={equityCurve} />}

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
                    ? (macro[id].slice(-30).map((y, i) => ({ x: i, y })) as { x: number; y: number }[])
                    : []
                }
              />
            ))}
          </div>

          {/* Risk vs Return */}
          <RiskReturnChart points={riskPoints} />

          {/* Fundamentals + News per ticker */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tickers.map((s) => (
              <div key={`f-${s}`} className="space-y-4">
                {funda[s] ? <FundamentalsCard symbol={s} data={funda[s]} /> : <CardSkeleton />}
                <NewsList items={news[s] || []} title={`${s} News`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}