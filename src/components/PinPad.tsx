import { useState } from "react";

interface Props {
  title: string;
  subtitle?: string;
  onSubmit: (pin: string) => Promise<boolean> | boolean;
  onCancel?: () => void;
  length?: number;
}

export function PinPad({ title, subtitle, onSubmit, onCancel, length = 4 }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function press(digit: string) {
    if (busy || pin.length >= length) return;
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
    if (busy) return;
    setPin((p) => p.slice(0, -1));
    setError(null);
  }

  const dots = Array.from({ length }, (_, i) => i < pin.length);

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur flex items-center justify-center p-4">
      <div className="card max-w-xs w-full text-center">
        <h2 className="text-lg font-bold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{subtitle}</p>
        )}
        <div className="flex justify-center gap-3 my-6" aria-label="PIN 표시">
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 ${
                filled
                  ? "bg-brand-500 border-brand-500"
                  : "bg-transparent border-stone-300 dark:border-stone-700"
              }`}
            />
          ))}
        </div>
        {error && (
          <div className="text-sm text-red-500 mb-3" role="alert">
            {error}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              className="btn-ghost text-xl py-4"
              onClick={() => press(d)}
              disabled={busy}
            >
              {d}
            </button>
          ))}
          <button
            className="btn-ghost text-sm py-4"
            onClick={onCancel}
            disabled={busy}
          >
            취소
          </button>
          <button
            className="btn-ghost text-xl py-4"
            onClick={() => press("0")}
            disabled={busy}
          >
            0
          </button>
          <button
            className="btn-ghost text-xl py-4"
            onClick={back}
            disabled={busy}
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
