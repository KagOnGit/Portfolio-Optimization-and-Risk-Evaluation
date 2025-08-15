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
  Legend,
} from 'recharts';

export type RiskPoint = {
  x: number;       // annualized volatility
  y: number;       // annualized return
  label: string;   // ticker symbol
  sharpe: number;  // annualized sharpe
};

// Pick bright, distinct colors per label (fallback to blue)
function colorFor(label: string) {
  const map: Record<string, string> = {
    SPY: '#60a5fa',  // sky-400
    QQQ: '#f472b6',  // pink-400
    TLT: '#34d399',  // emerald-400
    AAPL: '#fbbf24', // amber-400
    MSFT: '#a78bfa', // violet-400
    GLD: '#f59e0b',  // amber-500
    'BTC-USD': '#f87171', // red-400
  };
  return map[label] || '#60a5fa';
}

function Dot(props: any) {
  const { cx, cy, payload } = props;
  const label = payload?.label as string;
  const fill = colorFor(label);
  return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#ffffff" strokeWidth={1.5} />;
}

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
            tick={{ fill: '#d4d4d8' }} // neutral-300
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Return"
            tick={{ fill: '#d4d4d8' }}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {/* Render one Scatter, but with custom Dot that colors each point by label */}
          <Scatter data={points} shape={<Dot />} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}