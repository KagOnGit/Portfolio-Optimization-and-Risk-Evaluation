// components/DateRangePicker.tsx
export default function DateRangePicker({
  value,
  onChange,
}: {
  value: { start: string; end: string };
  onChange: (v: { start: string; end: string }) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        className="bg-neutral-900 border rounded px-2 py-1 text-sm"
        value={value.start}
        onChange={(e) => onChange({ ...value, start: e.target.value })}
      />
      <span className="text-neutral-400 text-sm">to</span>
      <input
        type="date"
        className="bg-neutral-900 border rounded px-2 py-1 text-sm"
        value={value.end}
        onChange={(e) => onChange({ ...value, end: e.target.value })}
      />
    </div>
  );
}