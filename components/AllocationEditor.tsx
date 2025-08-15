// components/AllocationEditor.tsx
'use client';
import { useMemo } from 'react';

type Props = {
  symbols: string[];
  weights: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
};

export default function AllocationEditor({ symbols, weights, onChange }: Props) {
  const total = useMemo(() => Object.values(weights).reduce((a,b)=>a+(Number(b)||0), 0), [weights]);

  function setOne(sym: string, val: string) {
    const n = Number(val);
    const safe = Number.isFinite(n) ? Math.max(0, n) : 0;
    const copy = { ...weights, [sym]: safe };
    onChange(copy);
  }

  function normalize() {
    const sum = Object.values(weights).reduce((a,b)=>a+(Number(b)||0), 0);
    if (!sum) return;
    const next: Record<string, number> = {};
    for (const s of Object.keys(weights)) next[s] = (weights[s]||0) / sum;
    onChange(next);
  }

  function equalize() {
    if (!symbols.length) return;
    const ew = 1 / symbols.length;
    const next: Record<string, number> = {};
    for (const s of symbols) next[s] = ew;
    onChange(next);
  }

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">Allocations</div>
        <div className="text-xs text-neutral-500">Sum: {(total).toFixed(3)}</div>
      </div>
      <div className="space-y-2">
        {symbols.map(sym => (
          <div key={sym} className="flex items-center gap-2">
            <div className="w-16 text-sm">{sym}</div>
            <input
              type="number" step="0.01" min="0"
              className="flex-1 border rounded p-2 bg-white dark:bg-neutral-950"
              value={weights[sym] ?? 0}
              onChange={(e)=>setOne(sym, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button className="px-3 py-1 rounded bg-neutral-800 text-neutral-100 hover:bg-neutral-700" onClick={equalize}>
          Equal Weight
        </button>
        <button className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500" onClick={normalize}>
          Normalize to 1
        </button>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Tip: weights do not need to sum exactly to 1; we’ll normalize on the server.
      </p>
    </div>
  );
}