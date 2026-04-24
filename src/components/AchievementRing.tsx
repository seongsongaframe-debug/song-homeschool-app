interface Props {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  sublabel?: string;
  glow?: boolean;
}

export function AchievementRing({
  percent,
  size = 160,
  stroke = 14,
  color = "#f97316",
  label,
  sublabel,
  glow = false,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, percent));
  const dash = c * p;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className={glow ? "animate-pulse drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]" : ""}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          className="text-stone-200 dark:text-stone-800"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-extrabold">{Math.round(p * 100)}%</div>
        {label && <div className="text-sm text-stone-500 dark:text-stone-400">{label}</div>}
        {sublabel && <div className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}
