'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function FactorsPage() {
  const [symbols,setSymbols] = useState('SPY,AAPL,MSFT');
  const q = useQuery({
    queryKey: ['factors', symbols],
    queryFn: async()=>{
      const res = await fetch('/api/fmp/factors?symbols=' + encodeURIComponent(symbols));
      return res.json();
    }
  });
  const data = q.data?.factors || [];
  return (
    <div className="space-y-3">
      <input value={symbols} onChange={e=>setSymbols(e.target.value)} className="border rounded px-2 py-1 w-[400px]" />
      <table className="min-w-full text-sm">
        <thead className="border-b">
          <tr><th>Symbol</th><th>Name</th><th>Sector</th><th>Beta</th><th>P/E</th><th>Market Cap</th></tr>
        </thead>
        <tbody>
          {data.map((r: { symbol: string; name: string; sector: string; beta: number; pe: number; marketCap: number })=>(
            <tr key={r.symbol} className="border-t">
              <td>{r.symbol}</td><td>{r.name}</td><td>{r.sector}</td>
              <td>{Number.isFinite(r.beta)? r.beta.toFixed(2):'—'}</td>
              <td>{Number.isFinite(r.pe)? r.pe.toFixed(2):'—'}</td>
              <td>{r.marketCap? Intl.NumberFormat().format(r.marketCap):'—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
