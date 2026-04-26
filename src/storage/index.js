import { LocalStorageAdapter } from "./LocalStorageAdapter";
import { FirebaseAdapter } from "./FirebaseAdapter";
// VITE_USE_LOCAL=1 이면 LocalStorage 사용 (오프라인 개발용).
// 기본: Firebase (가족 실시간 공유).
const useLocal = import.meta.env.VITE_USE_LOCAL === "1";
export const storage = useLocal
    ? new LocalStorageAdapter()
    : new FirebaseAdapter();
export const KEYS = {
    students: "config/students",
    subjects: "config/subjects",
    materials: "config/materials",
    assignments: "config/assignments",
    progress: (studentId, materialId) => `progress/${studentId}/${materialId}`,
    log: (date, studentId) => `logs/${date}/${studentId}`,
    reading: (studentId) => `reading/${studentId}`,
    project: (studentId, projectId) => `projects/${studentId}/${projectId}`,
    projectsList: (studentId) => `projects/${studentId}/`,
    report: (date) => `reports/${date}`,
    seedFlag: "_seeded",
    // 게임화
    pinHash: "auth/pinHash",
    authState: "auth/state",
    quest: (studentId, questId) => `quests/${studentId}/${questId}`,
    questsAll: (studentId) => `quests/${studentId}/`,
    questTemplates: (studentId) => `quest_templates/${studentId}`,
    questMigrationFlag: "_quest_migration_v2",
    pointLedger: (studentId) => `points/${studentId}/ledger`,
    rewards: "config/rewards",
    purchase: (id) => `purchases/${id}`,
    purchasesAll: "purchases/",
    badges: "config/badges",
    badgesEarned: (studentId) => `badges_earned/${studentId}`,
    autoSeedFlag: (studentId, weekStartISO) => `_autoseed/${studentId}/${weekStartISO}`,
};
