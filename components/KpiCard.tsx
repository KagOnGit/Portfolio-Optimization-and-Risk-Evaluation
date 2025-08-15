// components/KpiCard.tsx
'use client';

type Props = {
  label: string;
  value: number | string | null | undefined;
  helpText?: string;
};

function formatKpi(v: number): string {
  // Keep 3 decimals, drop trailing zeros, keep leading 0 for <1
  const s = Math.abs(v) >= 1 ? v.toFixed(3) : v.toPrecision(3);
  return s.replace(/(\.\d*?[1-9])0+$/,'$1').replace(/\.0+$/,'');
}

export default function KpiCard({ label, value, helpText }: Props) {
  const isNum = typeof value === 'number' && Number.isFinite(value);
  const display = isNum ? formatKpi(value as number) : (value ?? '—');

  return (
    <div className="rounded-lg border bg-white/5 dark:bg-neutral-900 px-3 py-2">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-lg font-medium tabular-nums">{display}</div>
      {helpText ? <div className="text-[11px] text-neutral-500 mt-1">{helpText}</div> : null}
    </div>
  );
}