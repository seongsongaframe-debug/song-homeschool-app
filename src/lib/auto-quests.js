// 매주 패턴 퀘스트(혜인·세인) 일요일 자동 부여 + 일일 청소 퀘스트(혜인·세인) 매일 자동 부여/만료.
// 혜인: 눈높이 400 + 학원 600 = 1000p / 청소 30p × 7 = 210p
// 세인: 영어3·수학3·스케이트1 × 120p = 840p / 청소 30p × 7 = 210p
import { storage, KEYS } from "../storage";
const ACADEMY_SUBTASKS = [
    { label: "학원 도착, 선생님께 인사" },
    { label: "선생님 말씀 집중해서 듣기" },
    { label: "오늘 배운 것 1가지 아빠에게 메세지 보내기" },
];
// ----- 혜인 전용 spec -----
const PIANO = {
    title: "🎹 피아노학원 다녀오기",
    subject_id: "arts",
    target: 1,
    unit: "회",
    difficulty: "normal",
    points: 100,
    subtasks: ACADEMY_SUBTASKS,
    requires_verification: true,
};
const ART = {
    title: "🎨 미술학원 다녀오기",
    subject_id: "arts",
    target: 1,
    unit: "회",
    difficulty: "normal",
    points: 100,
    subtasks: ACADEMY_SUBTASKS,
    requires_verification: true,
};
const SKATING_HYEIN = {
    title: "⛸️ 스케이트교습 다녀오기",
    subject_id: "arts",
    target: 1,
    unit: "회",
    difficulty: "normal",
    points: 100,
    subtasks: ACADEMY_SUBTASKS,
    requires_verification: true,
};
function noonnoppi(half) {
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
// ----- 세인 전용 spec -----
const ENGLISH_SEIN = {
    title: "📗 영어학원 다녀오기",
    subject_id: "english",
    target: 1,
    unit: "회",
    difficulty: "normal",
    points: 120,
    subtasks: ACADEMY_SUBTASKS,
    requires_verification: true,
};
const MATH_SEIN = {
    title: "✏️ 수학 수업 다녀오기",
    subject_id: "math",
    target: 1,
    unit: "회",
    difficulty: "normal",
    points: 120,
    subtasks: ACADEMY_SUBTASKS,
    requires_verification: true,
};
const SKATING_SEIN = {
    title: "⛸️ 스케이트 수업 다녀오기",
    subject_id: "arts",
    target: 1,
    unit: "회",
    difficulty: "normal",
    points: 120,
    subtasks: ACADEMY_SUBTASKS,
    requires_verification: true,
};
// ----- 일일 청소 (공통) -----
const CLEANING = {
    title: "🧹 청소 1회 (스페셜)",
    target: 1,
    unit: "회",
    difficulty: "easy",
    points: 30,
    note: "오늘 안 하면 사라져요!",
    requires_verification: true,
    text_response_prompt: "오늘 어디를 청소했어?",
};
const CLEANING_TITLE_PREFIX = "🧹 청소";
const CLEANING_STUDENT_IDS = ["hyein", "sein"];
// ----- 학생별 주간 패턴 -----
const HYEIN_WEEKLY = {
    mon: [PIANO],
    tue: [noonnoppi("1/2"), noonnoppi("2/2"), PIANO],
    wed: [ART],
    thu: [PIANO],
    fri: [ART],
    sat: [SKATING_HYEIN],
};
const SEIN_WEEKLY = {
    mon: [ENGLISH_SEIN],
    tue: [MATH_SEIN],
    wed: [ENGLISH_SEIN, MATH_SEIN],
    thu: [MATH_SEIN],
    fri: [ENGLISH_SEIN],
    sat: [SKATING_SEIN],
};
const WEEKLY_BY_STUDENT = {
    hyein: HYEIN_WEEKLY,
    sein: SEIN_WEEKLY,
};
const STUDENT_LABEL = {
    hyein: "혜인",
    sein: "세인",
};
const WEEKDAY_OFFSET = {
    mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
};
function localISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
function parseISOLocal(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
}
export function getMondayOf(now) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=일, 1=월, ..., 6=토
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return localISO(d);
}
export function getNextMonday(now) {
    const m = parseISOLocal(getMondayOf(now));
    m.setDate(m.getDate() + 7);
    return localISO(m);
}
function dateForWeekday(weekStartMonISO, wd) {
    const m = parseISOLocal(weekStartMonISO);
    m.setDate(m.getDate() + WEEKDAY_OFFSET[wd]);
    return localISO(m);
}
async function weekHasAnyQuest(studentId, weekStartISO) {
    const start = parseISOLocal(weekStartISO);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endISO = localISO(end);
    const keys = await storage.list(KEYS.questsAll(studentId));
    for (const k of keys) {
        const q = await storage.read(k);
        if (!q)
            continue;
        // 매일 자동생성되는 청소 퀘스트는 주간 시드 차단 사유에서 제외.
        if (q.title?.startsWith(CLEANING_TITLE_PREFIX))
            continue;
        if (q.due_date >= weekStartISO && q.due_date <= endISO)
            return true;
    }
    return false;
}
async function ensureWeekQuests(studentId, weekStartISO, now) {
    const pattern = WEEKLY_BY_STUDENT[studentId];
    if (!pattern)
        return { created: 0, reason: "no_pattern" };
    const flag = await storage.read(KEYS.autoSeedFlag(studentId, weekStartISO));
    if (flag)
        return { created: 0, reason: "already_flagged" };
    // 사용자가 같은 주에 이미 직접 퀘스트를 만들어 두었으면 자동 생성 스킵 + 플래그만 세팅.
    if (await weekHasAnyQuest(studentId, weekStartISO)) {
        await storage.write(KEYS.autoSeedFlag(studentId, weekStartISO), true);
        return { created: 0, reason: "existing_quests" };
    }
    const today = localISO(now);
    let created = 0;
    for (const [wd, specs] of Object.entries(pattern)) {
        const dueDate = dateForWeekday(weekStartISO, wd);
        for (const spec of specs) {
            const id = crypto.randomUUID();
            const quest = {
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
                text_response_prompt: spec.text_response_prompt,
            };
            await storage.write(KEYS.quest(studentId, id), quest);
            created++;
        }
    }
    await storage.write(KEYS.autoSeedFlag(studentId, weekStartISO), true);
    return { created, reason: "seeded" };
}
// 일요일 첫 로드 시 차주 자동 부여 (혜인·세인 모두).
export async function maybeAutoSeedAll(now = new Date()) {
    const day = now.getDay();
    if (day !== 0) {
        return { ran: false, results: [] };
    }
    const weekStart = getNextMonday(now);
    const results = [];
    for (const sid of Object.keys(WEEKLY_BY_STUDENT)) {
        const r = await ensureWeekQuests(sid, weekStart, now);
        results.push({ studentId: sid, ...r });
    }
    return { ran: true, weekStart, results };
}
// 수동 트리거: 일요일이면 차주, 그 외엔 이번 주를 채움. 학생 1명 단위.
export async function manualSeed(studentId, now = new Date()) {
    const day = now.getDay();
    const weekStart = day === 0 ? getNextMonday(now) : getMondayOf(now);
    const result = await ensureWeekQuests(studentId, weekStart, now);
    return {
        studentId,
        studentLabel: STUDENT_LABEL[studentId] ?? studentId,
        weekStart,
        ...result,
    };
}
// ---------- 일일 청소 퀘스트 (혜인·세인) ----------
async function ensureTodayCleaning(studentId, todayISO) {
    const flag = await storage.read(KEYS.cleaningDailyFlag(studentId, todayISO));
    if (flag)
        return false;
    const id = crypto.randomUUID();
    const quest = {
        id,
        student_id: studentId,
        assigned_date: todayISO,
        due_date: todayISO,
        title: CLEANING.title,
        target: CLEANING.target,
        unit: CLEANING.unit,
        difficulty: CLEANING.difficulty,
        points: CLEANING.points,
        status: "pending",
        note: CLEANING.note,
        requires_verification: CLEANING.requires_verification,
        verified: false,
        text_response_prompt: CLEANING.text_response_prompt,
    };
    await storage.write(KEYS.quest(studentId, id), quest);
    await storage.write(KEYS.cleaningDailyFlag(studentId, todayISO), true);
    return true;
}
// due_date 가 오늘 이전이고 status !== "done" 인 청소 퀘스트는 자동 삭제.
async function purgeStaleCleaning(studentId, todayISO) {
    const keys = await storage.list(KEYS.questsAll(studentId));
    let removed = 0;
    for (const k of keys) {
        const q = await storage.read(k);
        if (!q)
            continue;
        if (!q.title?.startsWith(CLEANING_TITLE_PREFIX))
            continue;
        if (q.due_date >= todayISO)
            continue;
        if (q.status === "done")
            continue;
        await storage.remove(k);
        removed += 1;
    }
    return removed;
}
// 매일 첫 로드 시 호출. 오늘분 청소 생성 + 어제 이전 미완료 청소 정리.
export async function runDailyCleaningSync(now = new Date()) {
    const today = localISO(now);
    let created = 0;
    let removed = 0;
    for (const sid of CLEANING_STUDENT_IDS) {
        if (await ensureTodayCleaning(sid, today))
            created += 1;
        removed += await purgeStaleCleaning(sid, today);
    }
    return { today, created, removed };
}
