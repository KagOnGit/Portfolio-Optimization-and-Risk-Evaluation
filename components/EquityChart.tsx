// components/EquityChart.tsx
'use client';

import * as React from 'react';

type Props = {
  title?: string;
  /** cumulative equity values (e.g., start ~1.0) */
  values: number[];
  /** ISO dates aligned to values; used for x-axis tick labels */
  dates?: string[];
  /** height in px (width is responsive) */
  height?: number;
};

function formatDate(d: string) {
  // "YYYY-MM-DD" -> "Jan '25"
  const [y, m, dd] = d.split('-').map((x) => parseInt(x, 10));
  if (!y || !m) return d;
  const dt = new Date(y, (m - 1) || 0, dd || 1);
  return dt.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export default function EquityChart({
  title = 'Portfolio Equity Curve',
  values,
  dates,
  height = 220,
}: Props) {
  const N = values?.length ?? 0;
  const has = N > 1;

  // chart layout
  const pad = { top: 16, right: 16, bottom: 28, left: 40 };
  const W = 1024; // viewBox width (SVG scales responsively)
  const H = height;
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  // value domain + a little padding
  const minV = has ? Math.min(...values) : 0.99;
  const maxV = has ? Math.max(...values) : 1.01;
  const yMin = has ? minV * 0.98 : minV;
  const yMax = has ? maxV * 1.02 : maxV;

  const x = (i: number) => pad.left + (has ? (i / (N - 1)) * innerW : 0);
  const y = (v: number) =>
    pad.top + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

  // line path
  const pathD = has
    ? values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')
    : '';

  // ticks
  const xTicks = React.useMemo(() => {
    if (!has) return [];
    const count = 6; // ≈6 ticks
    const idxs = Array.from({ length: Math.min(count, N) }, (_, k) =>
      Math.round((k / (Math.min(count, N) - 1)) * (N - 1)),
    );
    return Array.from(new Set(idxs)).map((i) => ({
      i,
      x: x(i),
      label: dates?.[i] ? formatDate(dates[i]) : `${i}`,
    }));
  }, [N, dates]); // eslint-disable-line react-hooks/exhaustive-deps

  const yTicks = React.useMemo(() => {
    if (!has) return [];
    const count = 5;
    return Array.from({ length: count }, (_, k) => {
      const v = yMin + (k / (count - 1)) * (yMax - yMin);
      return { v, y: y(v), label: v.toFixed(2) };
    });
  }, [yMin, yMax]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-lg border bg-neutral-900/40">
      <div className="px-4 pt-3 pb-1 text-sm font-medium text-neutral-200">
        {title}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={title}
        className="w-full h-[220px] md:h-[260px]"
        preserveAspectRatio="none"
      >
        {/* grid y */}
        {yTicks.map((t, i) => (
          <line
            key={`gy-${i}`}
            x1={pad.left}
            y1={t.y}
            x2={W - pad.right}
            y2={t.y}
            stroke="currentColor"
            opacity={0.15}
            strokeWidth={1}
          />
        ))}
        {/* grid x */}
        {xTicks.map((t, i) => (
          <line
            key={`gx-${i}`}
            x1={t.x}
            y1={pad.top}
            x2={t.x}
            y2={H - pad.bottom}
            stroke="currentColor"
            opacity={0.08}
            strokeWidth={1}
          />
        ))}

        {/* axes */}
        <line
          x1={pad.left}
          y1={H - pad.bottom}
          x2={W - pad.right}
          y2={H - pad.bottom}
          stroke="currentColor"
          opacity={0.25}
          strokeWidth={1.25}
        />
        <line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={H - pad.bottom}
          stroke="currentColor"
          opacity={0.25}
          strokeWidth={1.25}
        />

        {/* axis labels */}
        {xTicks.map((t, i) => (
          <text
            key={`xl-${i}`}
            x={t.x}
            y={H - 6}
            fontSize={12}
            textAnchor="middle"
            className="fill-neutral-400"
          >
            {t.label}
          </text>
        ))}
        {yTicks.map((t, i) => (
          <text
            key={`yl-${i}`}
            x={pad.left - 6}
            y={t.y + 4}
            fontSize={12}
            textAnchor="end"
            className="fill-neutral-400"
          >
            {t.label}
          </text>
        ))}

        {/* line or empty message */}
        {has ? (
          <path
            d={pathD}
            fill="none"
            stroke="rgb(59,130,246)" /* Tailwind blue-500 */
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <text
            x={W / 2}
            y={H / 2}
            textAnchor="middle"
            className="fill-neutral-500"
            fontSize={13}
          >
            No data for this selection.
          </text>
        )}
      </svg>
    </div>
  );
}