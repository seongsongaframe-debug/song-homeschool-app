import { useCallback, useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
import type { PointEntry, Quest } from "../types";

export function usePoints(studentId: string) {
  const [ledger, setLedger] = useState<PointEntry[]>([]);

  const load = useCallback(async () => {
    if (!studentId) {
      setLedger([]);
      return;
    }
    const data = await storage.read<PointEntry[]>(KEYS.pointLedger(studentId));
    setLedger(data ?? []);
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const append = useCallback(
    async (entry: Omit<PointEntry, "id">) => {
      const data = (await storage.read<PointEntry[]>(KEYS.pointLedger(studentId))) ?? [];
      const next = [...data, { ...entry, id: crypto.randomUUID() }];
      await storage.write(KEYS.pointLedger(studentId), next);
      setLedger(next);
    },
    [studentId]
  );

  const balance = ledger.reduce((sum, e) => sum + e.delta, 0);

  return { ledger, balance, append, reload: load };
}

export function totalPointsFromLedger(ledger: PointEntry[]): number {
  return ledger.reduce((s, e) => s + e.delta, 0);
}

export function calcStreakBonus(streakDays: number): number {
  return Math.min(20, streakDays * 2);
}

export function calcPerfectDayBonus(allDone: boolean): number {
  return allDone ? 30 : 0;
}

export function questsCompletedToday(quests: Quest[]): boolean {
  return quests.length > 0 && quests.every((q) => q.status === "done");
}

export function computeStreak(
  dailyPerfects: Record<string, boolean>,
  todayISO: string
): number {
  const d = new Date(todayISO + "T00:00:00");
  // 오늘 아직 미완주면 어제부터 카운트 (스트릭 유지 UX)
  if (!dailyPerfects[todayISO]) {
    d.setDate(d.getDate() - 1);
  }
  let streak = 0;
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if (dailyPerfects[key]) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}
