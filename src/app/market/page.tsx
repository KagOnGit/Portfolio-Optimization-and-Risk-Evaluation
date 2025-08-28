'use client';
import { nf0 } from '@/lib/format';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function MarketPage() {
  const [symbol, setSymbol] = useState('SPY');
  const [fn, setFn] = useState('TIME_SERIES_MONTHLY_ADJUSTED');
  const q = useQuery({
    queryKey: ['alpha', symbol, fn],
    queryFn: async () => {
      const res = await fetch('/api/market/alpha?function=' + fn + '&symbol=' + symbol);
      return res.json();
    }
  });
  const series = q.data?.data?.['Monthly Adjusted Time Series']
    || q.data?.data?.['Weekly Adjusted Time Series']
    || q.data?.data?.['Time Series (Daily)'] || {};
  const data = Object.entries(series).map(([date,v])=>({ date, value:Number((v as Record<string, string>)['5. adjusted close'])||0 })).reverse();
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="border rounded px-2 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())}/>
        <select value={fn} onChange={e=>setFn(e.target.value)} className="border rounded px-2 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
          <option value="TIME_SERIES_DAILY_ADJUSTED">Daily</option>
          <option value="TIME_SERIES_WEEKLY_ADJUSTED">Weekly</option>
          <option value="TIME_SERIES_MONTHLY_ADJUSTED">Monthly</option>
        </select>
      </div>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" hide tick={{ fill: "currentColor" }} label={{ value: "Date", position: "insideBottom", offset: -6 }} />
            <YAxis tick={{ fill: "currentColor" }} tickFormatter={(v)=>nf0.format(v)} label={{ value: "Price", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
