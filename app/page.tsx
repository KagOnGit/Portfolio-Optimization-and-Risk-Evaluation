// app/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import TopTickerRibbon from '@/components/TopTickerRibbon';
import KpiCard from '@/components/KpiCard';
import ControlPanel from '@/components/ControlPanel';
import ChartContainer from '@/components/ChartContainer';
import FundamentalsCard from '@/components/FundamentalsCard';
import NewsList from '@/components/NewsList';
import { CardSkeleton, ChartSkeleton } from '@/components/LoadingSkeleton';
import DateRangePicker from '@/components/DateRangePicker';
import RiskReturnChart, { RiskPoint } from '@/components/RiskReturnChart';
import EquityChart from '@/components/EquityChart';
import { load as loadPersist, save as savePersist } from '@/lib/persist';
import { cachedJson } from '@/lib/cachedFetch';

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
  const [equityCurve, setEquityCurve] = useState<number[]>([]);
  const [equityDates, setEquityDates] = useState<string[]>([]);
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

  // Debounce heavy props a bit so we don't spam the APIs while user clicks quickly
  const debouncedTickers = useMemo(() => tickers, [tickers]);
  const debouncedRange = useMemo(() => dateRange, [dateRange]);

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
      const data = await cachedJson<any>(
        '/api/portfolio/optimize',
        { method: 'POST', body: { tickers: userTickers, method }, ttl: 10 * 60_000 }
      );
      setWeights(data.weights);
    } catch (e: any) {
      setError(e.message || 'Optimize error');
    }
  }

  // Metrics + Equity curve (date-aware)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const d = await cachedJson<any>(
          '/api/metrics',
          {
            method: 'POST',
            body: { tickers: debouncedTickers, start: debouncedRange.start, end: debouncedRange.end },
            ttl: 15 * 60_000,
          }
        );

        if (!alive) return;
        setMetrics(d.metrics ?? d);
        if (Array.isArray(d.equityCurve) && d.equityCurve.length > 0) {
          setEquityCurve(d.equityCurve as number[]);
          setEquityDates(Array.isArray(d.dates) ? d.dates : []);
        } else {
          setEquityCurve([]);
          setEquityDates([]);
          // make the user-facing hint friendlier
          if (!d.equityCurve?.length) {
            setError('No valid price data for chosen tickers/date range. Try a wider date range like 1Y or MAX.');
          }
        }
      } catch (e: any) {
        if (!alive) return;
        const msg = e?.message || 'Metrics error';
        setError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debouncedTickers.join(','), debouncedRange.start, debouncedRange.end]);

  // Macro series
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await cachedJson<any>(
          '/api/macro/fred',
          {
            method: 'POST',
            body: { series: ['CPIAUCSL', 'UNRATE', 'FEDFUNDS'], start: debouncedRange.start, end: debouncedRange.end },
            ttl: 6 * 60 * 60_000,
          }
        );
        if (!alive) return;
        const map: MacroMap = {};
        if (Array.isArray(j?.data)) {
          for (const s of j.data) {
            const id = String(s?.id || '');
            const arr = Array.isArray(s?.observations) ? toNumbers(s.observations) : [];
            if (id) map[id] = arr;
          }
        }
        setMacro(map);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [debouncedRange.start, debouncedRange.end]);

  // Fundamentals
  useEffect(() => {
    (async () => {
      const out: Record<string, any> = {};
      const first3 = debouncedTickers.slice(0, 3);
      for (const s of first3) {
        try {
          const d = await cachedJson<any>(`/api/fundamentals/${s}`, { ttl: 12 * 60 * 60_000 });
          out[s] = d;
        } catch {
          /* ignore */
        }
      }
      setFunda(out);
    })();
  }, [debouncedTickers.join(',')]);

  // News
  useEffect(() => {
    (async () => {
      const m: Record<string, any[]> = {};
      const first3 = debouncedTickers.slice(0, 3);
      for (const s of first3) {
        try {
          const j = await cachedJson<any>(`/api/news/${s}`, { ttl: 60 * 60_000 });
          m[s] = j?.items || [];
        } catch {
          /* ignore */
        }
      }
      setNews(m);
    })();
  }, [debouncedTickers.join(',')]);

  // Risk–Return points from price history
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await cachedJson<any>(
          '/api/prices/history',
          { method: 'POST', body: { tickers: debouncedTickers, start: debouncedRange.start, end: debouncedRange.end }, ttl: 30 * 60_000 }
        );
        if (!alive) return;
        const series = Array.isArray(j?.series) ? j.series : [];
        const points: RiskPoint[] = [];
        for (const s of series as Array<{ symbol: string; bars: { close: number }[] }>) {
          const closes = s.bars.map((b) => b.close).filter((n) => Number.isFinite(n));
          if (closes.length < 3) continue;
          const rets: number[] = [];
          for (let i = 1; i < closes.length; i++) rets.push(closes[i] / closes[i - 1] - 1);
          const { mu, sigma, sharpe } = annualize(rets);
          points.push({ x: sigma, y: mu, label: s.symbol, sharpe });
        }
        setRiskPoints(points);
      } catch {
        if (alive) setRiskPoints([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debouncedTickers.join(','), debouncedRange.start, debouncedRange.end]);

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
              selectedPreset === v ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
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
            <div className="mt-4 rounded-lg border border-red-500 p-3 text-sm text-red-400 bg-red-950/30">{error}</div>
          ) : null}
        </div>

        {/* Right column */}
        <div className="col-span-12 md:col-span-9 space-y-4">
          {/* Equity curve */}
          {loading ? <ChartSkeleton /> : <EquityChart title="Portfolio Equity Curve" values={equityCurve} dates={equityDates} />}

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
                series={macro[id] ? (macro[id].slice(-30).map((y, i) => ({ x: i, y })) as { x: number; y: number }[]) : []}
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