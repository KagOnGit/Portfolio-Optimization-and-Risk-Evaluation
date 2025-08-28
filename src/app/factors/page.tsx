'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { nf0 } from '@/lib/format';

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
  const sectorMap: Record<string, number> = {};
  for (const r of data) {
    const key = r.sector || '—';
    const cap = Number(r.marketCap) || 0;
    sectorMap[key] = (sectorMap[key] || 0) + cap;
  }
  const sectorData = Object.entries(sectorMap).map(([name, value])=>({ name, value })).sort((a,b)=>b.value-a.value);
  return (
    <div className="space-y-3">
      <input value={symbols} onChange={e=>setSymbols(e.target.value)} className="border rounded px-2 py-1 w-[400px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" />
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
      
      <div className="card p-5">
        <h3 className="text-lg font-semibold mb-3">Sector Breakdown (by Market Cap)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectorData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: 'currentColor' }} angle={-20} height={60} />
              <YAxis tick={{ fill: 'currentColor' }} tickFormatter={(v)=>nf0.format(v)} />
              <Tooltip formatter={(v)=>nf0.format(Number(v))} />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
