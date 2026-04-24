import { useState } from "react";
import type { Material, Subject } from "../types";
import {
  defaultProgress,
  dailyRepsToday,
  linearPercent,
  masteryAvg,
  useProgress,
} from "../store/useProgress";
import { ProgressBar } from "./ProgressBar";
import { useDailyLog } from "../store/useDailyLog";
import { todayISO } from "../lib/dates";

interface Props {
  material: Material;
  subject?: Subject;
  studentId: string;
  onUnlock?: (nextMaterialId: string) => void;
}

export function MaterialCard({ material, subject, studentId, onUnlock }: Props) {
  const { progress, save } = useProgress(studentId, material);
  const { append } = useDailyLog(todayISO(), studentId);
  const today = todayISO();
  const color = subject?.color ?? "#64748b";

  if (!progress) return null;

  const header = (
    <div className="flex items-center gap-2 mb-2">
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
        style={{ backgroundColor: color }}
        aria-label={subject?.name}
      >
        {subject?.icon ?? "•"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{material.name}</div>
        {material.description && (
          <div className="text-xs text-stone-500 truncate">{material.description}</div>
        )}
      </div>
      <span
        className="chip"
        style={{ backgroundColor: color + "22", color }}
      >
        {labelOfType(material.progress_type)}
      </span>
    </div>
  );

  if (material.progress_type === "linear" && progress.type === "linear") {
    const pct = linearPercent(progress, material);
    return (
      <div className="card">
        {header}
        <ProgressBar value={pct} color={color} showLabel />
        <div className="mt-3 space-y-2">
          {material.structure.units.map((u) => {
            const done = progress.completed[u.id] ?? 0;
            return (
              <div key={u.id} className="flex items-center gap-2">
                <div className="flex-1 text-sm">{u.name}</div>
                <button
                  className="btn-ghost px-2 py-1 text-sm"
                  onClick={async () => {
                    const next = Math.max(0, done - 1);
                    await save({
                      ...progress,
                      completed: { ...progress.completed, [u.id]: next },
                    });
                  }}
                  aria-label={`${u.name} 감소`}
                >
                  −
                </button>
                <div className="w-14 text-center text-sm tabular-nums">
                  {done}/{u.items}
                </div>
                <button
                  className="btn-primary px-2 py-1 text-sm"
                  onClick={async () => {
                    const next = Math.min(u.items, done + 1);
                    await save({
                      ...progress,
                      completed: { ...progress.completed, [u.id]: next },
                    });
                    await append({
                      material_id: material.id,
                      unit_id: u.id,
                      items_done: 1,
                    });
                  }}
                  aria-label={`${u.name} 증가`}
                >
                  +
                </button>
              </div>
            );
          })}
        </div>
        {material.unlocks && pct >= 0.8 && (
          <button
            className="btn-primary mt-3 w-full"
            onClick={() => material.unlocks?.forEach((id) => onUnlock?.(id))}
          >
            🔓 다음 단계 활성화 ({material.unlocks.length}개)
          </button>
        )}
      </div>
    );
  }

  if (material.progress_type === "daily_reps" && progress.type === "daily_reps") {
    const todayDone = dailyRepsToday(progress, today);
    const target = material.daily_target;
    const pct = target > 0 ? todayDone / target : 0;
    return (
      <div className="card">
        {header}
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-stone-500">
            오늘 목표 <span className="font-semibold text-stone-700">{target}{material.unit}</span>
          </div>
          <div className="text-sm tabular-nums">
            <span className="font-bold text-lg">{todayDone}</span>
            <span className="text-stone-400"> / {target}{material.unit}</span>
          </div>
        </div>
        <ProgressBar value={pct} color={color} />
        <div className="flex gap-2 mt-3">
          <button
            className="btn-ghost flex-1"
            onClick={async () => {
              const next = Math.max(0, todayDone - 1);
              await save({
                ...progress,
                totalDone: Math.max(0, progress.totalDone - 1),
                byDate: { ...progress.byDate, [today]: next },
              });
            }}
          >
            −1
          </button>
          <button
            className="btn-primary flex-1"
            onClick={async () => {
              const next = todayDone + 1;
              await save({
                ...progress,
                totalDone: progress.totalDone + 1,
                byDate: { ...progress.byDate, [today]: next },
              });
              await append({ material_id: material.id, amount: 1 });
            }}
          >
            +1{material.unit}
          </button>
        </div>
        <div className="text-xs text-stone-400 mt-2">
          누적 {progress.totalDone}{material.unit}
        </div>
      </div>
    );
  }

  if (material.progress_type === "mastery" && progress.type === "mastery") {
    const avg = masteryAvg(progress);
    const last = progress.attempts[progress.attempts.length - 1];
    return (
      <MasteryPanel
        material={material}
        color={color}
        avg={avg}
        last={last}
        progress={progress}
        save={save}
        append={append}
        header={header}
        onUnlock={onUnlock}
      />
    );
  }

  if (material.progress_type === "free" && progress.type === "free") {
    return (
      <div className="card">
        {header}
        <div className="flex items-center justify-between">
          <div className="text-sm text-stone-500">자유 입력 항목</div>
          <div className="text-sm">
            누적 <span className="font-bold">{progress.count}</span>건
          </div>
        </div>
        <button
          className="btn-ghost w-full mt-3"
          onClick={async () => {
            await save({ ...progress, count: progress.count + 1 });
            await append({ material_id: material.id, amount: 1 });
          }}
        >
          +1 항목 (간단 카운트)
        </button>
        <div className="text-xs text-stone-400 mt-2">
          상세 입력은 메뉴에서 (예: 영어 독서 → AR 입력)
        </div>
      </div>
    );
  }

  return null;
}

function MasteryPanel({
  material,
  color,
  avg,
  last,
  progress,
  save,
  append,
  header,
  onUnlock,
}: any) {
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(10);
  return (
    <div className="card">
      {header}
      <div className="flex items-center gap-3 text-sm mb-3">
        <div>
          최근 평균{" "}
          <span className="font-bold">{Math.round(avg * 100)}%</span>
          <span className="text-stone-400 text-xs"> (목표 {Math.round((material.threshold ?? 0.8) * 100)}%)</span>
        </div>
        {last && (
          <div className="text-stone-500">
            마지막: {last.score}/{last.total}
          </div>
        )}
      </div>
      <ProgressBar value={avg} color={color} />
      <div className="flex items-center gap-2 mt-3">
        <input
          className="input flex-1"
          type="number"
          value={score}
          min={0}
          onChange={(e) => setScore(Number(e.target.value))}
          placeholder="점수"
        />
        <span>/</span>
        <input
          className="input flex-1"
          type="number"
          value={total}
          min={1}
          onChange={(e) => setTotal(Number(e.target.value))}
          placeholder="만점"
        />
        <button
          className="btn-primary"
          onClick={async () => {
            const nextAttempts = [
              ...progress.attempts,
              { date: todayISO(), score, total },
            ];
            const nextAvg = masteryAvg({
              type: "mastery",
              attempts: nextAttempts,
              unlocked: progress.unlocked,
            });
            const threshold = material.threshold ?? 0.8;
            const wasUnlocked = progress.unlocked;
            const nowUnlocked = nextAvg >= threshold;
            await save({
              ...progress,
              attempts: nextAttempts,
              unlocked: nowUnlocked,
            });
            await append({
              material_id: material.id,
              score,
              total,
            });
            if (!wasUnlocked && nowUnlocked && material.unlocks) {
              for (const id of material.unlocks) onUnlock?.(id);
            }
            setScore(0);
          }}
        >
          기록
        </button>
      </div>
    </div>
  );
}

function labelOfType(t: string) {
  return (
    {
      linear: "단원형",
      daily_reps: "매일",
      mastery: "정답률",
      free: "자유",
    } as Record<string, string>
  )[t] ?? t;
}
