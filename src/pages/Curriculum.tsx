import { useState } from "react";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { ProgressBar } from "../components/ProgressBar";
import { storage, KEYS } from "../storage";
import {
  defaultProgress,
  linearPercent,
  masteryAvg,
} from "../store/useProgress";
import { useEffect } from "react";
import type { Material, Progress } from "../types";
import { todayISO } from "../lib/dates";

export default function Curriculum() {
  const { students, subjects, materials, assignments, saveAssignments } =
    useData();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
  const [showAdd, setShowAdd] = useState(false);

  const list = (assignments[studentId] ?? []).filter((a) => a.active);
  const materialMap = new Map(materials.map((m) => [m.id, m]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, Progress> = {};
      for (const a of list) {
        const m = materialMap.get(a.material_id);
        if (!m) continue;
        const p =
          (await storage.read<Progress>(KEYS.progress(studentId, m.id))) ??
          defaultProgress(m);
        map[m.id] = p;
      }
      if (!cancelled) setProgressMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, assignments, materials]);

  if (!studentId) return null;

  const unassignedMaterials = materials.filter(
    (m) => !list.some((a) => a.material_id === m.id)
  );

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">커리큘럼</h1>
          <p className="text-stone-500">활성 교재와 진도</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd((s) => !s)}>
          + 교재 추가
        </button>
      </header>

      <StudentTabs
        students={students}
        selected={studentId}
        onSelect={setStudentId}
      />

      {showAdd && (
        <section className="card mb-4">
          <h3 className="font-bold mb-2">배정 가능한 교재</h3>
          {unassignedMaterials.length === 0 && (
            <div className="text-sm text-stone-500">
              모든 교재가 배정되었습니다.
            </div>
          )}
          <div className="space-y-2">
            {unassignedMaterials.map((m) => {
              const subj = subjectMap.get(m.subject_id);
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  <span style={{ color: subj?.color }}>{subj?.icon}</span>
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-stone-500">
                      {subj?.name} · {m.progress_type}
                    </div>
                  </div>
                  <button
                    className="btn-ghost text-sm"
                    onClick={async () => {
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
                    }}
                  >
                    배정
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="space-y-3">
        {list.map((a) => {
          const m = materialMap.get(a.material_id);
          if (!m) return null;
          const subj = subjectMap.get(m.subject_id);
          const p = progressMap[m.id];
          const pct = computePercent(m, p);
          const unlocked = isUnlocked(m, p);
          return (
            <div key={m.id} className="card">
              <div className="flex items-start gap-2">
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ backgroundColor: subj?.color ?? "#64748b" }}
                >
                  {subj?.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-stone-500">
                    {subj?.name} · {labelType(m.progress_type)} · 시작{" "}
                    {a.started}
                  </div>
                </div>
                <button
                  className="text-xs text-stone-400 hover:text-red-500"
                  onClick={async () => {
                    const next = {
                      ...assignments,
                      [studentId]: (assignments[studentId] ?? []).map((x) =>
                        x.material_id === m.id ? { ...x, active: false } : x
                      ),
                    };
                    await saveAssignments(next);
                  }}
                >
                  비활성화
                </button>
              </div>
              <div className="mt-2">
                <ProgressBar
                  value={pct}
                  color={subj?.color ?? "#3b82f6"}
                  showLabel
                />
              </div>
              {unlocked &&
                m.unlocks &&
                m.unlocks.some(
                  (id) => !list.some((x) => x.material_id === id)
                ) && (
                  <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded-md p-2
                                   dark:text-emerald-300 dark:bg-emerald-900/30">
                    🎉 다음 단계 활성화 가능: {m.unlocks.join(", ")}
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {list.length === 0 && (
        <div className="text-center text-stone-400 py-12">
          배정된 교재가 없습니다. + 교재 추가
        </div>
      )}
    </div>
  );
}

function computePercent(m: Material, p?: Progress): number {
  if (!p) return 0;
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

function isUnlocked(m: Material, p?: Progress): boolean {
  if (!p) return false;
  if (m.progress_type === "linear" && p.type === "linear") {
    return linearPercent(p, m) >= 0.8;
  }
  if (m.progress_type === "mastery" && p.type === "mastery") {
    return masteryAvg(p) >= (m.threshold ?? 0.8);
  }
  return false;
}

function labelType(t: string) {
  return (
    {
      linear: "단원형",
      daily_reps: "매일 반복",
      mastery: "정답률 기반",
      free: "자유 입력",
    } as Record<string, string>
  )[t] ?? t;
}
