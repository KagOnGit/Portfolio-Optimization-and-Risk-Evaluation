export default function KpiCard({ label, value }: { label: string; value: string|number }) {
  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-neutral-900">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
