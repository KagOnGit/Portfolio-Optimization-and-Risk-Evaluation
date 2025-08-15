// components/RiskReturnChart.tsx
'use client';

import React, { useMemo, useState } from 'react';

export type RiskPoint = {
  x: number;      // sigma (annualized risk/stdev)
  y: number;      // mu (annualized return)
  label: string;  // ticker
  sharpe?: number;
};

type Props = {
  points: RiskPoint[];
  title?: string;
  height?: number; // px
};

// palette that pops in dark mode
const colorFor = (label: string) => {
  const k = label.toUpperCase();
  if (k === 'SPY') return '#60A5FA';  // blue-400
  if (k === 'QQQ') return '#34D399';  // emerald-400
  if (k === 'TLT') return '#F59E0B';  // amber-500
  return '#94A3B8';                   // slate-400 fallback
};

function niceTicks(min: number, max: number, n = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return { ticks: [min || 0], min, max };
  }
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / n)));
  const err = (n * step) / span;
  const factor = err <= 0.15 ? 10 : err <= 0.35 ? 5 : err <= 0.75 ? 2 : 1;
  const niceStep = step * factor;
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + 1e-9; v += niceStep) ticks.push(+v.toFixed(10));
  return { ticks, min: niceMin, max: niceMax };
}

export default function RiskReturnChart({ points, title = 'Risk vs Return (annualized)', height = 320 }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const dims = { w: 980, h: height, ml: 56, mr: 16, mt: 24, mb: 44 };
  const innerW = dims.w - dims.ml - dims.mr;
  const innerH = dims.h - dims.mt - dims.mb;

  const { domainX, domainY, plotted } = useMemo(() => {
    if (!points || points.length === 0) {
      return {
        domainX: [0, 1],
        domainY: [-0.2, 0.4],
        plotted: [] as RiskPoint[],
      };
    }
    const xs = points.map((p) => p.x).filter(Number.isFinite);
    const ys = points.map((p) => p.y).filter(Number.isFinite);

    // pad 15% so dots aren’t glued to edges
    const minX = Math.max(0, Math.min(...xs));
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padX = (maxX - minX || 0.1) * 0.15;
    const padY = (maxY - minY || 0.1) * 0.20;

    const domainX: [number, number] = [Math.max(0, minX - padX), maxX + padX];
    const domainY: [number, number] = [minY - padY, maxY + padY];

    return { domainX, domainY, plotted: points.slice() };
  }, [points]);

  const scaleX = (x: number) =>
    dims.ml + ((x - domainX[0]) / (domainX[1] - domainX[0])) * innerW;

  const scaleY = (y: number) =>
    dims.mt + (1 - (y - domainY[0]) / (domainY[1] - domainY[0])) * innerH;

  const xt = useMemo(() => niceTicks(domainX[0], domainX[1], 5).ticks, [domainX]);
  const yt = useMemo(() => niceTicks(domainY[0], domainY[1], 5).ticks, [domainY]);

  const formatPct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const formatSharpe = (v?: number) => (Number.isFinite(v as number) ? (v as number).toFixed(2) : '—');

  const empty = !plotted || plotted.length === 0;

  return (
    <div className="rounded-lg border bg-white/5 dark:bg-neutral-900 p-4">
      <div className="text-sm font-medium mb-2">{title}</div>

      {empty ? (
        <div className="h-48 grid place-items-center text-sm text-neutral-500">
          No data for this selection.
        </div>
      ) : (
        <div className="overflow-auto">
          {/* Make SVG responsive horizontally while keeping a nice default width */}
          <svg
            role="img"
            viewBox={`0 0 ${dims.w} ${dims.h}`}
            className="w-full"
            aria-label="Risk versus Return scatterplot"
          >
            {/* grid */}
            <g opacity="0.25">
              {xt.map((x, i) => (
                <line
                  key={`gx-${i}`}
                  x1={scaleX(x)}
                  x2={scaleX(x)}
                  y1={dims.mt}
                  y2={dims.mt + innerH}
                  stroke="#334155"
                  strokeWidth="1"
                />
              ))}
              {yt.map((y, i) => (
                <line
                  key={`gy-${i}`}
                  x1={dims.ml}
                  x2={dims.ml + innerW}
                  y1={scaleY(y)}
                  y2={scaleY(y)}
                  stroke="#334155"
                  strokeWidth="1"
                />
              ))}
            </g>

            {/* axes */}
            <line
              x1={dims.ml}
              x2={dims.ml + innerW}
              y1={dims.mt + innerH}
              y2={dims.mt + innerH}
              stroke="#9CA3AF"
              strokeWidth="1.25"
            />
            <line
              x1={dims.ml}
              x2={dims.ml}
              y1={dims.mt}
              y2={dims.mt + innerH}
              stroke="#9CA3AF"
              strokeWidth="1.25"
            />

            {/* axis labels */}
            <text x={dims.ml + innerW / 2} y={dims.h - 8} textAnchor="middle" className="fill-neutral-300 text-xs">
              Risk (σ)
            </text>
            <text
              x={14}
              y={dims.mt + innerH / 2}
              textAnchor="middle"
              transform={`rotate(-90 14 ${dims.mt + innerH / 2})`}
              className="fill-neutral-300 text-xs"
            >
              Return (μ)
            </text>

            {/* ticks */}
            {xt.map((x, i) => (
              <text
                key={`xt-${i}`}
                x={scaleX(x)}
                y={dims.mt + innerH + 16}
                textAnchor="middle"
                className="fill-neutral-400 text-xs"
              >
                {(x * 100).toFixed(0)}%
              </text>
            ))}
            {yt.map((y, i) => (
              <text
                key={`yt-${i}`}
                x={dims.ml - 8}
                y={scaleY(y) + 4}
                textAnchor="end"
                className="fill-neutral-400 text-xs"
              >
                {(y * 100).toFixed(0)}%
              </text>
            ))}

            {/* points */}
            {plotted.map((p, idx) => {
              const cx = scaleX(p.x);
              const cy = scaleY(p.y);
              const r = hover === idx ? 7 : 6;
              const stroke = '#111827'; // neutral-900 outline for dark bg
              const fill = colorFor(p.label);

              // Tooltip group (rendered when hovered)
              const showTip = hover === idx;
              const tip = `${p.label}  •  S=${formatSharpe(p.sharpe)}  •  μ=${formatPct(p.y)}  •  σ=${formatPct(p.x)}`;

              return (
                <g
                  key={`pt-${idx}`}
                  onMouseEnter={() => setHover(idx)}
                  onMouseLeave={() => setHover(null)}
                  tabIndex={0}
                  aria-label={tip}
                >
                  <circle cx={cx} cy={cy} r={r + 2.5} fill={stroke} opacity="0.85" />
                  <circle cx={cx} cy={cy} r={r} fill={fill} />

                  {/* label near point */}
                  <text x={cx + 10} y={cy - 10} className="fill-neutral-300 text-xs">
                    {p.label}
                  </text>

                  {/* tooltip */}
                  {showTip && (
                    <g>
                      <rect
                        x={cx + 10}
                        y={cy + 8}
                        rx="6"
                        ry="6"
                        width="220"
                        height="42"
                        fill="#0B1220"
                        opacity="0.95"
                        stroke="#1F2937"
                      />
                      <text x={cx + 18} y={cy + 25} className="fill-neutral-200 text-xs">
                        {p.label} — Sharpe {formatSharpe(p.sharpe)}
                      </text>
                      <text x={cx + 18} y={cy + 39} className="fill-neutral-400 text-[11px]">
                        μ {formatPct(p.y)} • σ {formatPct(p.x)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}