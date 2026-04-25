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
import {
  classifyQuests,
  evaluatePerfectForToday,
  hasPerfectDayAwarded,
  loadStudentQuests,
} from "../lib/quest-eval";
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
  const today = todayISO();
  const { quests, save } = useQuests(studentId);
  const { balance, append, ledger } = usePoints(studentId);

  useEffect(() => {
    if (studentId && studentId !== activeChildId) setChild(studentId);
  }, [studentId]);

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  const buckets = useMemo(() => classifyQuests(quests, today), [quests, today]);
  const totalPending = buckets.overdue.length + buckets.dueToday.length + buckets.upcoming.length;
  const totalToShow = totalPending + buckets.done.length;
  const percent = totalToShow === 0 ? 0 : buckets.done.length / totalToShow;

  const [streak, setStreak] = useState(0);
  useEffect(() => {
    (async () => {
      const dailyPerfects = await buildPerfectsMap(studentId);
      setStreak(computeStreak(dailyPerfects, today));
    })();
  }, [studentId, today, quests.length, ledger.length]);

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
    await undoQuestAndBonuses(q, studentId, today);
  }

  async function handlePostCompletion(q: Quest) {
    if (!q.requires_verification) {
      await append({
        student_id: studentId,
        date: today,
        delta: q.points,
        reason: "quest_complete",
        quest_id: q.id,
        note: q.title,
      });
    }
    // 완주 평가: today 기준 마감 도래한 퀘스트가 모두 done이면 perfect.
    const allQuests = await loadStudentQuests(studentId);
    const isPerfect = evaluatePerfectForToday(allQuests, today);
    if (!isPerfect) return;
    if (await hasPerfectDayAwarded(studentId, today)) return;

    const bonus = calcPerfectDayBonus(true);
    await append({
      student_id: studentId,
      date: today,
      delta: bonus,
      reason: "perfect_day",
      note: "오늘 마감 퀘스트 완주",
    });
    const dailyPerfects = await buildPerfectsMap(studentId);
    dailyPerfects[today] = true;
    const newStreak = computeStreak(dailyPerfects, today);
    const streakBonus = calcStreakBonus(newStreak);
    if (streakBonus > 0) {
      await append({
        student_id: studentId,
        date: today,
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
    if (q.subtasks && q.subtasks.length > 0) return;
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
        <p className="text-stone-500 dark:text-stone-400">{fmtKDate(today)}</p>
      </header>

      <StudentTabs
        students={students}
        selected={studentId}
        onSelect={setStudentId}
      />

      <section className="card mb-4 flex items-center gap-4">
        <AchievementRing
          percent={percent}
          label={`${buckets.done.length} / ${totalToShow}`}
          sublabel="진행률"
          glow={percent >= 1 && totalToShow > 0}
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

      {totalToShow === 0 && (
        <div className="card text-center py-10 text-stone-500 dark:text-stone-400">
          받은 과제가 없어요. 보호자에게 배포 요청!
        </div>
      )}

      {buckets.overdue.length > 0 && (
        <Section
          title="🚨 마감 지남"
          count={buckets.overdue.length}
          tone="red"
        >
          {buckets.overdue.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              today={today}
              subject={q.subject_id ? subjectMap.get(q.subject_id) : undefined}
              onToggleMain={handleMainToggle}
              onToggleSubtask={handleSubtaskToggle}
            />
          ))}
        </Section>
      )}

      {buckets.dueToday.length > 0 && (
        <Section
          title="🎯 오늘 마감"
          count={buckets.dueToday.length}
          tone="brand"
        >
          {buckets.dueToday.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              today={today}
              subject={q.subject_id ? subjectMap.get(q.subject_id) : undefined}
              onToggleMain={handleMainToggle}
              onToggleSubtask={handleSubtaskToggle}
            />
          ))}
        </Section>
      )}

      {buckets.upcoming.length > 0 && (
        <Section
          title="📅 곧 마감"
          count={buckets.upcoming.length}
          tone="muted"
        >
          {buckets.upcoming.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              today={today}
              subject={q.subject_id ? subjectMap.get(q.subject_id) : undefined}
              onToggleMain={handleMainToggle}
              onToggleSubtask={handleSubtaskToggle}
            />
          ))}
        </Section>
      )}

      {buckets.done.length > 0 && (
        <Section
          title="✅ 완료"
          count={buckets.done.length}
          tone="muted"
          dim
        >
          {buckets.done.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              today={today}
              subject={q.subject_id ? subjectMap.get(q.subject_id) : undefined}
              onToggleMain={handleMainToggle}
              onToggleSubtask={handleSubtaskToggle}
            />
          ))}
        </Section>
      )}

      {totalPending === 0 && totalToShow > 0 && (
        <div className="card text-center py-6 bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-900/40 dark:to-amber-950 border-amber-200 dark:border-amber-800">
          <div className="text-4xl mb-2">🎉</div>
          <div className="font-bold text-lg">남은 퀘스트 없음!</div>
          <div className="text-sm text-stone-600 dark:text-stone-300 mt-1">
            완주 보너스 +30p · 연속 {streak}일 (+{calcStreakBonus(streak)}p)
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  tone,
  dim,
  children,
}: {
  title: string;
  count: number;
  tone: "red" | "brand" | "muted";
  dim?: boolean;
  children: React.ReactNode;
}) {
  const color =
    tone === "red"
      ? "text-red-600 dark:text-red-400"
      : tone === "brand"
      ? "text-brand-600 dark:text-brand-400"
      : "text-stone-500 dark:text-stone-400";
  return (
    <section className={`mb-4 ${dim ? "opacity-80" : ""}`}>
      <h2 className={`font-bold mb-2 ${color}`}>
        {title} <span className="text-stone-400">({count})</span>
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function QuestCard({
  quest,
  today,
  subject,
  onToggleMain,
  onToggleSubtask,
}: {
  quest: Quest;
  today: string;
  subject?: { icon: string; color: string; name: string };
  onToggleMain: (q: Quest, evt: React.MouseEvent) => void;
  onToggleSubtask: (q: Quest, subtaskId: string, evt: React.MouseEvent) => void;
}) {
  const done = quest.status === "done";
  const hasSubs = !!quest.subtasks && quest.subtasks.length > 0;
  const awaitingVerify = done && quest.requires_verification && !quest.verified;
  const verified = done && quest.verified;
  const rejected = !!quest.rejectedReason;
  const locked = verified;
  const overdue = !done && quest.due_date < today;
  const dueToday = !done && quest.due_date === today;

  const handleClick = (e: React.MouseEvent) => {
    if (hasSubs) return;
    if (locked) return;
    onToggleMain(quest, e);
  };

  const dueLabel = quest.due_date.slice(5).replace("-", ".");
  const dueChipStyle = overdue
    ? { backgroundColor: "#fee2e2", color: "#991b1b" }
    : dueToday
    ? { backgroundColor: "#fed7aa", color: "#9a3412" }
    : { backgroundColor: "#e0e7ff", color: "#3730a3" };
  const dueChipText = overdue ? `⚠️ ${dueLabel} 지남` : dueToday ? `🔥 오늘 마감` : `📅 ${dueLabel} 마감`;

  return (
    <div
      className={`card transition ${
        done ? "" : "hover:shadow-md"
      } ${hasSubs || locked ? "" : "cursor-pointer"} ${
        overdue ? "border-red-300 dark:border-red-800" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 transition ${
            done
              ? awaitingVerify
                ? "bg-amber-500 text-white"
                : "bg-emerald-500 text-white"
              : overdue
              ? "border-2 border-red-400 dark:border-red-700"
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
            <span className="chip" style={dueChipStyle}>
              {dueChipText}
            </span>
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
  today: string
) {
  const data =
    (await storage.read<PointEntry[]>(KEYS.pointLedger(studentId))) ?? [];
  const allQuests = await loadStudentQuests(studentId);
  const stillPerfect = evaluatePerfectForToday(allQuests, today);
  const next = data.filter((e) => {
    if (e.quest_id === q.id) return false;
    if (!stillPerfect && e.date === today) {
      if (e.reason === "perfect_day" || e.reason === "streak_bonus") return false;
    }
    return true;
  });
  if (next.length !== data.length) {
    await storage.write(KEYS.pointLedger(studentId), next);
  }
}
