'use client';
import clsx from 'clsx';

type StatTileProps = {
  title: string;
  value: string | number;
  delta?: number | null;      // percent vs prior period
  hint?: string;              // small caption under the value
  tone?: 'primary' | 'neutral' | 'danger' | 'success';
  className?: string;
};

export function StatTile({
  title,
  value,
  delta,
  hint,
  tone = 'primary',
  className,
}: StatTileProps) {
  const toneRing = {
    primary: 'ring-orange-500/30',
    neutral: 'ring-zinc-500/20',
    danger: 'ring-red-500/30',
    success: 'ring-emerald-500/30',
  }[tone];

  const toneGlow = {
    primary: 'shadow-[0_0_40px_-10px] shadow-orange-600/25',
    neutral: 'shadow-[0_0_40px_-10px] shadow-zinc-600/15',
    danger: 'shadow-[0_0_40px_-10px] shadow-red-600/25',
    success: 'shadow-[0_0_40px_-10px] shadow-emerald-600/25',
  }[tone];

  const deltaTone =
    delta == null ? 'text-zinc-400' : delta >= 0 ? 'text-emerald-400' : 'text-red-400';

  const displayValue =
    typeof value === 'number' ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value) : value;

  return (
    <div
      className={clsx(
        'rounded-xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/60 to-zinc-950/70',
        'p-4 ring-1',
        toneRing,
        toneGlow,
        className
      )}
      aria-label={title}
      role="group"
    >
      <div className="text-zinc-300 text-sm">{title}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-semibold text-zinc-100 tabular-nums">{displayValue}</div>
        {delta != null && (
          <div className={clsx('text-xs font-medium', deltaTone)}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(2)}%
          </div>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

export default StatTile;