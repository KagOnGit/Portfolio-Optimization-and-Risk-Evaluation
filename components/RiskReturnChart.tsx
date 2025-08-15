// components/RiskReturnChart.tsx
'use client';

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export type RiskPoint = {
  x: number;       // annualized volatility
  y: number;       // annualized return
  label: string;   // ticker symbol
  sharpe: number;  // annualized sharpe
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload as RiskPoint | undefined;
  if (!p) return null;

  return (
    <div className="rounded-md border bg-neutral-900 p-2 text-xs shadow">
      <div className="font-medium mb-1">{p.label}</div>
      <div>Return: {(p.y * 100).toFixed(2)}%</div>
      <div>Volatility: {(p.x * 100).toFixed(2)}%</div>
      <div>Sharpe: {p.sharpe.toFixed(2)}</div>
    </div>
  );
}

export default function RiskReturnChart({ points }: { points: RiskPoint[] }) {
  return (
    <div className="rounded-lg border p-4 bg-neutral-900 h-72">
      <div className="font-medium mb-2">Risk vs Return (annualized)</div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="Volatility"
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Return"
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={points} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}