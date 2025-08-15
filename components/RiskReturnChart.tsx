// components/RiskReturnChart.tsx
'use client';

import { useMemo } from 'react';

export type RiskPoint = { x: number; y: number; label: string; sharpe?: number };

const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#22d3ee', '#f87171'];

function fmtPct01(n: number) {
  // n is 0..1 (e.g., 0.24 == 24%)
  return `${(n * 100).toFixed(0)}%`;
}

export default function RiskReturnChart({ points }: { points: RiskPoint[] }) {
  const sized = useMemo(() => {
    if (!points?.length) {
      return {
        pts: [] as RiskPoint[],
        // defaults so axes render nicely when empty
        xMin: 0,
        xMax: 0.3,
        yMin: -0.2,
        yMax: 0.3,
      };
    }

    const xMaxRaw = Math.max(...points.map((p) => p.x), 0.05);
    const yMaxRaw = Math.max(...points.map((p) => p.y), 0.05);
    const yMinRaw = Math.min(...points.map((p) => p.y), -0.05);

    // add headroom/footroom
    const xMin = 0; // risk cannot go negative
    const xMax = Math.max(0.1, xMaxRaw * 1.25);

    // allow for negative returns — this is the fix
    const yCenterSpan = yMaxRaw - yMinRaw || 0.1;
    const yPad = yCenterSpan * 0.25;
    const yMin = Math.min(0, yMinRaw - yPad);
    const yMax = Math.max(0.1, yMaxRaw + yPad);

    return { pts: points, xMin, xMax, yMin, yMax };
  }, [points]);

  // Empty state
  if (!sized.pts.length) {
    return (
      <div className="rounded-lg border bg-white/5 dark:bg-neutral-900 p-4 h-[320px] grid place-items-center text-neutral-500">
        No data for this selection.
      </div>
    );
  }

  // Plot area geometry
  const W = 800;
  const H = 340;
  const L = 64;
  const R = 16;
  const T = 20;
  const B = 36;
  const innerW = W - L - R;
  const innerH = H - T - B;

  const xScale = (x: number) =>
    L + ((x - sized.xMin) / (sized.xMax - sized.xMin)) * innerW;

  const yScale = (y: number) =>
    T + (1 - (y - sized.yMin) / (sized.yMax - sized.yMin)) * innerH;

  // grid ticks (5)
  const ticks = 5;
  const xTicks = Array.from({ length: ticks }, (_, i) => sized.xMin + ((i + 1) * (sized.xMax - sized.xMin)) / ticks);
  const yTicks = Array.from({ length: ticks }, (_, i) => sized.yMin + ((i + 1) * (sized.yMax - sized.yMin)) / ticks);

  return (
    <div className="rounded-lg border bg-white/5 dark:bg-neutral-900 p-4">
      <div className="text-sm font-medium mb-2">Risk vs Return (annualized)</div>
      <svg className="w-full h-[360px]" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Risk versus return scatter plot">
        {/* Axes */}
        <line x1={L} y1={T} x2={L} y2={H - B} stroke="rgba(255,255,255,0.18)" />
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="rgba(255,255,255,0.18)" />

        {/* Grid lines */}
        {yTicks.map((yv, i) => (
          <line
            key={`gy${i}`}
            x1={L}
            y1={yScale(yv)}
            x2={W - R}
            y2={yScale(yv)}
            stroke="rgba(255,255,255,0.08)"
          />
        ))}
        {xTicks.map((xv, i) => (
          <line
            key={`gx${i}`}
            x1={xScale(xv)}
            y1={T}
            x2={xScale(xv)}
            y2={H - B}
            stroke="rgba(255,255,255,0.08)"
          />
        ))}

        {/* Axis labels */}
        <text x={12} y={T + 10} fill="#9ca3af" fontSize="11">Return (μ)</text>
        <text x={W - 70} y={H - 8} fill="#9ca3af" fontSize="11">Risk (σ)</text>

        {/* Tick labels */}
        {xTicks.map((xv, i) => (
          <text
            key={`xt${i}`}
            x={xScale(xv) - 10}
            y={H - 10}
            fill="#9ca3af"
            fontSize="10"
          >
            {fmtPct01(xv)}
          </text>
        ))}
        {yTicks.map((yv, i) => (
          <text
            key={`yt${i}`}
            x={12}
            y={yScale(yv) + 3}
            fill="#9ca3af"
            fontSize="10"
          >
            {fmtPct01(yv)}
          </text>
        ))}

        {/* Points */}
        {sized.pts.map((p, idx) => {
          const cx = xScale(p.x);
          const cy = yScale(p.y);
          const color = COLORS[idx % COLORS.length];
          const meta = `S=${(p.sharpe ?? 0).toFixed(2)} • μ=${(p.y * 100).toFixed(2)}% • σ=${(p.x * 100).toFixed(2)}%`;
          return (
            <g key={p.label}>
              <circle cx={cx} cy={cy} r="6" fill={color} />
              <text x={cx + 10} y={cy - 6} fill="#e5e7eb" fontSize="11">{p.label}</text>
              <text x={cx + 10} y={cy + 9} fill="#9ca3af" fontSize="10">{meta}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}