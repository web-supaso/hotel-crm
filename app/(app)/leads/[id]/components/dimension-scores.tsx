const COLOR: Record<number, string> = {
  500: "bg-indigo-600",
  400: "bg-indigo-500",
  300: "bg-indigo-400",
  200: "bg-indigo-300",
  100: "bg-indigo-200",
  0: "bg-slate-200",
};

export function dimensionColor(value: number): string {
  if (value >= 76) return COLOR[500];
  if (value >= 51) return COLOR[400];
  if (value >= 30) return COLOR[300];
  if (value >= 10) return COLOR[200];
  return COLOR[0];
}

export function DimensionScore({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: dimensionColor(value) }}
        />
      </div>
    </div>
  );
}