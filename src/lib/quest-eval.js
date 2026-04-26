// quest 분류·평가 헬퍼 — due_date 기반.
import { storage, KEYS } from "../storage";
export function classifyQuests(quests, today) {
    const overdue = [];
    const dueToday = [];
    const upcoming = [];
    const done = [];
    for (const q of quests) {
        if (q.status === "done") {
            done.push(q);
            continue;
        }
        if (q.due_date < today)
            overdue.push(q);
        else if (q.due_date === today)
            dueToday.push(q);
        else
            upcoming.push(q);
    }
    // 마감 가까운 순
    const byDue = (a, b) => a.due_date.localeCompare(b.due_date);
    overdue.sort(byDue);
    dueToday.sort(byDue);
    upcoming.sort(byDue);
    done.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    return { overdue, dueToday, upcoming, done };
}
export function isOverdue(q, today) {
    return q.status === "pending" && q.due_date < today;
}
// 마감일 기준 perfect day 평가:
// today 시점에 마감 도래(due_date <= today) 한 quest가 1개 이상 있고, 모두 done이면 perfect.
export function evaluatePerfectForToday(quests, today) {
    const dueByToday = quests.filter((q) => q.due_date <= today);
    if (dueByToday.length === 0)
        return false;
    return dueByToday.every((q) => q.status === "done");
}
export async function loadStudentQuests(studentId) {
    const keys = await storage.list(KEYS.questsAll(studentId));
    const out = [];
    for (const k of keys) {
        const q = await storage.read(k);
        if (q)
            out.push(q);
    }
    return out;
}
export async function hasPerfectDayAwarded(studentId, date) {
    const ledger = (await storage.read(KEYS.pointLedger(studentId))) ?? [];
    return ledger.some((e) => e.date === date && e.reason === "perfect_day");
}
