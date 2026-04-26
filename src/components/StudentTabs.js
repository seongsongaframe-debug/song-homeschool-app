import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StudentTabs({ students, selected, onSelect }) {
    return (_jsx("div", { className: "flex gap-2 mb-4", children: students.map((s) => {
            const active = s.id === selected;
            return (_jsxs("button", { onClick: () => onSelect(s.id), className: `flex-1 px-4 py-3 rounded-2xl border-2 transition flex items-center justify-center gap-2 ${active
                    ? "border-transparent text-white shadow-md"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"}`, style: active ? { backgroundColor: s.color } : undefined, children: [_jsx("span", { className: "text-xl", children: s.emoji }), _jsx("span", { className: "font-semibold", children: s.name }), _jsxs("span", { className: `text-xs ${active ? "opacity-80" : "text-stone-400 dark:text-stone-500"}`, children: [s.grade, "\uD559\uB144"] })] }, s.id));
        }) }));
}
