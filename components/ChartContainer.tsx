'use client';
import { useMemo, useState } from 'react';

type Pt = { x: number; y: number };

type Props = {
  title: string;
  series: Pt[];
  yFormat?: (n: number) => string; // optional number formatter for y-axis and header
};

export default function ChartContainer({ title, series, yFormat }: Props) {
  const [hover, setHover] = useState<string>('');

  const vb = { w: 600, h: 200, pad: 28 }; // extra left pad for y labels
  const stats = useMemo(() => {
    if (!series?.length) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const xs = series.map(p => p.x);
    const ys = series.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { minX, maxX: maxX === minX ? minX + 1 : maxX, minY, maxY: maxY === minY ? minY + 1 : maxY };
  }, [series]);

  const sx = (x: number) => {
    const { minX, maxX } = stats;
    const t = (x - minX) / (maxX - minX);
    return vb.pad + t * (vb.w - vb.pad * 2);
  };
  const sy = (y: number) => {
    const { minY, maxY } = stats;
    const t = (y - minY) / (maxY - minY);
    // invert y for SVG and add padding
    return vb.pad + (1 - t) * (vb.h - vb.pad * 2);
  };

  const ticks = useMemo(() => {
    const N = 5;
    const arr: { y: number; val: number }[] = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const val = stats.minY + t * (stats.maxY - stats.minY);
      arr.push({ y: sy(val), val });
    }
    return arr;
  }, [stats]);

  const pts = useMemo(() => (series || []).map(p => `${sx(p.x)},${sy(p.y)}`).join(' '), [series, stats]);

  const lastVal = series?.length ? series[series.length - 1].y : null;
  const fmt = (n: number | null) => (n == null ? '—' : (yFormat ? yFormat(n) : new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(n)));

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-neutral-900">
      <div className="mb-2 flex justify-between">
        <h3 className="font-medium">{title}</h3>
        <span className="text-xs text-neutral-500">{hover || fmt(lastVal)}</span>
      </div>
      <svg
        viewBox={`0 0 ${vb.w} ${vb.h}`}
        className="w-full h-48 bg-neutral-50 dark:bg-neutral-800 rounded"
        onMouseMove={(e) => setHover(`x:${(e.nativeEvent as any).offsetX} y:${(e.nativeEvent as any).offsetY}`)}
      >
        {/* grid */}
        <g stroke="currentColor" opacity="0.08">
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <line key={i} x1={vb.pad} x2={vb.w - vb.pad} y1={vb.pad + t * (vb.h - vb.pad * 2)} y2={vb.pad + t * (vb.h - vb.pad * 2)} />
          ))}
        </g>
        {/* y-axis labels */}
        <g>
          {ticks.map((t, i) => (
            <text key={i} x={vb.pad - 6} y={t.y + 4} fontSize={11} textAnchor="end" className="fill-neutral-500">
              {yFormat ? yFormat(t.val) : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(t.val)}
            </text>
          ))}
        </g>
        {series?.length ? (
          <polyline fill="none" stroke="rgb(59 130 246)" strokeWidth="2" points={pts} />
        ) : (
          <text x={vb.w / 2} y={vb.h / 2} textAnchor="middle" className="fill-neutral-500" fontSize={12}>
            No data
          </text>
        )}
      </svg>
    </div>
  );
}
