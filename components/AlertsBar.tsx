'use client';
export default function AlertsBar({ items }: { items: { text: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-lg border p-3 bg-red-950/40 text-red-300">
      <div className="text-sm font-medium mb-1">Alerts</div>
      <ul className="text-sm list-disc pl-5">
        {items.map((it, i) => <li key={i}>{it.text}</li>)}
      </ul>
    </div>
  );
}