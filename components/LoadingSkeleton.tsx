// components/LoadingSkeleton.tsx
export function CardSkeleton() {
  return (
    <div className="rounded-lg border p-4 bg-neutral-900 animate-pulse">
      <div className="h-4 w-28 bg-neutral-700 rounded mb-3" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-3 bg-neutral-800 rounded" />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-lg border p-4 bg-neutral-900 animate-pulse h-64">
      <div className="h-full w-full bg-neutral-800 rounded" />
    </div>
  );
}