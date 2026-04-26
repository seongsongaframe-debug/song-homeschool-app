import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function AchievementRing({ percent, size = 160, stroke = 14, color = "#f97316", label, sublabel, glow = false, }) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(1, percent));
    const dash = c * p;
    return (_jsxs("div", { className: "relative inline-flex items-center justify-center", style: { width: size, height: size }, children: [_jsxs("svg", { width: size, height: size, className: glow ? "animate-pulse drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]" : "", children: [_jsx("circle", { cx: size / 2, cy: size / 2, r: r, stroke: "currentColor", className: "text-stone-200 dark:text-stone-800", strokeWidth: stroke, fill: "none" }), _jsx("circle", { cx: size / 2, cy: size / 2, r: r, stroke: color, strokeWidth: stroke, strokeLinecap: "round", fill: "none", strokeDasharray: `${dash} ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})`, style: { transition: "stroke-dasharray 0.6s ease" } })] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-center", children: [_jsxs("div", { className: "text-3xl font-extrabold", children: [Math.round(p * 100), "%"] }), label && _jsx("div", { className: "text-sm text-stone-500 dark:text-stone-400", children: label }), sublabel && _jsx("div", { className: "text-xs text-stone-400 dark:text-stone-500 mt-0.5", children: sublabel })] })] }));
}
