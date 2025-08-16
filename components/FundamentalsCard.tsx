'use client';

import { useEffect, useState } from 'react';

type F = {
  symbol: string;
  marketCap: number | null;
  pe: number | null;
  fpe: number | null;
  dividendYield: number | null;
  beta: number | null;
  high52w: number | null;
  low52w: number | null;
};

function humanCap(n: number | null) {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n/1e12).toFixed(2) + 'T';
  if (abs >= 1e9)  return (n/1e9).toFixed(2)  + 'B';
  if (abs >= 1e6)  return (n/1e6).toFixed(2)  + 'M';
  return n.toFixed(0);
}

export default function FundamentalsCard({ symbol, data }: { symbol: string; data?: F }) {
  const [f, setF] = useState<F | null>(data ?? null);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    if (data) {
      setF(data);
      setErr('');
      return; // external data provided; skip fetch
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/fundamentals/${encodeURIComponent(symbol)}`, { cache: 'no-store' });
        const j = await res.json();
        if (alive) { setF(j); setErr(j?.error || ''); }
      } catch (e:any) { if (alive) { setF(null); setErr(String(e?.message||e)||''); } }
    })();
    return () => { alive = false; };
  }, [symbol, data]);

  const val = (n: number | null, fmt: (x:number)=>string = x => x.toFixed(2)) => (n == null ? '—' : fmt(n));

  return (
    <div className="rounded-lg border p-4 bg-white/0">
      <div className="text-xl font-semibold mb-2">{symbol}</div>
      {err && <div className="mb-2 text-xs text-neutral-400">Fetching fundamentals live…</div>}
      <div className="grid grid-cols-2 gap-y-3">
        <div>Market Cap</div><div className="text-right">{humanCap(f?.marketCap ?? null)}</div>
        <div>P/E</div><div className="text-right">{val(f?.pe ?? null)}</div>
        <div>Forward P/E</div><div className="text-right">{val(f?.fpe ?? null)}</div>
        <div>Dividend Yield</div><div className="text-right">{f?.dividendYield==null?'—':(f.dividendYield*100).toFixed(2)+'%'}</div>
        <div>Beta</div><div className="text-right">{val(f?.beta ?? null)}</div>
        <div>52W High</div><div className="text-right">{val(f?.high52w ?? null, x => x.toFixed(2))}</div>
        <div>52W Low</div><div className="text-right">{val(f?.low52w ?? null, x => x.toFixed(2))}</div>
      </div>
    </div>
  );
}
