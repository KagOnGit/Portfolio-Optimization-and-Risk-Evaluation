'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  onRun: (tickers: string[], method: string) => void;
  // optional: if you ever want to seed from the page instead of defaults
  initialTickers?: string[];
};

const DEFAULT_SYMBOLS = ['SPY', 'QQQ', 'TLT', 'AAPL', 'MSFT', 'GLD', 'BTC-USD'];

export default function ControlPanel({ onRun, initialTickers }: Props) {
  // --- selection state -------------------------------------------------------
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState('equal_weight');

  // selected tickers as a Set for easy toggle
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((initialTickers && initialTickers.length ? initialTickers : ['SPY', 'QQQ', 'TLT']).map(s => s.toUpperCase()))
  );

  // dropdown search/add
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  const allSymbols = useMemo(() => {
    // keep defaults at the top; include any newly added custom symbols too
    const customs = Array.from(selected).filter(s => !DEFAULT_SYMBOLS.includes(s));
    return [...DEFAULT_SYMBOLS, ...customs];
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return allSymbols;
    return allSymbols.filter(s => s.includes(q));
  }, [query, allSymbols]);

  function toggle(sym: string) {
    const up = sym.toUpperCase();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(up)) next.delete(up);
      else next.add(up);
      return next;
    });
  }

  function addCustom() {
    const up = query.trim().toUpperCase();
    if (!up) return;
    setSelected(prev => new Set(prev).add(up));
    setQuery('');
  }

  function remove(sym: string) {
    const up = sym.toUpperCase();
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(up);
      return next;
    });
  }

  function applyAndClose() {
    setOpen(false);
  }

  function optimize() {
    const list = Array.from(selected);
    if (list.length === 0) return;
    onRun(list, method);
  }

  // close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      if (!listRef.current) return;
      const t = e.target as Node;
      if (!listRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-neutral-900 relative">
      {/* Tickers picker */}
      <label className="block text-sm mb-1">Tickers</label>

      {/* Selected chips + button */}
      <div className="flex flex-wrap gap-2 mb-2">
        {Array.from(selected).map(sym => (
          <span
            key={`chip-${sym}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border bg-neutral-50 dark:bg-neutral-950"
          >
            {sym}
            <button
              aria-label={`Remove ${sym}`}
              className="opacity-70 hover:opacity-100"
              onClick={() => remove(sym)}
            >
              ×
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="ml-auto px-2.5 py-1.5 text-sm rounded border bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          {open ? 'Close' : 'Select tickers'}
        </button>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-[calc(100%-2rem)] max-h-80 overflow-auto rounded-lg border bg-white dark:bg-neutral-950 shadow-lg p-3"
          style={{ left: '1rem' }}
          role="listbox"
        >
          {/* Search / Add row */}
          <div className="flex gap-2 mb-3">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addCustom();
              }}
              placeholder="Search or type a symbol (e.g., NVDA) and press Enter"
              className="flex-1 border rounded px-2 py-1 bg-white dark:bg-neutral-900"
            />
            <button
              type="button"
              className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
              onClick={addCustom}
            >
              Add
            </button>
          </div>

          {/* Checklist */}
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            {filtered.map(sym => {
              const checked = selected.has(sym);
              return (
                <label key={`opt-${sym}`} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-blue-600"
                    checked={checked}
                    onChange={() => toggle(sym)}
                  />
                  <span className="text-sm">{sym}</span>
                </label>
              );
            })}
          </div>

          {/* Actions */}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded border text-sm bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
              onClick={applyAndClose}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Method */}
      <label className="block text-sm mb-1 mt-3" htmlFor="method">Method</label>
      <select
        id="method"
        aria-label="Method"
        className="w-full border rounded p-2 mb-3 bg-white dark:bg-neutral-950"
        value={method}
        onChange={e => setMethod(e.target.value)}
      >
        <option value="equal_weight">Equal Weight</option>
        <option value="min_var">Min Variance (MOCK)</option>
        <option value="max_sharpe">Max Sharpe (MOCK)</option>
        <option value="black_litterman">Black-Litterman (MOCK)</option>
      </select>

      {/* Optimize */}
      <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={optimize}>
        Optimize
      </button>
    </div>
  );
}