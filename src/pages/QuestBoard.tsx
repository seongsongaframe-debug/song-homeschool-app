import { useEffect, useMemo, useState } from "react";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { AchievementRing } from "../components/AchievementRing";
import { emitPointBurst } from "../components/PointBurst";
import { fmtKDate, todayISO } from "../lib/dates";
import { storage, KEYS } from "../storage";
import {
  calcPerfectDayBonus,
  calcStreakBonus,
  computeStreak,
  usePoints,
} from "../store/usePoints";
import { tierFor, progressToNext } from "../lib/levels";
import { useQuests } from "../store/useQuests";
import type { Difficulty, PointEntry, Quest, Subtask } from "../types";
import { useAuth } from "../store/AuthContext";

const DIFF_STARS: Record<Difficulty, string> = {
  easy: "⭐",
  normal: "⭐⭐",
  hard: "⭐⭐⭐",
};

export default function QuestBoard() {
  const { students, subjects } = useData();
  const { activeChildId, setChild } = useAuth();
  const [studentId, setStudentId] = useState(
    activeChildId ?? students[0]?.id ?? ""
  );
  const date = todayISO();
  const { quests, save } = useQuests(studentId, date);
  const { balance, append, ledger } = usePoints(studentId);

  useEffect(() => {
    if (studentId && studentId !== activeChildId) setChild(studentId);
  }, [studentId]);

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  const done = quests.filter((q) => q.status === "done");
  const pending = quests.filter((q) => q.status === "pending");
  const percent = quests.length === 0 ? 0 : done.length / quests.length;

  const [streak, setStreak] = useState(0);
  useEffect(() => {
    (async () => {
      const dailyPerfects = await buildPerfectsMap(studentId);
      setStreak(computeStreak(dailyPerfects, date));
    })();
  }, [studentId, date, quests.length, ledger.length]);

  const tier = tierFor(balance);
  const lv = progressToNext(balance);

  const awaitingVerify = quests.filter(
    (q) => q.status === "done" && q.requires_verification && !q.verified
  );

  async function completeQuest(q: Quest, updatedSubtasks?: Subtask[]) {
    const next: Quest = {
      ...q,
      status: "done",
      completedAt: new Date().toISOString(),
      subtasks: updatedSubtasks ?? q.subtasks,
    };
    await save(next);
    await handlePostCompletion(next);
  }

  async function revertQuest(q: Quest, updatedSubtasks?: Subtask[]) {
    const next: Quest = {
      ...q,
      status: "pending",
      completedAt: undefined,
      subtasks: updatedSubtasks ?? q.subtasks,
    };
    await save(next);
    await undoQuestAndBonuses(q, studentId, date);
  }

  async function handlePostCompletion(q: Quest) {
    // 검증 필요 퀘스트는 즉시 포인트 지급 안 함
    if (!q.requires_verification) {
      await append({
        student_id: studentId,
        date,
        delta: q.points,
        reason: "quest_complete",
        quest_id: q.id,
        note: q.title,
      });
    }
    // 완주·스트릭 보너스는 모든 퀘스트가 done 상태면 지급 (검증 무관, 아이 동기 부여)
    const keys = await storage.list(KEYS.questsByDay(studentId, date));
    const items: Quest[] = [];
    for (const k of keys) {
      const x = await storage.read<Quest>(k);
      if (x) items.push(x);
    }
    const allDone = items.length > 0 && items.every((x) => x.status === "done");
    if (!allDone) return;
    const prevPerfect = await wasPerfect(studentId, date);
    if (prevPerfect) return;
    const bonus = calcPerfectDayBonus(true);
    await append({
      student_id: studentId,
      date,
      delta: bonus,
      reason: "perfect_day",
      note: "오늘 퀘스트 완주",
    });
    const dailyPerfects = await buildPerfectsMap(studentId);
    dailyPerfects[date] = true;
    const newStreak = computeStreak(dailyPerfects, date);
    const streakBonus = calcStreakBonus(newStreak);
    if (streakBonus > 0) {
      await append({
        student_id: studentId,
        date,
        delta: streakBonus,
        reason: "streak_bonus",
        note: `${newStreak}일 연속`,
      });
    }
    setTimeout(() => {
      emitPointBurst(window.innerWidth / 2, 180, bonus + streakBonus);
    }, 400);
  }

  async function handleMainToggle(q: Quest, evt: React.MouseEvent) {
    if (q.subtasks && q.subtasks.length > 0) return; // 서브태스크로 처리
    if (q.status === "done") {
      await revertQuest(q);
      return;
    }
    const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect();
    await completeQuest(q);
    if (!q.requires_verification) {
      emitPointBurst(rect.left + rect.width / 2, rect.top + 20, q.points);
    }
  }

  async function handleSubtaskToggle(
    q: Quest,
    subtaskId: string,
    evt: React.MouseEvent
  ) {
    if (!q.subtasks) return;
    const nextSubs = q.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, done: !s.done } : s
    );
    const allSubsDone = nextSubs.every((s) => s.done);
    const wasDone = q.status === "done";
    if (allSubsDone && !wasDone) {
      const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect();
      await completeQuest(q, nextSubs);
      if (!q.requires_verification) {
        emitPointBurst(rect.left + rect.width / 2, rect.top + 20, q.points);
      }
    } else if (!allSubsDone && wasDone) {
      await revertQuest(q, nextSubs);
    } else {
      await save({ ...q, subtasks: nextSubs });
    }
  }

  if (!studentId) return null;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">퀘스트 보드</h1>
        <p className="text-stone-500 dark:text-stone-400">{fmtKDate(date)}</p>
      </header>

      <StudentTabs
        students={students}
        selected={studentId}
        onSelect={setStudentId}
      />

      <section className="card mb-4 flex items-center gap-4">
        <AchievementRing
          percent={percent}
          label={`${done.length} / ${quests.length}`}
          sublabel="오늘 완료"
          glow={percent >= 1 && quests.length > 0}
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{tier.icon}</span>
            <div>
              <div className="font-bold">
                Lv.{tier.level} {tier.title}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                {lv.next ? `다음 "${lv.next.title}"까지 ${lv.delta}p` : "최고 레벨 🎉"}
              </div>
            </div>
          </div>
          <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${lv.percent * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <div>
              💰 <span className="font-bold text-lg">{balance}</span>p
            </div>
            <div>
              🔥 <span className="font-bold">{streak}</span>일 연속
            </div>
          </div>
        </div>
      </section>

      {awaitingVerify.length > 0 && (
        <div className="card mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-sm">
          ⏳ 보호자 확인 대기 중 <b>{awaitingVerify.length}개</b> — 확인되면
          포인트가 들어와요.
        </div>
      )}

      {quests.length === 0 && (
        <div className="card text-center py-10 text-stone-500 dark:text-stone-400">
          오늘 받은 과제가 없어요. 보호자에게 배포 요청!
        </div>
      )}

      {pending.length > 0 && (
        <section className="mb-4">
          <h2 className="font-bold mb-2">
            남은 퀘스트 <span className="text-stone-400">({pending.length})</span>
          </h2>
          <div className="space-y-2">
            {pending.map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                subject={q.subject_id ? subjectMap.get(q.subject_id) : undefined}
                onToggleMain={handleMainToggle}
                onToggleSubtask={handleSubtaskToggle}
              />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className="mb-4">
          <h2 className="font-bold mb-2 text-stone-500 dark:text-stone-400">
            완료 <span>({done.length})</span>
          </h2>
          <div className="space-y-2 opacity-80">
            {done.map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                subject={q.subject_id ? subjectMap.get(q.subject_id) : undefined}
                onToggleMain={handleMainToggle}
                onToggleSubtask={handleSubtaskToggle}
              />
            ))}
          </div>
        </section>
      )}

      {quests.length > 0 && done.length === quests.length && (
        <div className="card text-center py-6 bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-900/40 dark:to-amber-950 border-amber-200 dark:border-amber-800">
          <div className="text-4xl mb-2">🎉</div>
          <div className="font-bold text-lg">오늘 퀘스트 완주!</div>
          <div className="text-sm text-stone-600 dark:text-stone-300 mt-1">
            완주 보너스 +30p · 연속 {streak}일 (+{calcStreakBonus(streak)}p)
          </div>
        </div>
      )}
    </div>
  );
}

