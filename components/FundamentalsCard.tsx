'use client';

type Fundamentals = {
  marketCap?: number | null;
  pe?: number | null;
  forwardPE?: number | null;
  dividendYield?: number | null;
  beta?: number | null;
  week52High?: number | null;
  week52Low?: number | null;
};

export default function FundamentalsCard({ symbol, data }: { symbol: string; data: Fundamentals }) {
  const n = (x?: number | null, d = '—') => (x == null || !Number.isFinite(x) ? d : x.toLocaleString());
  const pct = (x?: number | null) => (x == null || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(2)}%`);

  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-neutral-900">
      <div className="font-medium mb-2">{symbol}</div>
      <div className="text-sm grid grid-cols-2 gap-2">
        <div>Market Cap</div><div className="text-right">{n(data.marketCap)}</div>
        <div>P/E</div><div className="text-right">{n(data.pe)}</div>
        <div>Forward P/E</div><div className="text-right">{n(data.forwardPE)}</div>
        <div>Dividend Yield</div><div className="text-right">{pct(data.dividendYield)}</div>
        <div>Beta</div><div className="text-right">{n(data.beta)}</div>
        <div>52W High</div><div className="text-right">{n(data.week52High)}</div>
        <div>52W Low</div><div className="text-right">{n(data.week52Low)}</div>
      </div>
    </div>
  );
}