import { useEffect, useState } from "react";

interface Burst {
  id: string;
  x: number;
  y: number;
  amount: number;
}

export function PointBurst() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number; amount: number }>).detail;
      const b: Burst = { id: crypto.randomUUID(), ...d };
      setBursts((prev) => [...prev, b]);
      setTimeout(() => {
        setBursts((prev) => prev.filter((x) => x.id !== b.id));
      }, 1200);
    };
    window.addEventListener("songhs:points-earned", handler as EventListener);
    return () =>
      window.removeEventListener("songhs:points-earned", handler as EventListener);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {bursts.map((b) => (
        <div
          key={b.id}
          className="absolute text-2xl font-extrabold text-brand-600 dark:text-brand-400 animate-[floatUp_1.1s_ease-out_forwards]"
          style={{ left: b.x, top: b.y }}
        >
          +{b.amount}p
        </div>
      ))}
      <style>{`
        @keyframes floatUp {
          0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
          20% { transform: translate(-50%, -20px) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -90px) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function emitPointBurst(x: number, y: number, amount: number) {
  window.dispatchEvent(
    new CustomEvent("songhs:points-earned", { detail: { x, y, amount } })
  );
}
