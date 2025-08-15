// components/RiskReturnChart.tsx
'use client';

import { useMemo } from 'react';

export type RiskPoint = { x: number; y: number; label: string; sharpe?: number };

function fmtPct(n: number) { return `${(n * 100).toFixed(0)}%`; }
const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#22d3ee', '#f87171'];

export default function RiskReturnChart({ points }: { points: RiskPoint[] }) {
  const sized = useMemo(() => {
    if (!points?.length) return { pts: [], xMax: 0.3, yMax: 0.3 };
    const xMax = Math.max(0.2, Math.max(...points.map(p => p.x)) * 1.25);
    const yMax = Math.max(0.2, Math.max(...points.map(p => p.y)) * 1.25);
    return { pts: points, xMax, yMax };
  }, [points]);

  if (!sized.pts.length) {
    return (
      <div className="rounded-lg border bg-white/5 dark:bg-neutral-900 p-4 h-[320px] grid place-items-center text-neutral-500">
        No data for this selection.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white/5 dark:bg-neutral-900 p-4">
      <div className="text-sm font-medium mb-2">Risk vs Return (annualized)</div>
      <svg className="w-full h-[360px]" viewBox="0 0 800 360">
        <line x1="64" y1="24" x2="64" y2="320" stroke="rgba(255,255,255,0.15)" />
        <line x1="64" y1="320" x2="780" y2="320" stroke="rgba(255,255,255,0.15)" />
        {Array.from({ length: 5 }).map((_, i) => {
          const y = 320 - (i + 1) * (280 / 5);
          return <line key={i} x1="64" y1={y} x2="780" y2={y} stroke="rgba(255,255,255,0.08)" />;
        })}
        {Array.from({ length: 5 }).map((_, i) => {
          const x = 64 + (i + 1) * ((780 - 64) / 5);
          return <line key={i} x1={x} y1="24" x2={x} y2="320" stroke="rgba(255,255,255,0.08)" />;
        })}
        <text x="20" y="24" fill="#9ca3af" fontSize="10">Return (μ)</text>
        <text x="720" y="352" fill="#9ca3af" fontSize="10">Risk (σ)</text>

        {sized.pts.map((p, idx) => {
          const cx = 64 + (p.x / sized.xMax) * (780 - 64);
          const cy = 320 - (p.y / sized.yMax) * 280;
          const c = COLORS[idx % COLORS.length];
          const label = `${p.label} • S=${(p.sharpe ?? 0).toFixed(2)} • μ=${(p.y*100).toFixed(2)}% • σ=${(p.x*100).toFixed(2)}%`;
          return (
            <g key={p.label}>
              <circle cx={cx} cy={cy} r="6" fill={c} />
              <text x={cx + 10} y={cy - 6} fill="#d1d5db" fontSize="11">{p.label}</text>
              <text x={cx + 10} y={cy + 9} fill="#9ca3af" fontSize="10">{label.replace(`${p.label} • `,'')}</text>
            </g>
          );
        })}

        {Array.from({ length: 5 }).map((_, i) => {
          const xVal = ((i + 1) * sized.xMax) / 5;
          const x = 64 + (xVal / sized.xMax) * (780 - 64);
          return <text key={`xt${i}`} x={x - 8} y="338" fill="#9ca3af" fontSize="10">{fmtPct(xVal)}</text>;
        })}
        {Array.from({ length: 5 }).map((_, i) => {
          const yVal = ((i + 1) * sized.yMax) / 5;
          const y = 320 - (yVal / sized.yMax) * 280;
          return <text key={`yt${i}`} x="8" y={y + 4} fill="#9ca3af" fontSize="10">{fmtPct(yVal)}</text>;
        })}
      </svg>
    </div>
  );
}