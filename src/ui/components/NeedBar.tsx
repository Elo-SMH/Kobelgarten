interface NeedBarProps {
  label: string;
  /** 0..1 */
  value: number;
  colorClass: string;
}

export function NeedBar({ label, value, colorClass }: NeedBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-hazel-500">
        <span>{label}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-cream-200">
        <div
          className={`h-full rounded-full ${colorClass} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
