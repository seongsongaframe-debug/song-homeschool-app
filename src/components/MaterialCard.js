import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { dailyRepsToday, linearPercent, masteryAvg, useProgress, } from "../store/useProgress";
import { ProgressBar } from "./ProgressBar";
import { useDailyLog } from "../store/useDailyLog";
import { todayISO } from "../lib/dates";
export function MaterialCard({ material, subject, studentId, onUnlock }) {
    const { progress, save } = useProgress(studentId, material);
    const { append } = useDailyLog(todayISO(), studentId);
    const today = todayISO();
    const color = subject?.color ?? "#64748b";
    if (!progress)
        return null;
    const header = (_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold", style: { backgroundColor: color }, "aria-label": subject?.name, children: subject?.icon ?? "•" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-semibold truncate", children: material.name }), material.description && (_jsx("div", { className: "text-xs text-stone-500 truncate", children: material.description }))] }), _jsx("span", { className: "chip", style: { backgroundColor: color + "22", color }, children: labelOfType(material.progress_type) })] }));
    if (material.progress_type === "linear" && progress.type === "linear") {
        const pct = linearPercent(progress, material);
        return (_jsxs("div", { className: "card", children: [header, _jsx(ProgressBar, { value: pct, color: color, showLabel: true }), _jsx("div", { className: "mt-3 space-y-2", children: material.structure.units.map((u) => {
                        const done = progress.completed[u.id] ?? 0;
                        return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex-1 text-sm", children: u.name }), _jsx("button", { className: "btn-ghost px-2 py-1 text-sm", onClick: async () => {
                                        const next = Math.max(0, done - 1);
                                        await save({
                                            ...progress,
                                            completed: { ...progress.completed, [u.id]: next },
                                        });
                                    }, "aria-label": `${u.name} 감소`, children: "\u2212" }), _jsxs("div", { className: "w-14 text-center text-sm tabular-nums", children: [done, "/", u.items] }), _jsx("button", { className: "btn-primary px-2 py-1 text-sm", onClick: async () => {
                                        const next = Math.min(u.items, done + 1);
                                        await save({
                                            ...progress,
                                            completed: { ...progress.completed, [u.id]: next },
                                        });
                                        await append({
                                            material_id: material.id,
                                            unit_id: u.id,
                                            items_done: 1,
                                        });
                                    }, "aria-label": `${u.name} 증가`, children: "+" })] }, u.id));
                    }) }), material.unlocks && pct >= 0.8 && (_jsxs("button", { className: "btn-primary mt-3 w-full", onClick: () => material.unlocks?.forEach((id) => onUnlock?.(id)), children: ["\uD83D\uDD13 \uB2E4\uC74C \uB2E8\uACC4 \uD65C\uC131\uD654 (", material.unlocks.length, "\uAC1C)"] }))] }));
    }
    if (material.progress_type === "daily_reps" && progress.type === "daily_reps") {
        const todayDone = dailyRepsToday(progress, today);
        const target = material.daily_target;
        const pct = target > 0 ? todayDone / target : 0;
        return (_jsxs("div", { className: "card", children: [header, _jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("div", { className: "text-sm text-stone-500", children: ["\uC624\uB298 \uBAA9\uD45C ", _jsxs("span", { className: "font-semibold text-stone-700", children: [target, material.unit] })] }), _jsxs("div", { className: "text-sm tabular-nums", children: [_jsx("span", { className: "font-bold text-lg", children: todayDone }), _jsxs("span", { className: "text-stone-400", children: [" / ", target, material.unit] })] })] }), _jsx(ProgressBar, { value: pct, color: color }), _jsxs("div", { className: "flex gap-2 mt-3", children: [_jsx("button", { className: "btn-ghost flex-1", onClick: async () => {
                                const next = Math.max(0, todayDone - 1);
                                await save({
                                    ...progress,
                                    totalDone: Math.max(0, progress.totalDone - 1),
                                    byDate: { ...progress.byDate, [today]: next },
                                });
                            }, children: "\u22121" }), _jsxs("button", { className: "btn-primary flex-1", onClick: async () => {
                                const next = todayDone + 1;
                                await save({
                                    ...progress,
                                    totalDone: progress.totalDone + 1,
                                    byDate: { ...progress.byDate, [today]: next },
                                });
                                await append({ material_id: material.id, amount: 1 });
                            }, children: ["+1", material.unit] })] }), _jsxs("div", { className: "text-xs text-stone-400 mt-2", children: ["\uB204\uC801 ", progress.totalDone, material.unit] })] }));
    }
    if (material.progress_type === "mastery" && progress.type === "mastery") {
        const avg = masteryAvg(progress);
        const last = progress.attempts[progress.attempts.length - 1];
        return (_jsx(MasteryPanel, { material: material, color: color, avg: avg, last: last, progress: progress, save: save, append: append, header: header, onUnlock: onUnlock }));
    }
    if (material.progress_type === "free" && progress.type === "free") {
        return (_jsxs("div", { className: "card", children: [header, _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-sm text-stone-500", children: "\uC790\uC720 \uC785\uB825 \uD56D\uBAA9" }), _jsxs("div", { className: "text-sm", children: ["\uB204\uC801 ", _jsx("span", { className: "font-bold", children: progress.count }), "\uAC74"] })] }), _jsx("button", { className: "btn-ghost w-full mt-3", onClick: async () => {
                        await save({ ...progress, count: progress.count + 1 });
                        await append({ material_id: material.id, amount: 1 });
                    }, children: "+1 \uD56D\uBAA9 (\uAC04\uB2E8 \uCE74\uC6B4\uD2B8)" }), _jsx("div", { className: "text-xs text-stone-400 mt-2", children: "\uC0C1\uC138 \uC785\uB825\uC740 \uBA54\uB274\uC5D0\uC11C (\uC608: \uC601\uC5B4 \uB3C5\uC11C \u2192 AR \uC785\uB825)" })] }));
    }
    return null;
}
function MasteryPanel({ material, color, avg, last, progress, save, append, header, onUnlock, }) {
    const [score, setScore] = useState(0);
    const [total, setTotal] = useState(10);
    return (_jsxs("div", { className: "card", children: [header, _jsxs("div", { className: "flex items-center gap-3 text-sm mb-3", children: [_jsxs("div", { children: ["\uCD5C\uADFC \uD3C9\uADE0", " ", _jsxs("span", { className: "font-bold", children: [Math.round(avg * 100), "%"] }), _jsxs("span", { className: "text-stone-400 text-xs", children: [" (\uBAA9\uD45C ", Math.round((material.threshold ?? 0.8) * 100), "%)"] })] }), last && (_jsxs("div", { className: "text-stone-500", children: ["\uB9C8\uC9C0\uB9C9: ", last.score, "/", last.total] }))] }), _jsx(ProgressBar, { value: avg, color: color }), _jsxs("div", { className: "flex items-center gap-2 mt-3", children: [_jsx("input", { className: "input flex-1", type: "number", value: score, min: 0, onChange: (e) => setScore(Number(e.target.value)), placeholder: "\uC810\uC218" }), _jsx("span", { children: "/" }), _jsx("input", { className: "input flex-1", type: "number", value: total, min: 1, onChange: (e) => setTotal(Number(e.target.value)), placeholder: "\uB9CC\uC810" }), _jsx("button", { className: "btn-primary", onClick: async () => {
                            const nextAttempts = [
                                ...progress.attempts,
                                { date: todayISO(), score, total },
                            ];
                            const nextAvg = masteryAvg({
                                type: "mastery",
                                attempts: nextAttempts,
                                unlocked: progress.unlocked,
                            });
                            const threshold = material.threshold ?? 0.8;
                            const wasUnlocked = progress.unlocked;
                            const nowUnlocked = nextAvg >= threshold;
                            await save({
                                ...progress,
                                attempts: nextAttempts,
                                unlocked: nowUnlocked,
                            });
                            await append({
                                material_id: material.id,
                                score,
                                total,
                            });
                            if (!wasUnlocked && nowUnlocked && material.unlocks) {
                                for (const id of material.unlocks)
                                    onUnlock?.(id);
                            }
                            setScore(0);
                        }, children: "\uAE30\uB85D" })] })] }));
}
function labelOfType(t) {
    return {
        linear: "단원형",
        daily_reps: "매일",
        mastery: "정답률",
        free: "자유",
    }[t] ?? t;
}
