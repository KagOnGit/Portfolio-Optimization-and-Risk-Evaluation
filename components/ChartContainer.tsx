'use client';
import { useState } from 'react';

export default function ChartContainer({ title, series }:{ title:string; series:{x:number;y:number}[] }) {
  const [hover, setHover] = useState<string>('');
  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-neutral-900">
      <div className="mb-2 flex justify-between">
        <h3 className="font-medium">{title}</h3>
        <span className="text-xs text-neutral-500">{hover}</span>
      </div>
      <svg viewBox="0 0 600 200" className="w-full h-48 bg-neutral-50 dark:bg-neutral-800 rounded"
        onMouseMove={(e)=>setHover(`x:${(e.nativeEvent as any).offsetX} y:${(e.nativeEvent as any).offsetY}`)}>
        <polyline fill="none" stroke="rgb(59 130 246)" strokeWidth="2"
          points={series.map(p => `${p.x},${200 - p.y}`).join(' ')} />
      </svg>
    </div>
  );
}
