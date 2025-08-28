'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type Obs = { date: string; value: string };

export default function Page() {
  const [symbol, setSymbol] = useState('SPY');

  const fred = useQuery({
    queryKey: ['fred','DGS10'],
    queryFn: async () => {
      const res = await fetch('/api/econ/fred?series=DGS10');
      return res.json();
    }
  });

  const alpha = useQuery({
    queryKey: ['alpha', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/market/alpha?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${symbol}`);
      return res.json();
    }
  });

  const fredData: { date:string; value:number }[] =
    (fred.data?.data?.observations as Obs[]|undefined)?.map(o=>({ date:o.date, value: Number(o.value) || 0 })) ?? [];

  // AlphaVantage data structure mapping
  const series = alpha.data?.data?.['Monthly Adjusted Time Series'] ?? {};
  const alphaData = Object.entries(series).map(([date, v])=>({ 
    date, 
    value: Number((v as Record<string, string>)['5. adjusted close']) || 0 
  })).reverse();

  return (
    <main className="grid gap-6">
      <section className="card p-5">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-xl font-semibold">10Y Treasury Yield (FRED)</h2>
          {fred.isLoading && <span className="muted">Loading...</span>}
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fredData}>
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-xl font-semibold">{symbol} Monthly Adjusted Close (Alpha Vantage)</h2>
          <input className="border rounded px-2 py-1 ml-auto" value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={alphaData}>
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}
