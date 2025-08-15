// components/FundamentalsCard.tsx
'use client';

type Fundamentals = {
  symbol: string;
  marketCap: number | null;
  pe: number | null;
  forwardPE: number | null;
  dividendYield: number | null; // 0.0065 => 0.65% if that’s how API provides; we’ll format safely
  beta: number | null;
  week52High: number | null;
  week52Low: number | null;
};

export default function FundamentalsCard({
  symbol,
  data,
}: {
  symbol: string;
  data: Partial<Fundamentals> | null | undefined;
}) {
  const fmtNum = (n: number | null | undefined, digits = 2) =>
    Number.isFinite(Number(n)) ? Number(n).toLocaleString(undefined, { maximumFractionDigits: digits }) : '—';

  const fmtPct = (n: number | null | undefined) => {
    if (!Number.isFinite(Number(n))) return '—';
    // Try to guess if already a fraction or a percent
    const val = Number(n);
    const pct = val > 1 ? val : val * 100;
    return `${pct.toFixed(2)}%`;
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="text-lg font-semibold mb-3">{symbol}</div>
      <div className="grid grid-cols-2 gap-y-2">
        <div>Market Cap</div>
        <div className="text-right">{fmtNum(data?.marketCap, 0)}</div>

        <div>P/E</div>
        <div className="text-right">{fmtNum(data?.pe, 2)}</div>

        <div>Forward P/E</div>
        <div className="text-right">{fmtNum(data?.forwardPE, 2)}</div>

        <div>Dividend Yield</div>
        <div className="text-right">{fmtPct(data?.dividendYield)}</div>

        <div>Beta</div>
        <div className="text-right">{fmtNum(data?.beta, 3)}</div>

        <div>52W High</div>
        <div className="text-right">{fmtNum(data?.week52High, 2)}</div>

        <div>52W Low</div>
        <div className="text-right">{fmtNum(data?.week52Low, 2)}</div>
      </div>
    </div>
  );
}