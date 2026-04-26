// 매주 같은 패턴의 퀘스트를 토/일 자동 부여.
// 혜인 전용. 합계 1000p (눈높이 400 + 학원 600).

import { storage, KEYS } from "../storage";
import type { Quest } from "../types";

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface AutoQuestSpec {
  title: string;
  subject_id?: string;
  target: number;
  unit: string;
  difficulty: "easy" | "normal" | "hard";
  points: number;
  note?: string;
  subtasks?: { label: string }[];
  requires_verification?: boolean;
}

const ACADEMY_SUBTASKS = [
  { label: "학원 도착, 선생님께 인사" },
  { label: "선생님 말씀 집중해서 듣기" },
  { label: "오늘 배운 것 1가지 아빠에게 메세지 보내기" },
];

const PIANO: AutoQuestSpec = {
  title: "🎹 피아노학원 다녀오기",
  subject_id: "arts",
  target: 1,
  unit: "회",
  difficulty: "normal",
  points: 120,
  subtasks: ACADEMY_SUBTASKS,
  requires_verification: true,
};

const ART: AutoQuestSpec = {
  title: "🎨 미술학원 다녀오기",
  subject_id: "arts",
  target: 1,
  unit: "회",
  difficulty: "normal",
  points: 120,
  subtasks: ACADEMY_SUBTASKS,
  requires_verification: true,
};

function noonnoppi(half: "1/2" | "2/2"): AutoQuestSpec {
  return {
    title: `눈높이 숙제 ${half}`,
    target: 1,
    unit: "회",
    difficulty: "hard",
    points: 200,
    note: "1주일치 분량을 반반씩 분할",
    requires_verification: true,
  };
}

const HYEIN_WEEKLY: Partial<Record<Weekday, AutoQuestSpec[]>> = {
  mon: [PIANO],
  tue: [noonnoppi("1/2"), noonnoppi("2/2"), PIANO],
  wed: [ART],
  thu: [PIANO],
  fri: [ART],
};

const HYEIN_ID = "hyein";

const WEEKDAY_OFFSET: Record<Weekday, number> = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
};

function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISOLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getMondayOf(now: Date): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=일, 1=월, ..., 6=토
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localISO(d);
}

export function getNextMonday(now: Date): string {
  const m = parseISOLocal(getMondayOf(now));
  m.setDate(m.getDate() + 7);
  return localISO(m);
}

function dateForWeekday(weekStartMonISO: string, wd: Weekday): string {
  const m = parseISOLocal(weekStartMonISO);
  m.setDate(m.getDate() + WEEKDAY_OFFSET[wd]);
  return localISO(m);
}

async function weekHasAnyQuest(studentId: string, weekStartISO: string): Promise<boolean> {
  const start = parseISOLocal(weekStartISO);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endISO = localISO(end);
  const keys = await storage.list(KEYS.questsAll(studentId));
  for (const k of keys) {
    const q = await storage.read<Quest>(k);
    if (!q) continue;
    if (q.due_date >= weekStartISO && q.due_date <= endISO) return true;
  }
  return false;
}

export type SeedReason = "seeded" | "already_flagged" | "existing_quests";

async function ensureWeekQuests(
  studentId: string,
  weekStartISO: string,
  now: Date,
): Promise<{ created: number; reason: SeedReason }> {
  const flag = await storage.read<boolean>(KEYS.autoSeedFlag(studentId, weekStartISO));
  if (flag) return { created: 0, reason: "already_flagged" };

  // 사용자가 같은 주에 이미 직접 퀘스트를 만들어 두었으면 자동 생성 스킵 + 플래그만 세팅.
  if (await weekHasAnyQuest(studentId, weekStartISO)) {
    await storage.write(KEYS.autoSeedFlag(studentId, weekStartISO), true);
    return { created: 0, reason: "existing_quests" };
  }

  const today = localISO(now);
  let created = 0;
  for (const [wd, specs] of Object.entries(HYEIN_WEEKLY) as [Weekday, AutoQuestSpec[]][]) {
    const dueDate = dateForWeekday(weekStartISO, wd);
    for (const spec of specs) {
      const id = crypto.randomUUID();
      const quest: Quest = {
        id,
        student_id: studentId,
        assigned_date: today,
        due_date: dueDate,
        title: spec.title,
        subject_id: spec.subject_id,
        target: spec.target,
        unit: spec.unit,
        difficulty: spec.difficulty,
        points: spec.points,
        status: "pending",
        note: spec.note,
        subtasks: spec.subtasks?.map((st) => ({
          id: crypto.randomUUID(),
          label: st.label,
          done: false,
        })),
        requires_verification: spec.requires_verification,
        verified: false,
      };
      await storage.write(KEYS.quest(studentId, id), quest);
      created++;
    }
  }
  await storage.write(KEYS.autoSeedFlag(studentId, weekStartISO), true);
  return { created, reason: "seeded" };
}

// 토/일 첫 로드 시 차주 자동 부여.
export async function maybeAutoSeedHyein(now: Date = new Date()): Promise<{
  ran: boolean;
  weekStart?: string;
  created: number;
  reason?: SeedReason;
}> {
  const day = now.getDay();
  if (day !== 6 && day !== 0) {
    return { ran: false, created: 0 };
  }
  const weekStart = getNextMonday(now);
  const result = await ensureWeekQuests(HYEIN_ID, weekStart, now);
  return { ran: true, weekStart, ...result };
}

// 수동 트리거: 토/일이면 차주, 평일이면 이번주를 채움.
export async function manualSeedHyein(now: Date = new Date()): Promise<{
  weekStart: string;
  created: number;
  reason: SeedReason;
}> {
  const day = now.getDay();
  const weekStart = day === 6 || day === 0 ? getNextMonday(now) : getMondayOf(now);
  const result = await ensureWeekQuests(HYEIN_ID, weekStart, now);
  return { weekStart, ...result };
}
