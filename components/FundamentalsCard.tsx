// components/FundamentalsCard.tsx
'use client';

type Row = { label: string; value: string | number | null | undefined; isPct?: boolean };

function fmt(v: string | number | null | undefined, opts?: { pct?: boolean }) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number' && opts?.pct) return `${(v as number).toFixed(2)}%`;
  if (typeof v === 'number') return Number.isFinite(v) ? v.toString() : '—';
  return v || '—';
}

export default function FundamentalsCard({ symbol, data }: { symbol: string; data: any }) {
  const rows: Row[] = [
    { label: 'Market Cap', value: data?.marketCap },
    { label: 'P/E', value: data?.pe },
    { label: 'Forward P/E', value: data?.forwardPE },
    { label: 'Dividend Yield', value: data?.dividendYield, isPct: true },
    { label: 'Beta', value: data?.beta },
    { label: '52W High', value: data?.week52High },
    { label: '52W Low', value: data?.week52Low },
  ];

  return (
    <div className="rounded-lg border p-4">
      <div className="font-semibold mb-2">{symbol}</div>
      <div className="grid grid-cols-2 gap-y-2">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <div className="text-neutral-400">{r.label}</div>
            <div className="text-right">{fmt(r.value, { pct: r.isPct })}</div>
          </div>
        ))}
      </div>
    </div>
  );
}