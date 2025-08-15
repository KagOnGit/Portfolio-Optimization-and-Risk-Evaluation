'use client';
import { useState } from 'react';

type Shock = { target: 'TICKER'; key: string; pct: number };

export default function ScenarioPanel({
  onApply
}: {
  onApply: (shocks: Shock[]) => void;
}) {
  const [sym, setSym] = useState('SPY');
  const [pct, setPct] = useState(-2);

  return (
    <div className="rounded-lg border p-4 bg-neutral-900">
      <div className="font-medium mb-2">Scenario Shock</div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input className="bg-neutral-800 border rounded px-2 py-1 w-24" value={sym} onChange={e => setSym(e.target.value.toUpperCase())} />
        <span className="text-neutral-400">shock (%)</span>
        <input
          className="bg-neutral-800 border rounded px-2 py-1 w-20"
          type="number"
          value={pct}
          onChange={e => setPct(parseFloat(e.target.value))}
        />
        <button
          className="ml-auto px-3 py-1 rounded bg-emerald-600 text-white"
          onClick={() => onApply([{ target: 'TICKER', key: sym, pct: pct/100 }])}
        >
          Apply
        </button>
      </div>
    </div>
  );
}