export default function RangeWithValue({ value, onChange, min, max, step = 1, suffix = '' }) {
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-teal-600 h-2" />
      <span className="text-sm font-medium text-navy-800 min-w-[3rem] text-right">{value}{suffix}</span>
    </div>
  );
}
