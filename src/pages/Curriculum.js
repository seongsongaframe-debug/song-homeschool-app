import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { ProgressBar } from "../components/ProgressBar";
import { storage, KEYS } from "../storage";
import { defaultProgress, linearPercent, masteryAvg, } from "../store/useProgress";
import { useEffect } from "react";
import { todayISO } from "../lib/dates";
export default function Curriculum() {
    const { students, subjects, materials, assignments, saveAssignments } = useData();
    const [studentId, setStudentId] = useState(students[0]?.id ?? "");
    const [progressMap, setProgressMap] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const list = (assignments[studentId] ?? []).filter((a) => a.active);
    const materialMap = new Map(materials.map((m) => [m.id, m]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const map = {};
            for (const a of list) {
                const m = materialMap.get(a.material_id);
                if (!m)
                    continue;
                const p = (await storage.read(KEYS.progress(studentId, m.id))) ??
                    defaultProgress(m);
                map[m.id] = p;
            }
            if (!cancelled)
                setProgressMap(map);
        })();
        return () => {
            cancelled = true;
        };
    }, [studentId, assignments, materials]);
    if (!studentId)
        return null;
    const unassignedMaterials = materials.filter((m) => !list.some((a) => a.material_id === m.id));
    return (_jsxs("div", { className: "max-w-3xl mx-auto p-4", children: [_jsxs("header", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold", children: "\uCEE4\uB9AC\uD058\uB7FC" }), _jsx("p", { className: "text-stone-500", children: "\uD65C\uC131 \uAD50\uC7AC\uC640 \uC9C4\uB3C4" })] }), _jsx("button", { className: "btn-primary", onClick: () => setShowAdd((s) => !s), children: "+ \uAD50\uC7AC \uCD94\uAC00" })] }), _jsx(StudentTabs, { students: students, selected: studentId, onSelect: setStudentId }), showAdd && (_jsxs("section", { className: "card mb-4", children: [_jsx("h3", { className: "font-bold mb-2", children: "\uBC30\uC815 \uAC00\uB2A5\uD55C \uAD50\uC7AC" }), unassignedMaterials.length === 0 && (_jsx("div", { className: "text-sm text-stone-500", children: "\uBAA8\uB4E0 \uAD50\uC7AC\uAC00 \uBC30\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4." })), _jsx("div", { className: "space-y-2", children: unassignedMaterials.map((m) => {
                            const subj = subjectMap.get(m.subject_id);
                            return (_jsxs("div", { className: "flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800", children: [_jsx("span", { style: { color: subj?.color }, children: subj?.icon }), _jsxs("div", { className: "flex-1 text-sm", children: [_jsx("div", { className: "font-medium", children: m.name }), _jsxs("div", { className: "text-xs text-stone-500", children: [subj?.name, " \u00B7 ", m.progress_type] })] }), _jsx("button", { className: "btn-ghost text-sm", onClick: async () => {
                                            const next = {
                                                ...assignments,
                                                [studentId]: [
                                                    ...(assignments[studentId] ?? []),
                                                    {
                                                        material_id: m.id,
                                                        started: todayISO(),
                                                        active: true,
                                                        priority: 1,
                                                    },
                                                ],
                                            };
                                            await saveAssignments(next);
                                        }, children: "\uBC30\uC815" })] }, m.id));
                        }) })] })), _jsx("div", { className: "space-y-3", children: list.map((a) => {
                    const m = materialMap.get(a.material_id);
                    if (!m)
                        return null;
                    const subj = subjectMap.get(m.subject_id);
                    const p = progressMap[m.id];
                    const pct = computePercent(m, p);
                    const unlocked = isUnlocked(m, p);
                    return (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsx("span", { className: "w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0", style: { backgroundColor: subj?.color ?? "#64748b" }, children: subj?.icon }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-semibold", children: m.name }), _jsxs("div", { className: "text-xs text-stone-500", children: [subj?.name, " \u00B7 ", labelType(m.progress_type), " \u00B7 \uC2DC\uC791", " ", a.started] })] }), _jsx("button", { className: "text-xs text-stone-400 hover:text-red-500", onClick: async () => {
                                            const next = {
                                                ...assignments,
                                                [studentId]: (assignments[studentId] ?? []).map((x) => x.material_id === m.id ? { ...x, active: false } : x),
                                            };
                                            await saveAssignments(next);
                                        }, children: "\uBE44\uD65C\uC131\uD654" })] }), _jsx("div", { className: "mt-2", children: _jsx(ProgressBar, { value: pct, color: subj?.color ?? "#3b82f6", showLabel: true }) }), unlocked &&
                                m.unlocks &&
                                m.unlocks.some((id) => !list.some((x) => x.material_id === id)) && (_jsxs("div", { className: "mt-2 text-xs text-emerald-700 bg-emerald-50 rounded-md p-2\n                                   dark:text-emerald-300 dark:bg-emerald-900/30", children: ["\uD83C\uDF89 \uB2E4\uC74C \uB2E8\uACC4 \uD65C\uC131\uD654 \uAC00\uB2A5: ", m.unlocks.join(", ")] }))] }, m.id));
                }) }), list.length === 0 && (_jsx("div", { className: "text-center text-stone-400 py-12", children: "\uBC30\uC815\uB41C \uAD50\uC7AC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. + \uAD50\uC7AC \uCD94\uAC00" }))] }));
}
function computePercent(m, p) {
    if (!p)
        return 0;
    if (m.progress_type === "linear" && p.type === "linear")
        return linearPercent(p, m);
    if (m.progress_type === "mastery" && p.type === "mastery")
        return masteryAvg(p);
    if (m.progress_type === "daily_reps" && p.type === "daily_reps")
        return Math.min(1, p.totalDone / 100);
    if (m.progress_type === "free" && p.type === "free")
        return Math.min(1, p.count / 50);
    return 0;
}
function isUnlocked(m, p) {
    if (!p)
        return false;
    if (m.progress_type === "linear" && p.type === "linear") {
        return linearPercent(p, m) >= 0.8;
    }
    if (m.progress_type === "mastery" && p.type === "mastery") {
        return masteryAvg(p) >= (m.threshold ?? 0.8);
    }
    return false;
}
function labelType(t) {
    return {
        linear: "단원형",
        daily_reps: "매일 반복",
        mastery: "정답률 기반",
        free: "자유 입력",
    }[t] ?? t;
}
