export type Shock = { target: 'TICKER'; key: string; pct: number }; // e.g., {target:'TICKER', key:'TLT', pct:-0.03}
export type ScenarioInput = {
  tickers: string[];
  weights: Record<string, number>;   // current weights
  shocks: Shock[];                   // list of shocks
};

export type ScenarioResult = {
  effects: { symbol: string; shock: number; weight: number; contribution: number }[];
  totalImpact: number; // estimated 1-day portfolio return from shocks
};

export function runScenario(inp: ScenarioInput): ScenarioResult {
  const wsum = Object.values(inp.weights).reduce((a,b) => a+b, 0) || 1;
  const normW: Record<string, number> = {};
  for (const t of inp.tickers) normW[t] = (inp.weights[t] ?? 0) / wsum;

  const mapShock: Record<string, number> = {};
  for (const s of inp.shocks) {
    if (s.target === 'TICKER') mapShock[s.key.toUpperCase()] = (mapShock[s.key.toUpperCase()] || 0) + s.pct;
  }

  const effects = inp.tickers.map(symbol => {
    const shock = mapShock[symbol.toUpperCase()] ?? 0;
    const weight = normW[symbol] || 0;
    const contribution = weight * shock;
    return { symbol, shock, weight, contribution };
  });

  const totalImpact = effects.reduce((a, e) => a + e.contribution, 0);
  return { effects, totalImpact };
}