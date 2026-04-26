import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { todayISO } from "../lib/dates";
const KIND_LABEL = {
    experience: "체험",
    research: "리서치",
    creative: "창작",
    field_trip: "현장학습",
};
const KIND_ICON = {
    experience: "🌳",
    research: "🔬",
    creative: "🎨",
    field_trip: "🚌",
};
export default function Projects() {
    const { students } = useData();
    const [studentId, setStudentId] = useState(students[0]?.id ?? "");
    const [projects, setProjects] = useState([]);
    const [editing, setEditing] = useState(null);
    const [showNew, setShowNew] = useState(false);
    async function reload() {
        if (!studentId)
            return;
        const keys = await storage.list(KEYS.projectsList(studentId));
        const items = [];
        for (const k of keys) {
            const p = await storage.read(k);
            if (p)
                items.push(p);
        }
        items.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
        setProjects(items);
    }
    useEffect(() => {
        reload();
    }, [studentId]);
    if (!studentId)
        return null;
    return (_jsxs("div", { className: "max-w-3xl mx-auto p-4", children: [_jsxs("header", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold", children: "\uCCB4\uD5D8\u00B7\uD504\uB85C\uC81D\uD2B8" }), _jsx("p", { className: "text-stone-500", children: "\uCCB4\uD5D8\u00B7\uB9AC\uC11C\uCE58\u00B7\uCC3D\uC791 \uD65C\uB3D9\uC744 \uD504\uB85C\uC81D\uD2B8 \uB2E8\uC704\uB85C \uAD00\uB9AC" })] }), _jsx("button", { className: "btn-primary", onClick: () => {
                            setEditing(blankProject(studentId));
                            setShowNew(true);
                        }, children: "+ \uC0C8 \uD504\uB85C\uC81D\uD2B8" })] }), _jsx(StudentTabs, { students: students, selected: studentId, onSelect: setStudentId }), showNew && editing && (_jsx(ProjectEditor, { project: editing, onCancel: () => {
                    setShowNew(false);
                    setEditing(null);
                }, onSave: async (p) => {
                    await storage.write(KEYS.project(studentId, p.id), p);
                    setShowNew(false);
                    setEditing(null);
                    await reload();
                } })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [projects.map((p) => (_jsx(ProjectCard, { project: p, onEdit: () => {
                            setEditing(p);
                            setShowNew(true);
                        }, onDelete: async () => {
                            await storage.remove(KEYS.project(studentId, p.id));
                            await reload();
                        } }, p.id))), projects.length === 0 && (_jsx("div", { className: "md:col-span-2 text-center text-stone-400 py-12", children: "\uC544\uC9C1 \uD504\uB85C\uC81D\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }))] })] }));
}
function blankProject(studentId) {
    return {
        id: crypto.randomUUID(),
        student_id: studentId,
        kind: "experience",
        title: "",
        startDate: todayISO(),
        goal: "",
        status: "in_progress",
        notes: [],
        photos: [],
    };
}
function ProjectCard({ project, onEdit, onDelete, }) {
    return (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsx("span", { className: "text-2xl", children: KIND_ICON[project.kind] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-semibold truncate", children: project.title || "(제목 없음)" }), _jsxs("div", { className: "text-xs text-stone-500", children: [KIND_LABEL[project.kind], " \u00B7 ", project.startDate, project.endDate ? ` ~ ${project.endDate}` : " ~ 진행 중"] })] }), _jsx("span", { className: "chip", style: project.status === "done"
                            ? { backgroundColor: "#dcfce7", color: "#166534" }
                            : project.status === "in_progress"
                                ? { backgroundColor: "#dbeafe", color: "#1e40af" }
                                : { backgroundColor: "#f5f5f4", color: "#57534e" }, children: project.status === "done" ? "완료" : project.status === "in_progress" ? "진행" : "예정" })] }), project.goal && (_jsxs("div", { className: "text-sm text-stone-600 dark:text-stone-300 mt-2 line-clamp-2", children: ["\uD83C\uDFAF ", project.goal] })), project.research && (_jsxs("div", { className: "mt-2 text-xs text-stone-500", children: ["\uD83D\uDCCB \uB9AC\uC11C\uCE58: ", project.research.topic] })), _jsxs("div", { className: "text-xs text-stone-400 mt-2", children: ["\uB178\uD2B8 ", project.notes.length, "\uAC1C \u00B7 \uC0AC\uC9C4 ", project.photos.length, "\uC7A5"] }), _jsxs("div", { className: "flex gap-2 mt-3", children: [_jsx("button", { className: "btn-ghost flex-1 text-sm", onClick: onEdit, children: "\uD3B8\uC9D1" }), _jsx("button", { className: "text-sm text-stone-400 hover:text-red-500", onClick: onDelete, children: "\uC0AD\uC81C" })] })] }));
}
function ProjectEditor({ project, onCancel, onSave, }) {
    const [draft, setDraft] = useState(project);
    return (_jsxs("div", { className: "card mb-4 border-brand-500 border-2 dark:border-brand-400", children: [_jsx("h3", { className: "font-bold mb-2", children: "\uD504\uB85C\uC81D\uD2B8 \uD3B8\uC9D1" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm text-stone-600 dark:text-stone-300", children: "\uC81C\uBAA9" }), _jsx("input", { className: "input", value: draft.title, onChange: (e) => setDraft({ ...draft, title: e.target.value }), placeholder: "\uC608: \uC6B0\uB9AC \uB3D9\uB124 \uACE4\uCDA9 \uAD00\uCC30" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm text-stone-600 dark:text-stone-300", children: "\uBD84\uC57C" }), _jsx("select", { className: "input", value: draft.kind, onChange: (e) => setDraft({ ...draft, kind: e.target.value }), children: Object.entries(KIND_LABEL).map(([k, v]) => (_jsxs("option", { value: k, children: [KIND_ICON[k], " ", v] }, k))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-stone-600 dark:text-stone-300", children: "\uC0C1\uD0DC" }), _jsxs("select", { className: "input", value: draft.status, onChange: (e) => setDraft({ ...draft, status: e.target.value }), children: [_jsx("option", { value: "planned", children: "\uC608\uC815" }), _jsx("option", { value: "in_progress", children: "\uC9C4\uD589 \uC911" }), _jsx("option", { value: "done", children: "\uC644\uB8CC" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-stone-600 dark:text-stone-300", children: "\uC2DC\uC791\uC77C" }), _jsx("input", { type: "date", className: "input", value: draft.startDate, onChange: (e) => setDraft({ ...draft, startDate: e.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-stone-600 dark:text-stone-300", children: "\uC885\uB8CC\uC77C" }), _jsx("input", { type: "date", className: "input", value: draft.endDate ?? "", onChange: (e) => setDraft({ ...draft, endDate: e.target.value || undefined }) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-stone-600 dark:text-stone-300", children: "\uBAA9\uD45C" }), _jsx("textarea", { className: "input min-h-[60px]", value: draft.goal, onChange: (e) => setDraft({ ...draft, goal: e.target.value }), placeholder: "\uC774 \uD504\uB85C\uC81D\uD2B8\uB85C \uBB34\uC5C7\uC744 \uC54C\uAC8C \uB418\uAC70\uB098 \uB9CC\uB4E4 \uAC74\uC9C0" })] }), draft.kind === "research" && (_jsxs("fieldset", { className: "border border-stone-200 dark:border-stone-700 rounded-lg p-3 space-y-2", children: [_jsx("legend", { className: "px-1 text-sm font-semibold text-stone-600 dark:text-stone-300", children: "\uD83D\uDCCB \uB9AC\uC11C\uCE58 \uD15C\uD50C\uB9BF" }), _jsx("input", { className: "input", placeholder: "\uC8FC\uC81C", value: draft.research?.topic ?? "", onChange: (e) => setDraft({
                                    ...draft,
                                    research: { ...emptyResearch(draft), topic: e.target.value },
                                }) }), _jsx("textarea", { className: "input min-h-[60px]", placeholder: "\uAC00\uC124", value: draft.research?.hypothesis ?? "", onChange: (e) => setDraft({
                                    ...draft,
                                    research: { ...emptyResearch(draft), hypothesis: e.target.value },
                                }) }), _jsx("textarea", { className: "input min-h-[60px]", placeholder: "\uC790\uB8CC \uC870\uC0AC", value: draft.research?.sources ?? "", onChange: (e) => setDraft({
                                    ...draft,
                                    research: { ...emptyResearch(draft), sources: e.target.value },
                                }) }), _jsx("textarea", { className: "input min-h-[60px]", placeholder: "\uACB0\uB860", value: draft.research?.conclusion ?? "", onChange: (e) => setDraft({
                                    ...draft,
                                    research: { ...emptyResearch(draft), conclusion: e.target.value },
                                }) })] })), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-stone-600 dark:text-stone-300", children: "\uB178\uD2B8" }), _jsxs("div", { className: "space-y-2", children: [draft.notes.map((n, i) => (_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { className: "input flex-1", value: n.title, onChange: (e) => {
                                                    const notes = [...draft.notes];
                                                    notes[i] = { ...n, title: e.target.value };
                                                    setDraft({ ...draft, notes });
                                                }, placeholder: "\uC81C\uBAA9" }), _jsx("button", { className: "text-sm text-stone-400 hover:text-red-500", onClick: () => setDraft({
                                                    ...draft,
                                                    notes: draft.notes.filter((x) => x.id !== n.id),
                                                }), children: "\u2715" })] }, n.id))), _jsx("button", { className: "btn-ghost text-sm w-full", onClick: () => setDraft({
                                            ...draft,
                                            notes: [
                                                ...draft.notes,
                                                {
                                                    id: crypto.randomUUID(),
                                                    date: todayISO(),
                                                    title: "",
                                                    content: "",
                                                },
                                            ],
                                        }), children: "+ \uB178\uD2B8 \uCD94\uAC00" })] })] }), _jsxs("div", { className: "flex gap-2 pt-2", children: [_jsx("button", { className: "btn-ghost flex-1", onClick: onCancel, children: "\uCDE8\uC18C" }), _jsx("button", { className: "btn-primary flex-1", onClick: () => onSave(draft), children: "\uC800\uC7A5" })] })] })] }));
}
function emptyResearch(p) {
    return p.research ?? { topic: "", hypothesis: "", sources: "", conclusion: "" };
}
