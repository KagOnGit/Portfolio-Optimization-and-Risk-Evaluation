'use client';
import { useState } from 'react';

export default function BacktestPanel({
  onRun,
  defaultReb = 'NONE',
}: {
  onRun: (opts: { rebalance: 'NONE'|'M'|'Q' }) => void;
  defaultReb?: 'NONE'|'M'|'Q';
}) {
  const [rebalance, setRebalance] = useState<'NONE'|'M'|'Q'>(defaultReb);
  return (
    <div className="rounded-lg border p-4 bg-neutral-900">
      <div className="font-medium mb-2">Backtest</div>
      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span>Rebalance</span>
          <select
            className="bg-neutral-800 border rounded px-2 py-1"
            value={rebalance}
            onChange={e => setRebalance(e.target.value as any)}
          >
            <option value="NONE">None</option>
            <option value="M">Monthly</option>
            <option value="Q">Quarterly</option>
          </select>
        </label>
        <button
          className="ml-auto px-3 py-1 rounded bg-blue-600 text-white"
          onClick={() => onRun({ rebalance })}
        >
          Run
        </button>
      </div>
    </div>
  );
}