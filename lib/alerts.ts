export type Rule = {
  symbol: string;
  op: 'lt'|'gt';
  field: 'changePct'|'last';
  value: number; // e.g., -2 for changePct -2%
};

export type RuleEval = Rule & { matched: boolean; current?: number };

export function evaluateRules(quotes: Record<string, { last: number|null; changePct: number|null }>, rules: Rule[]): RuleEval[] {
  return rules.map(r => {
    const q = quotes[r.symbol.toUpperCase()];
    const cur = (q && q[r.field] != null) ? Number(q[r.field]) : undefined;
    if (cur == null || !Number.isFinite(cur)) return { ...r, matched: false, current: undefined };
    const matched = r.op === 'lt' ? cur < r.value : cur > r.value;
    return { ...r, matched, current: cur };
  });
}
