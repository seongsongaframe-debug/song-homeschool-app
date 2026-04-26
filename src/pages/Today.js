import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { MaterialCard } from "../components/MaterialCard";
import { fmtKDate, todayISO } from "../lib/dates";
import { useDailyLog } from "../store/useDailyLog";
export default function Today() {
    const { students, subjects, materials, assignments, saveAssignments } = useData();
    const [studentId, setStudentId] = useState(students[0]?.id ?? "");
    const date = todayISO();
    const { log, setReflection } = useDailyLog(date, studentId);
    if (!studentId)
        return null;
    const studentAssignments = (assignments[studentId] ?? []).filter((a) => a.active);
    const materialMap = new Map(materials.map((m) => [m.id, m]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const grouped = subjects
        .map((subj) => {
        const items = studentAssignments
            .map((a) => materialMap.get(a.material_id))
            .filter((m) => !!m && m.subject_id === subj.id);
        return { subject: subj, items };
    })
        .filter((g) => g.items.length > 0);
    return (_jsxs("div", { className: "max-w-3xl mx-auto p-4", children: [_jsxs("header", { className: "mb-4", children: [_jsx("h1", { className: "text-2xl font-bold", children: "\uC624\uB298\uC758 \uD559\uC2B5" }), _jsx("p", { className: "text-stone-500", children: fmtKDate(date) })] }), _jsx(StudentTabs, { students: students, selected: studentId, onSelect: setStudentId }), grouped.map(({ subject, items }) => (_jsxs("section", { className: "mb-6", children: [_jsxs("h2", { className: "font-bold text-lg mb-3 flex items-center gap-2", children: [_jsx("span", { children: subject.icon }), _jsx("span", { children: subject.name }), _jsxs("span", { className: "text-xs text-stone-400", children: [items.length, "\uAC1C"] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: items.map((m) => (_jsx(MaterialCard, { material: m, subject: subjectMap.get(m.subject_id), studentId: studentId, onUnlock: async (nextId) => {
                                const list = assignments[studentId] ?? [];
                                if (list.some((a) => a.material_id === nextId))
                                    return;
                                const next = {
                                    ...assignments,
                                    [studentId]: [
                                        ...list,
                                        {
                                            material_id: nextId,
                                            started: todayISO(),
                                            active: true,
                                            priority: 1,
                                        },
                                    ],
                                };
                                await saveAssignments(next);
                            } }, m.id))) })] }, subject.id))), _jsxs("section", { className: "mt-8", children: [_jsx("h2", { className: "font-bold text-lg mb-2", children: "\uC624\uB298\uC758 \uD55C\uB9C8\uB514" }), _jsx("textarea", { className: "input min-h-[80px]", placeholder: "\uC624\uB298 \uAC00\uC7A5 \uC778\uC0C1 \uAE4A\uC5C8\uB358 \uAC83 \uD55C \uC904\uB85C \uC801\uAE30", value: log?.reflection ?? "", onChange: (e) => setReflection(e.target.value) })] }), _jsxs("footer", { className: "mt-8 text-center text-xs text-stone-400", children: ["\uC624\uB298 \uAE30\uB85D \uD56D\uBAA9 ", log?.entries.length ?? 0, "\uAC1C"] })] }));
}
