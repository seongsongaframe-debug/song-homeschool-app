import { useEffect, useMemo, useState } from "react";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { useAuth } from "../store/AuthContext";
import { usePoints } from "../store/usePoints";
import { tierFor, progressToNext } from "../lib/levels";
import { BADGES } from "../data/badges";
import { evaluateBadges, gatherStats } from "../lib/badges";
import { storage, KEYS } from "../storage";
import type { BadgeEarned } from "../types";

export default function Achievements() {
  const { students } = useData();
  const { activeChildId, setChild } = useAuth();
  const [studentId, setStudentId] = useState(activeChildId ?? students[0]?.id ?? "");
  const { balance, ledger } = usePoints(studentId);
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Awaited<ReturnType<typeof gatherStats>> | null>(null);

  useEffect(() => {
    if (studentId && studentId !== activeChildId) setChild(studentId);
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      await evaluateBadges(studentId);
      const earned =
        (await storage.read<BadgeEarned[]>(KEYS.badgesEarned(studentId))) ?? [];
      setEarnedIds(new Set(earned.map((e) => e.badge_id)));
      setStats(await gatherStats(studentId));
    })();
  }, [studentId, ledger.length]);

  const tier = tierFor(balance);
  const lv = progressToNext(balance);

  const recent = useMemo(
    () => [...ledger].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 20),
    [ledger]
  );

  if (!studentId) return null;

  const earnedBadges = BADGES.filter((b) => earnedIds.has(b.id));
  const lockedBadges = BADGES.filter((b) => !earnedIds.has(b.id));

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">🏆 성취</h1>
        <p className="text-stone-500 dark:text-stone-400">
          레벨·배지·포인트 내역
        </p>
      </header>

      <StudentTabs
        students={students}
        selected={studentId}
        onSelect={setStudentId}
      />

      <section className="card mb-4">
        <div className="flex items-center gap-3">
          <div className="text-6xl">{tier.icon}</div>
          <div className="flex-1">
            <div className="text-sm text-stone-500 dark:text-stone-400">
              Lv.{tier.level}
            </div>
            <div className="text-xl font-bold">{tier.title}</div>
            <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-2 mt-1 overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: `${lv.percent * 100}%` }}
              />
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {lv.next ? `${lv.next.title}까지 ${lv.delta}p` : "최고 레벨"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-stone-500 dark:text-stone-400">보유</div>
            <div className="text-2xl font-extrabold text-brand-600 dark:text-brand-400">
              {balance}p
            </div>
          </div>
        </div>
      </section>

      {stats && (
        <section className="card mb-4 grid grid-cols-4 gap-2 text-center">
          <Stat label="누적" value={`${stats.totalPoints}p`} />
          <Stat label="완주의 날" value={stats.perfectDaysCount} />
          <Stat label="최장 연속" value={`${stats.maxStreak}일`} />
          <Stat label="완료 퀘스트" value={stats.allQuests.length} />
        </section>
      )}

      <section className="mb-4">
        <h3 className="font-bold mb-2">
          🏅 배지 ({earnedBadges.length} / {BADGES.length})
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {earnedBadges.map((b) => (
            <div
              key={b.id}
              className="card text-center py-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30"
            >
              <div className="text-3xl">{b.icon}</div>
              <div className="font-bold text-sm mt-1">{b.title}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                {b.description}
              </div>
            </div>
          ))}
          {lockedBadges.map((b) => (
            <div key={b.id} className="card text-center py-3 opacity-50">
              <div className="text-3xl grayscale">{b.icon}</div>
              <div className="font-bold text-sm mt-1">{b.title}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                {b.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-bold mb-2">📜 최근 포인트 내역</h3>
        <div className="space-y-1">
          {recent.map((e) => (
            <div key={e.id} className="card py-2 flex items-center gap-2 text-sm">
              <span className="text-stone-400 text-xs w-16">{e.date.slice(5)}</span>
              <span className="flex-1 truncate">
                {reasonLabel(e.reason)}
                {e.note ? ` — ${e.note}` : ""}
              </span>
              <span
                className={`font-bold ${
                  e.delta >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {e.delta >= 0 ? "+" : ""}
                {e.delta}p
              </span>
            </div>
          ))}
          {recent.length === 0 && (
            <div className="text-center text-stone-400 py-6 text-sm">내역 없음</div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-stone-500 dark:text-stone-400">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function reasonLabel(r: string): string {
  return (
    {
      quest_complete: "퀘스트 완료",
      streak_bonus: "연속 보너스",
      perfect_day: "완주 보너스",
      reward_purchase: "보상 구매",
      manual_adjust: "수동 조정",
    } as Record<string, string>
  )[r] ?? r;
}
