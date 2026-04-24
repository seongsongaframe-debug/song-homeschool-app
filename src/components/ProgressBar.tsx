interface Props {
  value: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  color = "#3b82f6",
  height = 8,
  showLabel = false,
}: Props) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="w-full">
      <div
        className="w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden"
        style={{ height }}
      >
        <div
          className="h-full transition-all"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">{Math.round(pct * 100)}%</div>
      )}
    </div>
  );
}
