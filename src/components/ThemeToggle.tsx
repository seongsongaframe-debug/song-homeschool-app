import { useTheme } from "../store/useTheme";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, cycle } = useTheme();
  const icon = theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "🖥️";
  const label = theme === "light" ? "라이트" : theme === "dark" ? "다크" : "시스템";
  return (
    <button
      onClick={cycle}
      aria-label={`테마: ${label} (클릭해서 전환)`}
      className={
        compact
          ? "w-10 h-10 flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
          : "w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-sm"
      }
    >
      <span className="text-lg">{icon}</span>
      {!compact && <span>테마: {label}</span>}
    </button>
  );
}
