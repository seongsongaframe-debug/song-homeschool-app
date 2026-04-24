import { useEffect, useMemo, useState } from "react";
import { storage, KEYS } from "../storage";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { todayISO } from "../lib/dates";
import type { ReadingEntry } from "../types";

export default function Reading() {
  const { students } = useData();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [entries, setEntries] = useState<ReadingEntry[]>([]);
  const [title, setTitle] = useState("");
  const [arLevel, setArLevel] = useState<number>(2.0);
  const [rating, setRating] = useState<number>(4);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!studentId) return;
    storage.read<ReadingEntry[]>(KEYS.reading(studentId)).then((d) => {
      setEntries(d ?? []);
    });
  }, [studentId]);

  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) =>
        a.date < b.date ? 1 : a.date > b.date ? -1 : 0
      ),
    [entries]
  );

  const avgAR = useMemo(() => {
    if (entries.length === 0) return 0;
    return entries.reduce((s, e) => s + e.ar_level, 0) / entries.length;
  }, [entries]);

  const recommendedRange = useMemo(() => {
    if (entries.length < 3) return [arLevel, arLevel + 0.5] as const;
    const recent = sorted.slice(0, 5);
    const recentAvg =
      recent.reduce((s, e) => s + e.ar_level, 0) / recent.length;
    return [recentAvg, recentAvg + 0.5] as const;
  }, [sorted, entries.length, arLevel]);

  const series = useMemo(() => {
    return [...entries]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((e, i) => ({ x: i, y: e.ar_level, label: e.title }));
  }, [entries]);

  if (!studentId) return null;

  async function add() {
    if (!title.trim()) return;
    const entry: ReadingEntry = {
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

  async function remove(id: string) {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    await storage.write(KEYS.reading(studentId), next);
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">영어 독서 (AR 트래커)</h1>
        <p className="text-stone-500">
          누적 {entries.length}권 · 평균 AR {avgAR.toFixed(1)}
        </p>
      </header>

      <StudentTabs
        students={students}
        selected={studentId}
        onSelect={setStudentId}
      />

      <section className="card mb-4">
        <h3 className="font-bold mb-2">새 책 기록</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            className="input md:col-span-2"
            placeholder="책 제목 (예: Magic Tree House #1)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="text-sm">
            AR 지수
            <input
              className="input"
              type="number"
              min={0}
              max={13}
              step={0.1}
              value={arLevel}
              onChange={(e) => setArLevel(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            별점 (1~5)
            <input
              className="input"
              type="number"
              min={1}
              max={5}
              step={1}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            />
          </label>
          <input
            className="input md:col-span-2"
            placeholder="한줄 메모 (선택)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full mt-3" onClick={add}>
          + 추가
        </button>
        <div className="text-xs text-stone-500 mt-2">
          추천 다음 AR 구간:{" "}
          <span className="font-semibold text-stone-700 dark:text-stone-200">
            {recommendedRange[0].toFixed(1)} ~ {recommendedRange[1].toFixed(1)}
          </span>
        </div>
      </section>

      <section className="card mb-4">
        <h3 className="font-bold mb-2">AR 추이</h3>
        <ARChart series={series} />
      </section>

      <section>
        <h3 className="font-bold mb-2">독서 기록</h3>
        <div className="space-y-2">
          {sorted.map((e) => (
            <div key={e.id} className="card flex items-center gap-3">
              <div className="w-12 text-center">
                <div className="text-xs text-stone-400">AR</div>
                <div className="font-bold text-lg">{e.ar_level.toFixed(1)}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{e.title}</div>
                <div className="text-xs text-stone-500">
                  {e.date} · {"⭐".repeat(e.rating ?? 0)}
                </div>
                {e.note && <div className="text-sm text-stone-600 dark:text-stone-300 mt-1">{e.note}</div>}
              </div>
              <button
                className="text-xs text-stone-400 hover:text-red-500"
                onClick={() => remove(e.id)}
              >
                삭제
              </button>
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="text-center text-stone-400 py-6 text-sm">
              아직 기록이 없습니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ARChart({ series }: { series: { x: number; y: number; label: string }[] }) {
  if (series.length === 0) {
    return <div className="text-sm text-stone-400 py-6 text-center">기록 추가 시 그래프가 표시됩니다.</div>;
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
  const sx = (x: number) =>
    pad + ((x - xMin) / Math.max(1, xMax - xMin)) * (w - pad * 2);
  const sy = (y: number) => h - pad - ((y - yMin) / (yMax - yMin)) * (h - pad * 2);
  const path = series.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x)} ${sy(p.y)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e7e5e4" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#e7e5e4" />
      <path d={path} stroke="#10b981" strokeWidth={2} fill="none" />
      {series.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3} fill="#10b981" />
      ))}
      <text x={pad} y={pad - 4} fontSize="10" fill="#6b7280">AR</text>
    </svg>
  );
}
