// lib/colors.ts
// Bright, dark-mode-friendly colors per common ticker.
// Add more symbols as needed.
const COLOR_MAP: Record<string, string> = {
  SPY: '#60a5fa',     // sky-400
  QQQ: '#f472b6',     // pink-400
  TLT: '#34d399',     // emerald-400
  AAPL: '#fbbf24',    // amber-400
  MSFT: '#a78bfa',    // violet-400
  GLD: '#f59e0b',     // amber-500
  'BTC-USD': '#f87171', // red-400
};

export function colorFor(label: string): string {
  return COLOR_MAP[label?.toUpperCase?.() || ''] || '#60a5fa';
}