import type {
  Badge,
  BadgeEarned,
  PointEntry,
  Quest,
  ReadingEntry,
} from "../types";
import { storage, KEYS } from "../storage";
import { BADGES } from "../data/badges";

interface Stats {
  ledger: PointEntry[];
  allQuests: Quest[];
  reading: ReadingEntry[];
  totalPoints: number;
  perfectDaysCount: number;
  maxStreak: number;
  subjectQuestCounts: Record<string, number>;
}

export async function gatherStats(studentId: string): Promise<Stats> {
  const ledger =
    (await storage.read<PointEntry[]>(KEYS.pointLedger(studentId))) ?? [];
  const reading =
    (await storage.read<ReadingEntry[]>(KEYS.reading(studentId))) ?? [];

  const allQuestKeys = await storage.list(`quests/${studentId}/`);
  const allQuests: Quest[] = [];
  for (const k of allQuestKeys) {
    const q = await storage.read<Quest>(k);
    if (q && q.status === "done") allQuests.push(q);
  }

  const totalPoints = ledger.reduce((s, e) => s + e.delta, 0);

  const perfectDates = new Set(
    ledger.filter((e) => e.reason === "perfect_day").map((e) => e.date)
  );
  const perfectDaysCount = perfectDates.size;

  const sortedDates = [...perfectDates].sort();
  let maxStreak = 0;
  let current = 0;
  let prevDate: Date | null = null;
  for (const d of sortedDates) {
    const curr = new Date(d + "T00:00:00");
    if (prevDate) {
      const diff = Math.round(
        (curr.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      current = diff === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }
    if (current > maxStreak) maxStreak = current;
    prevDate = curr;
  }

  const subjectQuestCounts: Record<string, number> = {};
  for (const q of allQuests) {
    if (q.subject_id) {
      subjectQuestCounts[q.subject_id] =
        (subjectQuestCounts[q.subject_id] ?? 0) + 1;
    }
  }

  return {
    ledger,
    allQuests,
    reading,
    totalPoints,
    perfectDaysCount,
    maxStreak,
    subjectQuestCounts,
  };
}

export function checkBadge(badge: Badge, stats: Stats): boolean {
  const c = badge.condition;
  switch (c.kind) {
    case "streak":
      return stats.maxStreak >= c.days;
    case "perfect_days":
      return stats.perfectDaysCount >= c.count;
    case "total_points":
      return stats.totalPoints >= c.amount;
    case "subject_quests":
      return (stats.subjectQuestCounts[c.subject_id] ?? 0) >= c.count;
    case "reading_books":
      return stats.reading.length >= c.count;
  }
}

export async function evaluateBadges(studentId: string): Promise<Badge[]> {
  const stats = await gatherStats(studentId);
  const earned =
    (await storage.read<BadgeEarned[]>(KEYS.badgesEarned(studentId))) ?? [];
  const earnedIds = new Set(earned.map((e) => e.badge_id));
  const newly: Badge[] = [];
  for (const b of BADGES) {
    if (earnedIds.has(b.id)) continue;
    if (checkBadge(b, stats)) {
      newly.push(b);
    }
  }
  if (newly.length > 0) {
    const next: BadgeEarned[] = [
      ...earned,
      ...newly.map((b) => ({
        badge_id: b.id,
        student_id: studentId,
        earnedAt: new Date().toISOString(),
      })),
    ];
    await storage.write(KEYS.badgesEarned(studentId), next);
  }
  return newly;
}

export async function getEarnedBadges(studentId: string): Promise<Badge[]> {
  const earned =
    (await storage.read<BadgeEarned[]>(KEYS.badgesEarned(studentId))) ?? [];
  const ids = new Set(earned.map((e) => e.badge_id));
  return BADGES.filter((b) => ids.has(b.id));
}
