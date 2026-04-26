import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
export function PinPad({ title, subtitle, onSubmit, onCancel, length = 4 }) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    async function press(digit) {
        if (busy || pin.length >= length)
            return;
        const next = pin + digit;
        setPin(next);
        setError(null);
        if (next.length === length) {
            setBusy(true);
            const ok = await onSubmit(next);
            setBusy(false);
            if (!ok) {
                setError("PIN이 일치하지 않아요");
                setPin("");
            }
        }
    }
    function back() {
        if (busy)
            return;
        setPin((p) => p.slice(0, -1));
        setError(null);
    }
    const dots = Array.from({ length }, (_, i) => i < pin.length);
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-stone-950/80 backdrop-blur flex items-center justify-center p-4", children: _jsxs("div", { className: "card max-w-xs w-full text-center", children: [_jsx("h2", { className: "text-lg font-bold", children: title }), subtitle && (_jsx("p", { className: "text-sm text-stone-500 dark:text-stone-400 mt-1", children: subtitle })), _jsx("div", { className: "flex justify-center gap-3 my-6", "aria-label": "PIN \uD45C\uC2DC", children: dots.map((filled, i) => (_jsx("div", { className: `w-4 h-4 rounded-full border-2 ${filled
                            ? "bg-brand-500 border-brand-500"
                            : "bg-transparent border-stone-300 dark:border-stone-700"}` }, i))) }), error && (_jsx("div", { className: "text-sm text-red-500 mb-3", role: "alert", children: error })), _jsxs("div", { className: "grid grid-cols-3 gap-2", children: [["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (_jsx("button", { className: "btn-ghost text-xl py-4", onClick: () => press(d), disabled: busy, children: d }, d))), _jsx("button", { className: "btn-ghost text-sm py-4", onClick: onCancel, disabled: busy, children: "\uCDE8\uC18C" }), _jsx("button", { className: "btn-ghost text-xl py-4", onClick: () => press("0"), disabled: busy, children: "0" }), _jsx("button", { className: "btn-ghost text-xl py-4", onClick: back, disabled: busy, children: "\u232B" })] })] }) }));
}
