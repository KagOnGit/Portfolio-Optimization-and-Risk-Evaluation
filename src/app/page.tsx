'use client';
import { useState } from 'react';

export default function Dashboard() {
  const [tab, setTab] = useState<'market'|'econ'|'opt'|'factors'>('market');
  return (
    <div className="space-y-4">
      <div className="flex space-x-3 border-b pb-2">
        {['market','econ','opt','factors'].map(t=>(
          <button key={t}
            onClick={()=>setTab(t as 'market'|'econ'|'opt'|'factors')}
            className={`px-3 py-1 rounded-t text-sm font-medium ${tab===t? 'bg-blue-500 text-white':'bg-gray-200 dark:bg-gray-700'}`}
          >
            {t==='market'?'Market Data':t==='econ'?'Economic Data':t==='opt'?'Optimizer':'Factors'}
          </button>
        ))}
      </div>
      {tab==='market' && <iframe src="/market" className="w-full h-[600px] rounded border" />}
      {tab==='econ' && <iframe src="/econ" className="w-full h-[600px] rounded border" />}
      {tab==='opt' && <iframe src="/optimize" className="w-full h-[800px] rounded border" />}
      {tab==='factors' && <iframe src="/factors" className="w-full h-[600px] rounded border" />}
    </div>
  );
}
