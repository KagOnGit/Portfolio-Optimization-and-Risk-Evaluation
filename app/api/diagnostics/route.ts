import { NextResponse } from 'next/server';

type Metrics = {
  sharpe: number;
  sortino: number;
  var: number;
  cvar: number;
  max_drawdown: number;
};

function fmt(n: number, d = 3) {
  return Number.isFinite(n) ? n.toFixed(d) : '—';
}
function delta(a?: number, b?: number) {
  if (!Number.isFinite(a!) || !Number.isFinite(b!)) return null;
  return b! - a!;
}
function signWord(x: number) {
  if (x > 0) return 'up';
  if (x < 0) return 'down';
  return 'flat';
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const prev: Metrics | null = body?.prev || null;
    const curr: Metrics | null = body?.curr || null;
    const tickers: string[] = Array.isArray(body?.tickers) ? body.tickers : [];
    const range = body?.range || {};

    if (!curr) {
      return NextResponse.json({ summary: 'No current metrics available.', diffs: null });
    }
    if (!prev) {
      return NextResponse.json({
        summary: 'First run for this selection. Metrics initialized.',
        diffs: null,
      });
    }

    const diffs = {
      sharpe: delta(prev.sharpe, curr.sharpe),
      sortino: delta(prev.sortino, curr.sortino),
      var: delta(prev.var, curr.var),
      cvar: delta(prev.cvar, curr.cvar),
      max_drawdown: delta(prev.max_drawdown, curr.max_drawdown),
    };

    const parts: string[] = [];
    if (diffs.sharpe != null) parts.push(`Sharpe ${signWord(diffs.sharpe)} ${fmt(Math.abs(diffs.sharpe))}`);
    if (diffs.max_drawdown != null) parts.push(`MaxDD ${signWord(diffs.max_drawdown)} ${fmt(Math.abs(diffs.max_drawdown), 4)}`);
    if (diffs.var != null) parts.push(`VaR ${signWord(diffs.var)} ${fmt(Math.abs(diffs.var), 4)}`);
    if (diffs.cvar != null) parts.push(`CVaR ${signWord(diffs.cvar)} ${fmt(Math.abs(diffs.cvar), 4)}`);

    // Lightweight heuristic explanation
    const expl: string[] = [];
    if ((diffs.sharpe ?? 0) > 0 && (diffs.var ?? 0) <= 0) expl.push('improved risk-adjusted returns, likely from lower volatility');
    if ((diffs.sharpe ?? 0) < 0 && (diffs.var ?? 0) >= 0) expl.push('weaker risk-adjusted returns, likely from higher day-to-day swings');
    if ((diffs.max_drawdown ?? 0) > 0) expl.push('deeper drawdown risk—consider reducing exposure to the weakest leg (e.g., long duration or lagging sector)');
    if ((diffs.max_drawdown ?? 0) < 0) expl.push('shallower drawdowns—trend stability improving');

    const summary = [
      parts.length ? parts.join('; ') + '.' : 'Metrics moved, see diffs.',
      expl.length ? `Drivers: ${expl.join('; ')}.` : '',
      tickers.length ? `Universe: ${tickers.join(', ')}.` : '',
      range?.start && range?.end ? `Window: ${range.start} → ${range.end}.` : '',
    ].filter(Boolean).join(' ');

    return NextResponse.json({ summary, diffs });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'diagnostics error' }, { status: 500 });
  }
}