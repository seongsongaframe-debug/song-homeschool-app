// 송홈스쿨 데이터 모델
// 모든 도메인 객체는 여기서 정의. UI는 이 타입을 따라 렌더.

export type Grade = 1 | 2 | 3 | 4 | 5 | 6;

export interface Student {
  id: string;
  name: string;
  grade: Grade;
  birthYear: number;
  color: string;
  emoji: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
}

export type ProgressType = "linear" | "daily_reps" | "mastery" | "free";

export interface CustomField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "select";
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface LinearStructure {
  units: { id: string; name: string; items: number }[];
}

export interface MaterialBase {
  id: string;
  name: string;
  subject_id: string;
  grade?: Grade;
  description?: string;
  unlocks?: string[];
  custom_fields?: CustomField[];
}

export interface LinearMaterial extends MaterialBase {
  progress_type: "linear";
  structure: LinearStructure;
}

export interface DailyRepsMaterial extends MaterialBase {
  progress_type: "daily_reps";
  daily_target: number;
  unit: string;
}

export interface MasteryMaterial extends MaterialBase {
  progress_type: "mastery";
  threshold: number;
}

export interface FreeMaterial extends MaterialBase {
  progress_type: "free";
}

export type Material =
  | LinearMaterial
  | DailyRepsMaterial
  | MasteryMaterial
  | FreeMaterial;

export interface Assignment {
  material_id: string;
  started: string;
  priority?: number;
  active: boolean;
}

export interface AssignmentsByStudent {
  [studentId: string]: Assignment[];
}

export interface LinearProgress {
  type: "linear";
  completed: { [unitId: string]: number };
}

export interface DailyRepsProgress {
  type: "daily_reps";
  totalDone: number;
  byDate: { [date: string]: number };
}

export interface MasteryProgress {
  type: "mastery";
  attempts: { date: string; score: number; total: number }[];
  unlocked: boolean;
}

export interface FreeProgress {
  type: "free";
  count: number;
}

export type Progress =
  | LinearProgress
  | DailyRepsProgress
  | MasteryProgress
  | FreeProgress;

export interface DailyLogEntry {
  material_id: string;
  duration_min?: number;
  amount?: number;
  unit_id?: string;
  items_done?: number;
  note?: string;
  score?: number;
  total?: number;
  custom?: { [key: string]: unknown };
}

export interface DailyLog {
  date: string;
  student_id: string;
  entries: DailyLogEntry[];
  reflection?: string;
}

export interface ReadingEntry {
  id: string;
  student_id: string;
  date: string;
  title: string;
  ar_level: number;
  rating?: number;
  note?: string;
}

export type ProjectKind = "experience" | "research" | "creative" | "field_trip";

export interface ProjectNote {
  id: string;
  date: string;
  title: string;
  content: string;
}

export interface ResearchTemplate {
  topic: string;
  hypothesis: string;
  sources: string;
  conclusion: string;
}

export interface Project {
  id: string;
  student_id: string;
  kind: ProjectKind;
  title: string;
  startDate: string;
  endDate?: string;
  goal: string;
  status: "planned" | "in_progress" | "done";
  notes: ProjectNote[];
  photos: string[];
  research?: ResearchTemplate;
}

export interface DailyReport {
  date: string;
  generatedAt: string;
  body: string;
}

// ---------- 게임화 시스템 ----------

export type Difficulty = "easy" | "normal" | "hard";
export type QuestStatus = "pending" | "done";

export interface Subtask {
  id: string;
  label: string;
  done: boolean;
}

export interface Quest {
  id: string;
  student_id: string;
  assigned_date: string; // 보호자가 퀘스트를 배포한 날 (생성일)
  due_date: string; // 학원 등 외부 기관의 실제 마감일. 분류·정렬 기준.
  title: string;
  subject_id?: string;
  material_id?: string;
  target: number;
  unit: string;
  difficulty: Difficulty;
  points: number;
  status: QuestStatus;
  completedAt?: string;
  // 숙제용 확장
  note?: string;
  subtasks?: Subtask[];
  requires_verification?: boolean;
  verified?: boolean;
  verifiedAt?: string;
  rejectedReason?: string;
}

export interface QuestTemplate {
  id: string;
  name: string;
  student_id: string;
  items: Omit<
    Quest,
    | "id"
    | "student_id"
    | "assigned_date"
    | "due_date"
    | "status"
    | "completedAt"
  >[];
}

export type LedgerReason =
  | "quest_complete"
  | "streak_bonus"
  | "perfect_day"
  | "reward_purchase"
  | "manual_adjust";

export interface PointEntry {
  id: string;
  student_id: string;
  date: string;
  delta: number;
  reason: LedgerReason;
  note?: string;
  quest_id?: string;
  reward_id?: string;
}

export type RewardKind = "treat" | "privilege" | "item" | "experience";

export interface Reward {
  id: string;
  title: string;
  icon: string;
  cost_points: number;
  kind: RewardKind;
  stock?: number;
  description?: string;
  active: boolean;
  // 특정 학생만 볼 수 있는 보상. 비어있으면 모든 학생 공용.
  student_id?: string;
}

export type PurchaseStatus = "pending" | "approved" | "rejected" | "fulfilled";

export interface Purchase {
  id: string;
  student_id: string;
  reward_id: string;
  requestedAt: string;
  status: PurchaseStatus;
  decidedAt?: string;
  note?: string;
  cost_points: number;
}

export interface Badge {
  id: string;
  title: string;
  icon: string;
  description: string;
  condition: BadgeCondition;
}

export type BadgeCondition =
  | { kind: "streak"; days: number }
  | { kind: "perfect_days"; count: number }
  | { kind: "total_points"; amount: number }
  | { kind: "subject_quests"; subject_id: string; count: number }
  | { kind: "reading_books"; count: number };

export interface BadgeEarned {
  badge_id: string;
  student_id: string;
  earnedAt: string;
}

export const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  easy: 5,
  normal: 10,
  hard: 20,
};

export interface LevelTier {
  level: number;
  minPoints: number;
  title: string;
  icon: string;
}

export const LEVEL_TIERS: LevelTier[] = [
  { level: 1, minPoints: 0, title: "새싹", icon: "🌱" },
  { level: 2, minPoints: 100, title: "탐험가", icon: "🔍" },
  { level: 3, minPoints: 300, title: "견습생", icon: "📖" },
  { level: 4, minPoints: 600, title: "학자", icon: "🎓" },
  { level: 5, minPoints: 1000, title: "마스터", icon: "⭐" },
  { level: 6, minPoints: 1500, title: "현자", icon: "🧙" },
  { level: 7, minPoints: 2500, title: "전설", icon: "👑" },
];

export type AppRole = "parent" | "child";

export interface AuthState {
  role: AppRole;
  activeChildId?: string;
  pinSet: boolean;
}
