// lib/csv.ts
export function toCSV(rows: (string|number|null|undefined)[][], header?: string[]): string {
  const esc = (v: any) => {
    const s = v==null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  const lines: string[] = [];
  if (header && header.length) lines.push(header.map(esc).join(','));
  for (const r of rows) lines.push(r.map(esc).join(','));
  return lines.join('\n');
}