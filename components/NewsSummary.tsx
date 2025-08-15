'use client';
import { useEffect, useState } from 'react';

export default function NewsSummary({ symbol }: { symbol: string }) {
  const [data, setData] = useState<{ summary: string; bullets: string[] } | null>(null);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/news/${symbol}/summary`, { cache: 'no-store' });
        const j = await r.json();
        setData({ summary: j.summary, bullets: j.bullets });
      } catch (e: any) {
        setErr(e?.message || 'Failed to load summary');
      }
    })();
  }, [symbol]);

  if (err) return <div className="rounded border p-4 text-sm text-red-400">{err}</div>;
  if (!data) return <div className="rounded border p-4 text-sm opacity-60">Summarizing…</div>;

  return (
    <div className="rounded-lg border p-4 bg-white/5">
      <div className="text-sm font-medium mb-2">{symbol} — News Summary</div>
      {data.summary ? <p className="mb-3 text-sm leading-6">{data.summary}</p> : <p className="opacity-60">No summary.</p>}
      {data.bullets?.length ? (
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {data.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      ) : null}
    </div>
  );
}