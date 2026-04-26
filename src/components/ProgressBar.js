import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ProgressBar({ value, color = "#3b82f6", height = 8, showLabel = false, }) {
    const pct = Math.max(0, Math.min(1, value));
    return (_jsxs("div", { className: "w-full", children: [_jsx("div", { className: "w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden", style: { height }, children: _jsx("div", { className: "h-full transition-all", style: { width: `${pct * 100}%`, backgroundColor: color } }) }), showLabel && (_jsxs("div", { className: "text-xs text-stone-500 dark:text-stone-400 mt-1", children: [Math.round(pct * 100), "%"] }))] }));
}
