// components/RiskReturnChart.tsx
'use client';

import React from 'react';

export type RiskPoint = { x: number; y: number; label: string; sharpe?: number };

export default function RiskReturnChart({ points }: { points: RiskPoint[] }) {
  // Guard: empty state
  if (!points || points.length === 0) {
    return (
      <div className="rounded-lg border p-4 h-72 md:h-80 flex items-center justify-center text-sm text-neutral-400">
        No data for this selection.
      </div>
    );
  }

  // Compute bounds with padding
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.max(0, Math.min(...xs) * 0.9);
  const maxX = Math.max(...xs) * 1.1 || 1;
  const minY = Math.min(...ys) * 0.9;
  const maxY = Math.max(...ys) * 1.1 || 1;

  const W = 900;
  const H = 280;
  const PAD = 40;

  const sx = (x: number) => PAD + ((x - minX) / (maxX - minX || 1)) * (W - PAD * 2);
  const sy = (y: number) => H - PAD - ((y - minY) / (maxY - minY || 1)) * (H - PAD * 2);

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-neutral-900">
      <div className="text-sm font-medium mb-2">Risk vs Return (annualized)</div>
      <div className="w-full overflow-x-auto">
        <svg
          role="img"
          aria-label="Risk vs Return scatter"
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          className="h-72 md:h-80"
        >
          {/* grid */}
          <g opacity={0.2} stroke="currentColor" className="text-neutral-600">
            {Array.from({ length: 4 }).map((_, i) => {
              const y = PAD + (i * (H - PAD * 2)) / 3;
              return <line key={`h${i}`} x1={PAD} y1={y} x2={W - PAD} y2={y} />;
            })}
            {Array.from({ length: 4 }).map((_, i) => {
              const x = PAD + (i * (W - PAD * 2)) / 3;
              return <line key={`v${i}`} y1={PAD} x1={x} y2={H - PAD} x2={x} />;
            })}
          </g>

          {/* axes */}
          <g stroke="currentColor" className="text-neutral-500">
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} />
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} />
          </g>
          <text x={W - PAD} y={H - 10} textAnchor="end" className="text-[10px] fill-current text-neutral-400">
            Risk (σ)
          </text>
          <text
            x={PAD + 6}
            y={PAD - 10}
            textAnchor="start"
            className="text-[10px] fill-current text-neutral-400"
          >
            Return (μ)
          </text>

          {/* points */}
          {points.map((p, i) => {
            const cx = sx(p.x);
            const cy = sy(p.y);
            // pleasant, visible colors on dark: blue, emerald, amber, violet, pink, cyan
            const palette = ['#6ea8fe', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#22d3ee'];
            const fill = palette[i % palette.length];
            return (
              <g key={`${p.label}-${i}`}>
                <circle cx={cx} cy={cy} r={7} fill={fill} stroke="rgba(0,0,0,0.35)" />
                <text
                  x={cx + 10}
                  y={cy - 6}
                  className="text-[11px] fill-current"
                  style={{ fill: '#cbd5e1' }}
                >
                  {p.label}
                </text>
                {Number.isFinite(p.sharpe ?? NaN) && (
                  <text
                    x={cx + 10}
                    y={cy + 10}
                    className="text-[10px]"
                    style={{ fill: '#94a3b8' }}
                  >
                    S={(p.sharpe || 0).toFixed(2)} · μ={(p.y * 100).toFixed(2)}% · σ={(p.x * 100).toFixed(2)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}