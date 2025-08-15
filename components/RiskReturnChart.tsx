// components/RiskReturnChart.tsx
'use client';

type Pt = { x: number; y: number; label: string; sharpe?: number };

function fmtPct(x: number) {
  return `${(x * 100).toFixed(2)}%`;
}

const palette = (label: string) => {
  const L = label.toUpperCase();
  if (L.includes('SPY')) return { fill: '#60A5FA', stroke: '#BFDBFE' };     // blue
  if (L.includes('QQQ')) return { fill: '#34D399', stroke: '#A7F3D0' };     // green
  if (L.includes('TLT')) return { fill: '#F59E0B', stroke: '#FCD34D' };     // amber
  return { fill: '#E5E7EB', stroke: '#9CA3AF' };                            // gray
};

export type RiskPoint = Pt;

export default function RiskReturnChart({ points }: { points: RiskPoint[] }) {
  if (!points || points.length === 0) {
    return (
      <div className="rounded-lg border p-4 bg-neutral-900">
        <div className="font-medium mb-2">Risk vs Return (annualized)</div>
        <div className="h-48 grid place-items-center text-neutral-400 text-sm">
          No data for this selection.
        </div>
      </div>
    );
  }

  // Determine bounds with padding
  const maxX = Math.max(...points.map((p) => p.x), 0.01);
  const maxY = Math.max(...points.map((p) => p.y), 0.01);
  const padX = maxX * 0.2;
  const padY = maxY * 0.2;
  const W = 640, H = 280, L = 48, B = 36, R = 12, T = 16;
  const plotW = W - L - R;
  const plotH = H - T - B;

  const toX = (x: number) => L + (x / (maxX + padX)) * plotW;
  const toY = (y: number) => T + (1 - y / (maxY + padY)) * plotH;

  return (
    <div className="rounded-lg border p-4 bg-neutral-900">
      <div className="font-medium mb-2">Risk vs Return (annualized)</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block">
        {/* axes */}
        <line x1={L} y1={T} x2={L} y2={H - B} stroke="#2A2A2A" />
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="#2A2A2A" />

        {/* grid */}
        {Array.from({ length: 5 }).map((_, i) => {
          const y = T + (i / 4) * plotH;
          return <line key={`gy${i}`} x1={L} y1={y} x2={W - R} y2={y} stroke="#1F2937" strokeDasharray="3 4" />;
        })}

        {/* labels */}
        <text x={L} y={T - 4} fontSize="10" fill="#9CA3AF">Return</text>
        <text x={W - R - 32} y={H - B + 12} fontSize="10" fill="#9CA3AF">Risk (σ)</text>

        {/* points */}
        {points.map((p, i) => {
          const { fill, stroke } = palette(p.label);
          const x = toX(p.x), y = toY(p.y);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={6} fill={fill} stroke={stroke} strokeWidth={2} />
              <text x={x + 9} y={y + 4} fontSize="11" fill="#E5E7EB">{p.label}</text>
              {typeof p.sharpe === 'number' && (
                <text x={x + 9} y={y + 16} fontSize="10" fill="#9CA3AF">
                  {`S=${p.sharpe.toFixed(2)} • μ=${fmtPct(p.y)} • σ=${fmtPct(p.x)}`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}