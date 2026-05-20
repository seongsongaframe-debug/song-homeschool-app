import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function RecentPointsCard({ todayPoints, yesterdayPoints, awaitingPoints, }) {
    if (todayPoints === 0 && yesterdayPoints === 0 && awaitingPoints === 0) {
        return null;
    }
    const max = Math.max(todayPoints, yesterdayPoints, 1);
    const todayPct = (todayPoints / max) * 100;
    const yesterdayPct = (yesterdayPoints / max) * 100;
    const diff = todayPoints - yesterdayPoints;
    const message = buildMessage(todayPoints, yesterdayPoints);
    return (_jsxs("section", { className: "card mb-4 bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-900/30 dark:to-amber-950/40 border-amber-200 dark:border-amber-800", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "font-bold text-amber-800 dark:text-amber-300", children: "\u2728 \uCD5C\uADFC \uC810\uC218" }), awaitingPoints > 0 && (_jsxs("span", { className: "chip", style: { backgroundColor: "#fef3c7", color: "#92400e" }, title: "\uBCF4\uD638\uC790 \uD655\uC778 \uD6C4 \uC9C0\uAE09\uB420 \uC810\uC218", children: ["\u23F3 \uACE7 \uB4E4\uC5B4\uC62C +", awaitingPoints, "p"] }))] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(DayColumn, { label: "\uC5B4\uC81C", points: yesterdayPoints, pct: yesterdayPct, highlight: false }), _jsx(DayColumn, { label: "\uC624\uB298", points: todayPoints, pct: todayPct, highlight: true, diff: diff })] }), _jsx("div", { className: "mt-3 text-sm text-center font-semibold text-amber-900 dark:text-amber-200", children: message })] }));
}
function DayColumn({ label, points, pct, highlight, diff, }) {
    return (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-stone-500 dark:text-stone-400 mb-1", children: label }), _jsxs("div", { className: "flex items-baseline gap-2", children: [_jsxs("span", { className: `font-extrabold ${highlight
                            ? "text-4xl text-brand-600 dark:text-brand-400"
                            : "text-2xl text-stone-700 dark:text-stone-300"}`, children: ["+", points] }), _jsx("span", { className: highlight
                            ? "text-base font-bold text-brand-600 dark:text-brand-400"
                            : "text-sm text-stone-500 dark:text-stone-400", children: "p" }), highlight && typeof diff === "number" && diff > 0 && (_jsxs("span", { className: "text-xs font-bold text-emerald-600 dark:text-emerald-400 ml-1", children: ["\u25B2", diff] })), highlight && typeof diff === "number" && diff < 0 && points > 0 && (_jsxs("span", { className: "text-xs font-medium text-stone-400 dark:text-stone-500 ml-1", children: ["\u25BC", Math.abs(diff)] }))] }), _jsx("div", { className: "mt-1.5 h-2 w-full rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden", children: _jsx("div", { className: `h-full transition-all ${highlight
                        ? "bg-gradient-to-r from-brand-400 to-brand-600"
                        : "bg-stone-400 dark:bg-stone-600"}`, style: { width: `${pct}%` } }) })] }));
}
function buildMessage(today, yesterday) {
    if (today === 0 && yesterday === 0) {
        return "✨ 첫 퀘스트를 끝내고 점수를 시작해보자!";
    }
    if (today === 0 && yesterday > 0) {
        return `💪 어제 +${yesterday}p! 오늘도 한 개부터 시작!`;
    }
    if (today > yesterday) {
        const diff = today - yesterday;
        return yesterday === 0
            ? `🚀 오늘 +${today}p! 좋은 출발!`
            : `🚀 어제보다 +${diff}p 더! 잘했어!`;
    }
    if (today === yesterday) {
        return `🔥 어제와 같은 페이스, 꾸준함이 최고!`;
    }
    // today < yesterday && today > 0
    return `💪 어제 페이스(${yesterday}p)까지 조금만 더!`;
}
