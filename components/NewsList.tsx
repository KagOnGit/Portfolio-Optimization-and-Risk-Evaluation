'use client';

type Item = { title: string; site?: string; publishedAt?: string; sentiment?: 'pos'|'neg'|'neu' };

function dot(c: 'pos'|'neg'|'neu') {
  return c === 'pos' ? 'bg-emerald-500' : c === 'neg' ? 'bg-red-500' : 'bg-neutral-500';
}

export default function NewsList({ items }: { items: Item[] }) {
  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-neutral-900">
      <div className="font-medium mb-2">News</div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="text-sm flex items-start gap-2">
            <span className={`w-2 h-2 rounded-full mt-1 ${dot(it.sentiment || 'neu')}`} />
            <div className="flex-1">
              <div className="leading-snug">{it.title || '—'}</div>
              <div className="text-xs text-neutral-500">
                {it.site || '—'} {it.publishedAt ? `• ${it.publishedAt}` : ''}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-neutral-500">No recent items.</div>}
      </div>
    </div>
  );
}