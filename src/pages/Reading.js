import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { storage, KEYS } from "../storage";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { todayISO } from "../lib/dates";
export default function Reading() {
    const { students } = useData();
    const [studentId, setStudentId] = useState(students[0]?.id ?? "");
    const [entries, setEntries] = useState([]);
    const [title, setTitle] = useState("");
    const [arLevel, setArLevel] = useState(2.0);
    const [rating, setRating] = useState(4);
    const [note, setNote] = useState("");
    useEffect(() => {
        if (!studentId)
            return;
        storage.read(KEYS.reading(studentId)).then((d) => {
            setEntries(d ?? []);
        });
    }, [studentId]);
    const sorted = useMemo(() => [...entries].sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0), [entries]);
    const avgAR = useMemo(() => {
        if (entries.length === 0)
            return 0;
        return entries.reduce((s, e) => s + e.ar_level, 0) / entries.length;
    }, [entries]);
    const recommendedRange = useMemo(() => {
        if (entries.length < 3)
            return [arLevel, arLevel + 0.5];
        const recent = sorted.slice(0, 5);
        const recentAvg = recent.reduce((s, e) => s + e.ar_level, 0) / recent.length;
        return [recentAvg, recentAvg + 0.5];
    }, [sorted, entries.length, arLevel]);
    const series = useMemo(() => {
        return [...entries]
            .sort((a, b) => (a.date < b.date ? -1 : 1))
            .map((e, i) => ({ x: i, y: e.ar_level, label: e.title }));
    }, [entries]);
    if (!studentId)
        return null;
    async function add() {
        if (!title.trim())
            return;
        const entry = {
            id: crypto.randomUUID(),
            student_id: studentId,
            date: todayISO(),
            title: title.trim(),
            ar_level: arLevel,
            rating,
            note: note.trim() || undefined,
        };
        const next = [...entries, entry];
        setEntries(next);
        await storage.write(KEYS.reading(studentId), next);
        setTitle("");
        setNote("");
    }
    async function remove(id) {
        const next = entries.filter((e) => e.id !== id);
        setEntries(next);
        await storage.write(KEYS.reading(studentId), next);
    }
    return (_jsxs("div", { className: "max-w-3xl mx-auto p-4", children: [_jsxs("header", { className: "mb-4", children: [_jsx("h1", { className: "text-2xl font-bold", children: "\uC601\uC5B4 \uB3C5\uC11C (AR \uD2B8\uB798\uCEE4)" }), _jsxs("p", { className: "text-stone-500", children: ["\uB204\uC801 ", entries.length, "\uAD8C \u00B7 \uD3C9\uADE0 AR ", avgAR.toFixed(1)] })] }), _jsx(StudentTabs, { students: students, selected: studentId, onSelect: setStudentId }), _jsxs("section", { className: "card mb-4", children: [_jsx("h3", { className: "font-bold mb-2", children: "\uC0C8 \uCC45 \uAE30\uB85D" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: [_jsx("input", { className: "input md:col-span-2", placeholder: "\uCC45 \uC81C\uBAA9 (\uC608: Magic Tree House #1)", value: title, onChange: (e) => setTitle(e.target.value) }), _jsxs("label", { className: "text-sm", children: ["AR \uC9C0\uC218", _jsx("input", { className: "input", type: "number", min: 0, max: 13, step: 0.1, value: arLevel, onChange: (e) => setArLevel(Number(e.target.value)) })] }), _jsxs("label", { className: "text-sm", children: ["\uBCC4\uC810 (1~5)", _jsx("input", { className: "input", type: "number", min: 1, max: 5, step: 1, value: rating, onChange: (e) => setRating(Number(e.target.value)) })] }), _jsx("input", { className: "input md:col-span-2", placeholder: "\uD55C\uC904 \uBA54\uBAA8 (\uC120\uD0DD)", value: note, onChange: (e) => setNote(e.target.value) })] }), _jsx("button", { className: "btn-primary w-full mt-3", onClick: add, children: "+ \uCD94\uAC00" }), _jsxs("div", { className: "text-xs text-stone-500 mt-2", children: ["\uCD94\uCC9C \uB2E4\uC74C AR \uAD6C\uAC04:", " ", _jsxs("span", { className: "font-semibold text-stone-700 dark:text-stone-200", children: [recommendedRange[0].toFixed(1), " ~ ", recommendedRange[1].toFixed(1)] })] })] }), _jsxs("section", { className: "card mb-4", children: [_jsx("h3", { className: "font-bold mb-2", children: "AR \uCD94\uC774" }), _jsx(ARChart, { series: series })] }), _jsxs("section", { children: [_jsx("h3", { className: "font-bold mb-2", children: "\uB3C5\uC11C \uAE30\uB85D" }), _jsxs("div", { className: "space-y-2", children: [sorted.map((e) => (_jsxs("div", { className: "card flex items-center gap-3", children: [_jsxs("div", { className: "w-12 text-center", children: [_jsx("div", { className: "text-xs text-stone-400", children: "AR" }), _jsx("div", { className: "font-bold text-lg", children: e.ar_level.toFixed(1) })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-medium truncate", children: e.title }), _jsxs("div", { className: "text-xs text-stone-500", children: [e.date, " \u00B7 ", "⭐".repeat(e.rating ?? 0)] }), e.note && _jsx("div", { className: "text-sm text-stone-600 dark:text-stone-300 mt-1", children: e.note })] }), _jsx("button", { className: "text-xs text-stone-400 hover:text-red-500", onClick: () => remove(e.id), children: "\uC0AD\uC81C" })] }, e.id))), sorted.length === 0 && (_jsx("div", { className: "text-center text-stone-400 py-6 text-sm", children: "\uC544\uC9C1 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." }))] })] })] }));
}
function ARChart({ series }) {
    if (series.length === 0) {
        return _jsx("div", { className: "text-sm text-stone-400 py-6 text-center", children: "\uAE30\uB85D \uCD94\uAC00 \uC2DC \uADF8\uB798\uD504\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4." });
    }
    const w = 600;
    const h = 160;
    const pad = 24;
    const xs = series.map((p) => p.x);
    const ys = series.map((p) => p.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs) || 1;
    const yMin = Math.min(...ys, 0);
    const yMax = Math.max(...ys, 6);
    const sx = (x) => pad + ((x - xMin) / Math.max(1, xMax - xMin)) * (w - pad * 2);
    const sy = (y) => h - pad - ((y - yMin) / (yMax - yMin)) * (h - pad * 2);
    const path = series.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x)} ${sy(p.y)}`).join(" ");
    return (_jsxs("svg", { viewBox: `0 0 ${w} ${h}`, className: "w-full", children: [_jsx("line", { x1: pad, y1: h - pad, x2: w - pad, y2: h - pad, stroke: "#e7e5e4" }), _jsx("line", { x1: pad, y1: pad, x2: pad, y2: h - pad, stroke: "#e7e5e4" }), _jsx("path", { d: path, stroke: "#10b981", strokeWidth: 2, fill: "none" }), series.map((p, i) => (_jsx("circle", { cx: sx(p.x), cy: sy(p.y), r: 3, fill: "#10b981" }, i))), _jsx("text", { x: pad, y: pad - 4, fontSize: "10", fill: "#6b7280", children: "AR" })] }));
}
