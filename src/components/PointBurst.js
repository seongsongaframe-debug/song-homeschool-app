import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export function PointBurst() {
    const [bursts, setBursts] = useState([]);
    useEffect(() => {
        const handler = (e) => {
            const d = e.detail;
            const b = { id: crypto.randomUUID(), ...d };
            setBursts((prev) => [...prev, b]);
            setTimeout(() => {
                setBursts((prev) => prev.filter((x) => x.id !== b.id));
            }, 1200);
        };
        window.addEventListener("songhs:points-earned", handler);
        return () => window.removeEventListener("songhs:points-earned", handler);
    }, []);
    return (_jsxs("div", { className: "fixed inset-0 pointer-events-none z-[60]", children: [bursts.map((b) => (_jsxs("div", { className: "absolute text-2xl font-extrabold text-brand-600 dark:text-brand-400 animate-[floatUp_1.1s_ease-out_forwards]", style: { left: b.x, top: b.y }, children: ["+", b.amount, "p"] }, b.id))), _jsx("style", { children: `
        @keyframes floatUp {
          0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
          20% { transform: translate(-50%, -20px) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -90px) scale(1); opacity: 0; }
        }
      ` })] }));
}
export function emitPointBurst(x, y, amount) {
    window.dispatchEvent(new CustomEvent("songhs:points-earned", { detail: { x, y, amount } }));
}
