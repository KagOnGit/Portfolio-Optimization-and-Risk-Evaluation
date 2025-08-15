// components/DownloadButtons.tsx
'use client';
import { toCSV } from '@/lib/csv';

type Props = {
  dates: string[];
  equity: number[];
  weights: Record<string, number>;
  fileName?: string;
};

export default function DownloadButtons({ dates, equity, weights, fileName='backtest.csv' }: Props) {
  function downloadCSV() {
    if (!dates.length || !equity.length) return;
    const rows = dates.map((d, i) => [d, equity[i]]);
    const csv = toCSV(rows, ['date','equity']);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }

  function copyWeights() {
    const pretty = JSON.stringify(weights, null, 2);
    navigator.clipboard.writeText(pretty).catch(()=>{});
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button className="px-3 py-1 rounded bg-neutral-800 text-neutral-100 hover:bg-neutral-700" onClick={downloadCSV}>
        Download CSV
      </button>
      <button className="px-3 py-1 rounded bg-neutral-700 text-neutral-100 hover:bg-neutral-600" onClick={copyWeights}>
        Copy Weights JSON
      </button>
    </div>
  );
}