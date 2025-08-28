'use client';
import { nf2 } from '@/lib/format';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const seriesOptions = [
  { id: 'DGS10', label: '10Y Treasury Yield' },
  { id: 'DFF', label: 'Fed Funds Rate' },
  { id: 'CPIAUCSL', label: 'CPI (All Urban Consumers)' },
  { id: 'UNRATE', label: 'Unemployment Rate' },
  { id: 'GDPC1', label: 'Real GDP' },
];

export default function EconPage() {
  const [series, setSeries] = useState('DGS10');
  const q = useQuery({
    queryKey: ['fred', series],
    queryFn: async () => {
      const res = await fetch('/api/econ/fred?series=' + series);
      return res.json();
    }
  });
  const obs = q.data?.data?.observations || [];
  const data = obs.map((o: { date: string; value: string })=>({ date:o.date, value: Number(o.value)||0 }));
  return (
    <div className="space-y-3">
      <select value={series} onChange={e=>setSeries(e.target.value)} className="border rounded px-2 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
        {seriesOptions.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" hide tick={{ fill: "currentColor" }} label={{ value: "Date", position: "insideBottom", offset: -6 }} />
            <YAxis tick={{ fill: "currentColor" }} tickFormatter={(v)=>nf2.format(v)} label={{ value: "Value", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
