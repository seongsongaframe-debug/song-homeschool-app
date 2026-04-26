import { LocalStorageAdapter } from "./LocalStorageAdapter";
import { FirebaseAdapter } from "./FirebaseAdapter";
import type { StorageAdapter } from "./StorageAdapter";

// VITE_USE_LOCAL=1 이면 LocalStorage 사용 (오프라인 개발용).
// 기본: Firebase (가족 실시간 공유).
const useLocal = import.meta.env.VITE_USE_LOCAL === "1";

export const storage: StorageAdapter = useLocal
  ? new LocalStorageAdapter()
  : new FirebaseAdapter();

export const KEYS = {
  students: "config/students",
  subjects: "config/subjects",
  materials: "config/materials",
  assignments: "config/assignments",
  progress: (studentId: string, materialId: string) =>
    `progress/${studentId}/${materialId}`,
  log: (date: string, studentId: string) => `logs/${date}/${studentId}`,
  reading: (studentId: string) => `reading/${studentId}`,
  project: (studentId: string, projectId: string) =>
    `projects/${studentId}/${projectId}`,
  projectsList: (studentId: string) => `projects/${studentId}/`,
  report: (date: string) => `reports/${date}`,
  seedFlag: "_seeded",
  // 게임화
  pinHash: "auth/pinHash",
  authState: "auth/state",
  quest: (studentId: string, questId: string) =>
    `quests/${studentId}/${questId}`,
  questsAll: (studentId: string) => `quests/${studentId}/`,
  questTemplates: (studentId: string) => `quest_templates/${studentId}`,
  questMigrationFlag: "_quest_migration_v2",
  pointLedger: (studentId: string) => `points/${studentId}/ledger`,
  rewards: "config/rewards",
  purchase: (id: string) => `purchases/${id}`,
  purchasesAll: "purchases/",
  badges: "config/badges",
  badgesEarned: (studentId: string) => `badges_earned/${studentId}`,
  autoSeedFlag: (studentId: string, weekStartISO: string) =>
    `_autoseed/${studentId}/${weekStartISO}`,
};

export type { StorageAdapter };
