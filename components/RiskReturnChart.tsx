// components/RiskReturnChart.tsx
'use client';

import React, { useMemo, useRef, useState } from 'react';

export type RiskPoint = {
  x: number;     // sigma (annualized stdev)
  y: number;     // mu (annualized return)
  label: string; // symbol
  sharpe?: number;
};

type Props = {
  points: RiskPoint[];
  height?: number; // optional, default 360
};

const PALETTE = [
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#f59e0b', // amber-500
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#22d3ee', // cyan-400
  '#f87171', // red-400
  '#4ade80', // green-400
  '#fb7185', // rose-400
  '#38bdf8', // sky-400
];

function colorFor(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
}
function fmtSharpe(s?: number) {
  if (s == null || !Number.isFinite(s)) return '—';
  // Limit to two decimals, no trailing zeros spam
  return Number(s.toFixed(2)).toString();
}

export default function RiskReturnChart({ points, height = 360 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; p: RiskPoint } | null>(null);

  const dims = { top: 24, right: 20, bottom: 40, left: 52 };
  const width = 0; // We'll read from the container via CSS; SVG is 100% width

  const domain = useMemo(() => {
    if (!points?.length) {
      return {
        xmin: 0, xmax: 0.4, ymin: -0.05, ymax: 0.4,
      };
    }
    const xs = points.map(p => p.x).filter(Number.isFinite);
    const ys = points.map(p => p.y).filter(Number.isFinite);

    const xmin = Math.max(0, Math.min(...xs));
    const xmax = Math.max(...xs);
    const ymin = Math.min(...ys, -0.05); // allow negative return to show
    const ymax = Math.max(...ys);

    // pad by 10% of range
    const padX = (xmax - xmin || 0.1) * 0.1;
    const padY = (ymax - ymin || 0.1) * 0.1;

    return {
      xmin: Math.max(0, xmin - padX),
      xmax: xmax + padX,
      ymin: ymin - padY,
      ymax: ymax + padY,
    };
  }, [points]);

  // scales from data space -> pixel space
  const sx = (x: number, w: number) => {
    const innerW = Math.max(0, w - dims.left - dims.right);
    if (innerW === 0) return dims.left;
    const t = (x - domain.xmin) / (domain.xmax - domain.xmin || 1);
    return dims.left + t * innerW;
  };
  const sy = (y: number, h: number) => {
    const innerH = Math.max(0, h - dims.top - dims.bottom);
    if (innerH === 0) return dims.top;
    const t = (y - domain.ymin) / (domain.ymax - domain.ymin || 1);
    return dims.top + innerH - t * innerH;
  };

  // ticks
  function ticks(min: number, max: number, n = 5) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
    const step = (max - min) / n;
    const arr: number[] = [];
    for (let i = 0; i <= n; i++) arr.push(min + i * step);
    return arr;
  }

  // mouse interactivity
  function handleMove(evt: React.MouseEvent<SVGSVGElement>) {
    if (!containerRef.current) return;
    const svg = evt.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mx = evt.clientX - rect.left;
    const my = evt.clientY - rect.top;

    const w = rect.width;
    const h = rect.height;

    // find nearest point within a radius
    let best: RiskPoint | null = null;
    let bestD = 24; // px radius
    for (const p of points) {
      const px = sx(p.x, w);
      const py = sy(p.y, h);
      const d = Math.hypot(px - mx, py - my);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    if (best) {
      setHover({ x: mx, y: my, p: best });
    } else {
      setHover(null);
    }
  }

  function handleLeave() {
    setHover(null);
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg border bg-white dark:bg-neutral-900 relative"
      style={{ height }}
    >
      <div className="px-4 pt-3 pb-0 text-sm font-medium">Risk vs Return (annualized)</div>

      <svg
        role="img"
        aria-label="Risk versus return scatter"
        className="w-full block"
        height={height}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        {/* background */}
        <rect x={0} y={0} width="100%" height="100%" fill="transparent" />

        {/* axes & grid */}
        <g className="stroke-neutral-800/60 dark:stroke-neutral-700/60">
          {/* we'll compute ticks at render time using actual client width/height via %; SVG needs px so we sample width/height on the fly */}
          <rect x={dims.left} y={dims.top} width={`calc(100% - ${dims.left + dims.right}px)`} height={height - dims.top - dims.bottom} fill="none" />
        </g>

        {/* Using a little trick: render grid/ticks after we know client size */}
        <InnerGrid
          dims={dims}
          height={height}
          domain={domain}
          ticks={ticks}
          fmtPct={fmtPct}
          sx={sx}
          sy={sy}
        />

        {/* points */}
        <InnerPoints
          dims={dims}
          height={height}
          domain={domain}
          sx={sx}
          sy={sy}
          points={points}
        />
      </svg>

      {/* tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute rounded-md border bg-neutral-900 text-neutral-100 text-xs px-2 py-1 shadow-lg"
          style={{
            left: Math.max(8, hover.x + 12),
            top: Math.max(8, hover.y + 12),
            transform: 'translateZ(0)', // crisp text
            whiteSpace: 'nowrap',
          }}
        >
          <div className="font-medium">{hover.p.label}</div>
          <div>μ: {fmtPct(hover.p.y)} • σ: {fmtPct(hover.p.x)}</div>
          <div>Sharpe: {fmtSharpe(hover.p.sharpe)}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Separate components so we can measure actual client width from the SVG element.
 * We use getBBox via a ref to compute tick positions reliably with percentage widths.
 */

function InnerGrid({
  dims, height, domain, ticks, fmtPct, sx, sy,
}: {
  dims: { top: number; right: number; bottom: number; left: number };
  height: number;
  domain: { xmin: number; xmax: number; ymin: number; ymax: number };
  ticks: (min: number, max: number, n?: number) => number[];
  fmtPct: (v: number) => string;
  sx: (x: number, w: number) => number;
  sy: (y: number, h: number) => number;
}) {
  const svgRef = useRef<SVGRectElement>(null);
  const [w, setW] = useState<number | null>(null);

  React.useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setW(el.getBoundingClientRect().width);
    });
    setW(el.getBoundingClientRect().width);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = w ?? 0;

  const xTicks = ticks(domain.xmin, domain.xmax, 5);
  const yTicks = ticks(domain.ymin, domain.ymax, 5);

  return (
    <>
      {/* Hidden rect only to read width via ResizeObserver */}
      <rect ref={svgRef} x={0} y={0} width="100%" height="0" fill="transparent" />

      {/* horizontal grid & y-axis labels */}
      <g className="text-[11px] fill-neutral-500">
        {yTicks.map((ty, i) => {
          const y = sy(ty, height);
          return (
            <g key={`y${i}`}>
              <line
                x1={dims.left}
                x2={width - dims.right}
                y1={y}
                y2={y}
                className="stroke-neutral-800/40 dark:stroke-neutral-700/40"
              />
              <text x={dims.left - 8} y={y + 4} textAnchor="end">
                {fmtPct(ty)}
              </text>
            </g>
          );
        })}
      </g>

      {/* vertical grid & x-axis labels */}
      <g className="text-[11px] fill-neutral-500">
        {xTicks.map((tx, i) => {
          const x = sx(tx, width);
          return (
            <g key={`x${i}`}>
              <line
                x1={x}
                x2={x}
                y1={dims.top}
                y2={height - dims.bottom}
                className="stroke-neutral-800/40 dark:stroke-neutral-700/40"
              />
              <text x={x} y={height - dims.bottom + 16} textAnchor="middle">
                {fmtPct(tx)}
              </text>
            </g>
          );
        })}
      </g>

      {/* axis titles */}
      <text
        x={dims.left + (width - dims.left - dims.right) / 2}
        y={height - 8}
        textAnchor="middle"
        className="fill-neutral-400 text-[12px]"
      >
        Risk (σ)
      </text>
      <text
        x={dims.left}
        y={16}
        textAnchor="start"
        className="fill-neutral-400 text-[12px]"
      >
        Return (μ)
      </text>
    </>
  );
}

function InnerPoints({
  dims, height, domain, sx, sy, points,
}: {
  dims: { top: number; right: number; bottom: number; left: number };
  height: number;
  domain: { xmin: number; xmax: number; ymin: number; ymax: number };
  sx: (x: number, w: number) => number;
  sy: (y: number, h: number) => number;
  points: RiskPoint[];
}) {
  const rectRef = useRef<SVGRectElement>(null);
  const [w, setW] = useState<number | null>(null);

  React.useEffect(() => {
    const el = rectRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.getBoundingClientRect().width));
    setW(el.getBoundingClientRect().width);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = w ?? 0;

  return (
    <>
      {/* Hidden rect to get width */}
      <rect ref={rectRef} x={0} y={0} width="100%" height="0" fill="transparent" />

      {points.map((p, i) => {
        const cx = sx(p.x, width);
        const cy = sy(p.y, height);
        const c = colorFor(p.label);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={6} fill={c} stroke="rgba(255,255,255,0.45)" strokeWidth={1.25} />
            {/* short label only */}
            <text x={cx + 10} y={cy - 8} className="fill-neutral-200 text-[12px]">
              {p.label}
            </text>
          </g>
        );
      })}
    </>
  );
}