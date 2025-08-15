'use client';

type Metrics = {
  sharpe: number;
  sortino: number;
  var: number;
  cvar: number;
  max_drawdown: number;
};

export default function DiagnosticsPanel({
  summary,
  prev,
  curr,
}: {
  summary: string;
  prev?: Metrics | null;
  curr?: Metrics | null;
}) {
  const Row = ({ label, a, b }: { label: string; a?: number; b?: number }) => {
    const has = Number.isFinite(a!) && Number.isFinite(b!);
    const d = has ? (b! - a!) : null;
    const color = d == null ? 'text-neutral-400' : d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-600' : 'text-neutral-500';
    const fmt = (x?: number, p=3) => (Number.isFinite(x!) ? x!.toFixed(p) : '—');
    return (
      <div className="flex justify-between text-sm">
        <span className="text-neutral-500">{label}</span>
        <span className="tabular-nums">
          {fmt(a)} → {fmt(b)}{' '}
          <span className={`ml-1 ${color}`}>{d == null ? '' : (d > 0 ? `+${fmt(d)}` : fmt(d))}</span>
        </span>
      </div>
    );
  };

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-neutral-900">
      <div className="font-medium mb-2">Diagnostics</div>
      <p className="text-sm mb-3 text-neutral-700 dark:text-neutral-300">{summary || '—'}</p>
      {prev && curr ? (
        <div className="space-y-1">
          <Row label="Sharpe" a={prev.sharpe} b={curr.sharpe} />
          <Row label="Sortino" a={prev.sortino} b={curr.sortino} />
          <Row label="VaR(95%)" a={prev.var} b={curr.var} />
          <Row label="CVaR(95%)" a={prev.cvar} b={curr.cvar} />
          <Row label="Max Drawdown" a={prev.max_drawdown} b={curr.max_drawdown} />
        </div>
      ) : (
        <div className="text-sm text-neutral-500">Run at least twice to compare changes.</div>
      )}
    </div>
  );
}