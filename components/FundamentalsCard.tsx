// components/FundamentalsCard.tsx
import React from 'react';

type Data = {
  marketCap?: number | null;
  pe?: number | null;
  forwardPE?: number | null;
  dividendYield?: number | null; // fraction
  beta?: number | null;
  week52High?: number | null;
  week52Low?: number | null;
};

function fmtNum(n?: number | null) {
  if (n == null || !Number.isFinite(n)) return null;
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  return n.toLocaleString();
}

function fmtPctFraction(n?: number | null) {
  if (n == null || !Number.isFinite(n)) return null;
  return (n * 100).toFixed(2) + '%';
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (value == null) return null; // hide empty rows for a clean card
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default function FundamentalsCard({ symbol, data }: { symbol: string; data: Data }) {
  const rows: Array<{ label: string; value: string | null }> = [
    { label: 'Market Cap', value: fmtNum(data.marketCap) },
    { label: 'P/E', value: fmtNum(data.pe) },
    { label: 'Forward P/E', value: fmtNum(data.forwardPE) },
    { label: 'Dividend Yield', value: fmtPctFraction(data.dividendYield) },
    { label: 'Beta', value: fmtNum(data.beta) },
    { label: '52W High', value: fmtNum(data.week52High) },
    { label: '52W Low', value: fmtNum(data.week52Low) },
  ];

  const shown = rows.filter((r) => r.value !== null);

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-neutral-900">
      <div className="font-medium mb-3">{symbol}</div>
      {shown.length === 0 ? (
        <div className="text-sm text-neutral-500">Not available for this symbol.</div>
      ) : (
        <div className="space-y-1">{shown.map((r) => <Row key={r.label} {...r} />)}</div>
      )}
    </div>
  );
}