// 구 quest 데이터(date를 경로에 포함) → 신 데이터(due_date 필드 기반) 1회성 마이그레이션
import { storage, KEYS } from "../storage";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export async function migrateQuestsIfNeeded() {
    const flag = await storage.read(KEYS.questMigrationFlag);
    if (flag?.done)
        return;
    // 모든 quest 키 조회 (구·신 혼재 가능)
    const allKeys = await storage.list("quests/");
    for (const key of allKeys) {
        // 키 모양: "quests/{studentId}/{...}/{maybeDate}/{questId}"
        // 구 경로: 부분이 4개 (quests, studentId, date, questId)
        // 신 경로: 부분이 3개 (quests, studentId, questId)
        const parts = key.split("/");
        if (parts.length !== 4)
            continue;
        const [, studentId, maybeDate, questId] = parts;
        if (!DATE_RE.test(maybeDate))
            continue;
        const legacy = await storage.read(key);
        if (!legacy) {
            await storage.remove(key);
            continue;
        }
        const date = legacy.date ?? maybeDate;
        const migrated = {
            ...legacy,
            id: legacy.id ?? questId,
            student_id: legacy.student_id ?? studentId,
            assigned_date: legacy.assigned_date ?? date,
            due_date: legacy.due_date ?? date,
        };
        // legacy.date 잔여 필드 제거
        delete migrated.date;
        await storage.write(KEYS.quest(migrated.student_id, migrated.id), migrated);
        await storage.remove(key);
    }
    await storage.write(KEYS.questMigrationFlag, {
        done: true,
        at: new Date().toISOString(),
    });
}
