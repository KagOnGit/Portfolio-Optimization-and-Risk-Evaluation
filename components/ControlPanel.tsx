'use client';
import { useState } from 'react';

export default function ControlPanel({ onRun }:{ onRun:(tickers:string[], method:string)=>void }) {
  const [tickers, setTickers] = useState('SPY,QQQ,TLT');
  const [method, setMethod] = useState('equal_weight');
  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-neutral-900">
      <label className="block text-sm mb-1" htmlFor="tickers">Tickers (comma-separated)</label>
      <input id="tickers" aria-label="Tickers"
        className="w-full border rounded p-2 mb-2 bg-white dark:bg-neutral-950"
        value={tickers} onChange={e=>setTickers(e.target.value)} />
      <label className="block text-sm mb-1" htmlFor="method">Method</label>
      <select id="method" aria-label="Method"
        className="w-full border rounded p-2 mb-3 bg-white dark:bg-neutral-950"
        value={method} onChange={e=>setMethod(e.target.value)}>
        <option value="equal_weight">Equal Weight</option>
        <option value="min_var">Min Variance (MOCK)</option>
        <option value="max_sharpe">Max Sharpe (MOCK)</option>
        <option value="black_litterman">Black-Litterman (MOCK)</option>
      </select>
      <button className="px-3 py-2 bg-blue-600 text-white rounded"
        onClick={()=>onRun(tickers.split(',').map(s=>s.trim()).filter(Boolean), method)}>
        Optimize
      </button>
    </div>
  );
}