function QuestCard({
  quest,
  subject,
  onToggleMain,
  onToggleSubtask,
}: {
  quest: Quest;
  subject?: { icon: string; color: string; name: string };
  onToggleMain: (q: Quest, evt: React.MouseEvent) => void;
  onToggleSubtask: (q: Quest, subtaskId: string, evt: React.MouseEvent) => void;
}) {
  const done = quest.status === "done";
  const hasSubs = !!quest.subtasks && quest.subtasks.length > 0;
  const awaitingVerify = done && quest.requires_verification && !quest.verified;
  const verified = done && quest.verified;
  const rejected = !!quest.rejectedReason;
  const locked = verified; // 보호자 검증 후엔 아이가 임의로 취소 불가

  const handleClick = (e: React.MouseEvent) => {
    if (hasSubs) return;
    if (locked) return;
    onToggleMain(quest, e);
  };

  return (
    <div
      className={`card transition ${
        done ? "" : "hover:shadow-md"
      } ${hasSubs || locked ? "" : "cursor-pointer"}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 transition ${
            done
              ? awaitingVerify
                ? "bg-amber-500 text-white"
                : "bg-emerald-500 text-white"
              : "border-2 border-stone-300 dark:border-stone-700"
          }`}
          aria-label={done ? "완료" : "미완료"}
        >
          {done ? (awaitingVerify ? "⏳" : "✓") : subject?.icon ?? "📝"}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold truncate ${done ? "line-through" : ""}`}>
            {quest.title}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2 mt-0.5 flex-wrap">
            {subject && (
              <span style={{ color: subject.color }}>{subject.name}</span>
            )}
            <span>
              {quest.target}
              {quest.unit}
            </span>
            <span>{DIFF_STARS[quest.difficulty]}</span>
            {quest.due_date && (
              <span
                className="chip"
                style={{ backgroundColor: "#e0e7ff", color: "#3730a3" }}
              >
                📅 마감 {quest.due_date.slice(5).replace("-", ".")}
              </span>
            )}
            {awaitingVerify && (
              <span className="chip" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
                보호자 확인 대기
              </span>
            )}
            {rejected && (
              <span className="chip" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                다시 해주세요
              </span>
            )}
          </div>
          {quest.note && (
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 italic">
              💡 {quest.note}
            </div>
          )}
          {rejected && (
            <div className="text-xs text-red-500 mt-1">
              사유: {quest.rejectedReason}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
          <div className="font-bold text-brand-600 dark:text-brand-400">
            +{quest.points}p
          </div>
          {awaitingVerify && (
            <div className="text-[10px] text-amber-600 dark:text-amber-400">
              확인 후 지급
            </div>
          )}
          {verified && <div className="text-xs">🔒</div>}
          {done && !locked && !hasSubs && (
            <button
              className="text-xs text-stone-500 dark:text-stone-400 underline"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMain(quest, e);
              }}
              aria-label="취소"
            >
              ↺ 취소
            </button>
          )}
        </div>
      </div>

      {hasSubs && (
        <div className="mt-3 space-y-1 pl-2 border-l-2 border-stone-200 dark:border-stone-700">
          {quest.subtasks!.map((s) => (
            <button
              key={s.id}
              disabled={locked}
              onClick={(e) => {
                e.stopPropagation();
                if (locked) return;
                onToggleSubtask(quest, s.id, e);
              }}
              className={`flex items-center gap-2 w-full text-left py-1 rounded px-1 ${
                locked
                  ? "cursor-not-allowed"
                  : "hover:bg-stone-50 dark:hover:bg-stone-800"
              }`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                  s.done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-stone-300 dark:border-stone-600"
                }`}
              >
                {s.done && "✓"}
              </div>
              <span className={`text-sm ${s.done ? "line-through text-stone-400" : ""}`}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

async function wasPerfect(studentId: string, date: string): Promise<boolean> {
  const ledger =
    (await storage.read<PointEntry[]>(KEYS.pointLedger(studentId))) ?? [];
  return ledger.some((e) => e.date === date && e.reason === "perfect_day");
}

async function buildPerfectsMap(
  studentId: string
): Promise<Record<string, boolean>> {
  const ledger =
    (await storage.read<PointEntry[]>(KEYS.pointLedger(studentId))) ?? [];
  const map: Record<string, boolean> = {};
  for (const e of ledger) {
    if (e.reason === "perfect_day") map[e.date] = true;
  }
  return map;
}

// 퀘스트 체크 해제: 해당 퀘스트 포인트 + (완주 상태가 깨졌다면) 그날의 완주/스트릭 보너스도 회수
async function undoQuestAndBonuses(
  q: Quest,
  studentId: string,
  date: string
) {
  const data =
    (await storage.read<PointEntry[]>(KEYS.pointLedger(studentId))) ?? [];
  const stillPerfect = await isPerfectNow(studentId, date);
  const next = data.filter((e) => {
    if (e.quest_id === q.id) return false;
    if (!stillPerfect && e.date === date) {
      if (e.reason === "perfect_day" || e.reason === "streak_bonus") return false;
    }
    return true;
  });
  if (next.length !== data.length) {
    await storage.write(KEYS.pointLedger(studentId), next);
  }
}

async function isPerfectNow(studentId: string, date: string): Promise<boolean> {
  const keys = await storage.list(KEYS.questsByDay(studentId, date));
  if (keys.length === 0) return false;
  for (const k of keys) {
    const q = await storage.read<Quest>(k);
    if (!q || q.status !== "done") return false;
  }
  return true;
}
