import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { AchievementRing } from "../components/AchievementRing";
import { emitPointBurst } from "../components/PointBurst";
import { fmtKDate, todayISO } from "../lib/dates";
import { storage, KEYS } from "../storage";
import { calcPerfectDayBonus, calcStreakBonus, computeStreak, usePoints, } from "../store/usePoints";
import { tierFor, progressToNext } from "../lib/levels";
import { useQuests } from "../store/useQuests";
import { classifyQuests, evaluatePerfectForToday, hasPerfectDayAwarded, loadStudentQuests, } from "../lib/quest-eval";
import { useAuth } from "../store/AuthContext";
const DIFF_STARS = {
    easy: "⭐",
    normal: "⭐⭐",
    hard: "⭐⭐⭐",
};
export default function QuestBoard() {
    const { students, subjects } = useData();
    const { activeChildId, setChild } = useAuth();
    const [studentId, setStudentId] = useState(activeChildId ?? students[0]?.id ?? "");
    const today = todayISO();
    const { quests, save } = useQuests(studentId);
    const { balance, append, ledger } = usePoints(studentId);
    useEffect(() => {
        if (studentId && studentId !== activeChildId)
            setChild(studentId);
    }, [studentId]);
    const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
    const buckets = useMemo(() => classifyQuests(quests, today), [quests, today]);
    const totalPending = buckets.overdue.length + buckets.dueToday.length + buckets.upcoming.length;
    const totalToShow = totalPending + buckets.done.length;
    const percent = totalToShow === 0 ? 0 : buckets.done.length / totalToShow;
    const [streak, setStreak] = useState(0);
    useEffect(() => {
        (async () => {
            const dailyPerfects = await buildPerfectsMap(studentId);
            setStreak(computeStreak(dailyPerfects, today));
        })();
    }, [studentId, today, quests.length, ledger.length]);
    const tier = tierFor(balance);
    const lv = progressToNext(balance);
    const awaitingVerify = quests.filter((q) => q.status === "done" && q.requires_verification && !q.verified);
    async function completeQuest(q, updatedSubtasks) {
        const next = {
            ...q,
            status: "done",
            completedAt: new Date().toISOString(),
            subtasks: updatedSubtasks ?? q.subtasks,
        };
        await save(next);
        await handlePostCompletion(next);
    }
    async function revertQuest(q, updatedSubtasks) {
        const next = {
            ...q,
            status: "pending",
            completedAt: undefined,
            subtasks: updatedSubtasks ?? q.subtasks,
        };
        await save(next);
        await undoQuestAndBonuses(q, studentId, today);
    }
    async function handlePostCompletion(q) {
        if (!q.requires_verification) {
            await append({
                student_id: studentId,
                date: today,
                delta: q.points,
                reason: "quest_complete",
                quest_id: q.id,
                note: q.title,
            });
        }
        // 완주 평가: today 기준 마감 도래한 퀘스트가 모두 done이면 perfect.
        const allQuests = await loadStudentQuests(studentId);
        const isPerfect = evaluatePerfectForToday(allQuests, today);
        if (!isPerfect)
            return;
        if (await hasPerfectDayAwarded(studentId, today))
            return;
        const bonus = calcPerfectDayBonus(true);
        await append({
            student_id: studentId,
            date: today,
            delta: bonus,
            reason: "perfect_day",
            note: "오늘 마감 퀘스트 완주",
        });
        const dailyPerfects = await buildPerfectsMap(studentId);
        dailyPerfects[today] = true;
        const newStreak = computeStreak(dailyPerfects, today);
        const streakBonus = calcStreakBonus(newStreak);
        if (streakBonus > 0) {
            await append({
                student_id: studentId,
                date: today,
                delta: streakBonus,
                reason: "streak_bonus",
                note: `${newStreak}일 연속`,
            });
        }
        setTimeout(() => {
            emitPointBurst(window.innerWidth / 2, 180, bonus + streakBonus);
        }, 400);
    }
    async function handleMainToggle(q, evt) {
        if (q.subtasks && q.subtasks.length > 0)
            return;
        if (q.status === "done") {
            await revertQuest(q);
            return;
        }
        const rect = evt.currentTarget.getBoundingClientRect();
        await completeQuest(q);
        if (!q.requires_verification) {
            emitPointBurst(rect.left + rect.width / 2, rect.top + 20, q.points);
        }
    }
    async function handleSubtaskToggle(q, subtaskId, evt) {
        if (!q.subtasks)
            return;
        const nextSubs = q.subtasks.map((s) => s.id === subtaskId ? { ...s, done: !s.done } : s);
        const allSubsDone = nextSubs.every((s) => s.done);
        const wasDone = q.status === "done";
        if (allSubsDone && !wasDone) {
            const rect = evt.currentTarget.getBoundingClientRect();
            await completeQuest(q, nextSubs);
            if (!q.requires_verification) {
                emitPointBurst(rect.left + rect.width / 2, rect.top + 20, q.points);
            }
        }
        else if (!allSubsDone && wasDone) {
            await revertQuest(q, nextSubs);
        }
        else {
            await save({ ...q, subtasks: nextSubs });
        }
    }
    if (!studentId)
        return null;
    return (_jsxs("div", { className: "max-w-3xl mx-auto p-4", children: [_jsxs("header", { className: "mb-4", children: [_jsx("h1", { className: "text-2xl font-bold", children: "\uD018\uC2A4\uD2B8 \uBCF4\uB4DC" }), _jsx("p", { className: "text-stone-500 dark:text-stone-400", children: fmtKDate(today) })] }), _jsx(StudentTabs, { students: students, selected: studentId, onSelect: setStudentId }), _jsxs("section", { className: "card mb-4 flex items-center gap-4", children: [_jsx(AchievementRing, { percent: percent, label: `${buckets.done.length} / ${totalToShow}`, sublabel: "\uC9C4\uD589\uB960", glow: percent >= 1 && totalToShow > 0 }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-3xl", children: tier.icon }), _jsxs("div", { children: [_jsxs("div", { className: "font-bold", children: ["Lv.", tier.level, " ", tier.title] }), _jsx("div", { className: "text-xs text-stone-500 dark:text-stone-400", children: lv.next ? `다음 "${lv.next.title}"까지 ${lv.delta}p` : "최고 레벨 🎉" })] })] }), _jsx("div", { className: "w-full bg-stone-200 dark:bg-stone-800 rounded-full h-2 overflow-hidden", children: _jsx("div", { className: "h-full bg-brand-500 transition-all", style: { width: `${lv.percent * 100}%` } }) }), _jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsxs("div", { children: ["\uD83D\uDCB0 ", _jsx("span", { className: "font-bold text-lg", children: balance }), "p"] }), _jsxs("div", { children: ["\uD83D\uDD25 ", _jsx("span", { className: "font-bold", children: streak }), "\uC77C \uC5F0\uC18D"] })] })] })] }), awaitingVerify.length > 0 && (_jsxs("div", { className: "card mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-sm", children: ["\u23F3 \uBCF4\uD638\uC790 \uD655\uC778 \uB300\uAE30 \uC911 ", _jsxs("b", { children: [awaitingVerify.length, "\uAC1C"] }), " \u2014 \uD655\uC778\uB418\uBA74 \uD3EC\uC778\uD2B8\uAC00 \uB4E4\uC5B4\uC640\uC694."] })), totalToShow === 0 && (_jsx("div", { className: "card text-center py-10 text-stone-500 dark:text-stone-400", children: "\uBC1B\uC740 \uACFC\uC81C\uAC00 \uC5C6\uC5B4\uC694. \uBCF4\uD638\uC790\uC5D0\uAC8C \uBC30\uD3EC \uC694\uCCAD!" })), buckets.overdue.length > 0 && (_jsx(Section, { title: "\uD83D\uDEA8 \uB9C8\uAC10 \uC9C0\uB0A8", count: buckets.overdue.length, tone: "red", children: buckets.overdue.map((q) => (_jsx(QuestCard, { quest: q, today: today, subject: q.subject_id ? subjectMap.get(q.subject_id) : undefined, onToggleMain: handleMainToggle, onToggleSubtask: handleSubtaskToggle }, q.id))) })), buckets.dueToday.length > 0 && (_jsx(Section, { title: "\uD83C\uDFAF \uC624\uB298 \uB9C8\uAC10", count: buckets.dueToday.length, tone: "brand", children: buckets.dueToday.map((q) => (_jsx(QuestCard, { quest: q, today: today, subject: q.subject_id ? subjectMap.get(q.subject_id) : undefined, onToggleMain: handleMainToggle, onToggleSubtask: handleSubtaskToggle }, q.id))) })), buckets.upcoming.length > 0 && (_jsx(Section, { title: "\uD83D\uDCC5 \uACE7 \uB9C8\uAC10", count: buckets.upcoming.length, tone: "muted", children: buckets.upcoming.map((q) => (_jsx(QuestCard, { quest: q, today: today, subject: q.subject_id ? subjectMap.get(q.subject_id) : undefined, onToggleMain: handleMainToggle, onToggleSubtask: handleSubtaskToggle }, q.id))) })), buckets.done.length > 0 && (_jsx(Section, { title: "\u2705 \uC644\uB8CC", count: buckets.done.length, tone: "muted", dim: true, children: buckets.done.map((q) => (_jsx(QuestCard, { quest: q, today: today, subject: q.subject_id ? subjectMap.get(q.subject_id) : undefined, onToggleMain: handleMainToggle, onToggleSubtask: handleSubtaskToggle }, q.id))) })), totalPending === 0 && totalToShow > 0 && (_jsxs("div", { className: "card text-center py-6 bg-gradient-to-br from-amber-100 to-yellow-50 dark:from-amber-900/40 dark:to-amber-950 border-amber-200 dark:border-amber-800", children: [_jsx("div", { className: "text-4xl mb-2", children: "\uD83C\uDF89" }), _jsx("div", { className: "font-bold text-lg", children: "\uB0A8\uC740 \uD018\uC2A4\uD2B8 \uC5C6\uC74C!" }), _jsxs("div", { className: "text-sm text-stone-600 dark:text-stone-300 mt-1", children: ["\uC644\uC8FC \uBCF4\uB108\uC2A4 +30p \u00B7 \uC5F0\uC18D ", streak, "\uC77C (+", calcStreakBonus(streak), "p)"] })] }))] }));
}
function Section({ title, count, tone, dim, children, }) {
    const color = tone === "red"
        ? "text-red-600 dark:text-red-400"
        : tone === "brand"
            ? "text-brand-600 dark:text-brand-400"
            : "text-stone-500 dark:text-stone-400";
    return (_jsxs("section", { className: `mb-4 ${dim ? "opacity-80" : ""}`, children: [_jsxs("h2", { className: `font-bold mb-2 ${color}`, children: [title, " ", _jsxs("span", { className: "text-stone-400", children: ["(", count, ")"] })] }), _jsx("div", { className: "space-y-2", children: children })] }));
}
function QuestCard({ quest, today, subject, onToggleMain, onToggleSubtask, }) {
    const done = quest.status === "done";
    const hasSubs = !!quest.subtasks && quest.subtasks.length > 0;
    const awaitingVerify = done && quest.requires_verification && !quest.verified;
    const verified = done && quest.verified;
    const rejected = !!quest.rejectedReason;
    const locked = verified;
    const overdue = !done && quest.due_date < today;
    const dueToday = !done && quest.due_date === today;
    const handleClick = (e) => {
        if (hasSubs)
            return;
        if (locked)
            return;
        onToggleMain(quest, e);
    };
    const dueLabel = quest.due_date.slice(5).replace("-", ".");
    const dueChipStyle = overdue
        ? { backgroundColor: "#fee2e2", color: "#991b1b" }
        : dueToday
            ? { backgroundColor: "#fed7aa", color: "#9a3412" }
            : { backgroundColor: "#e0e7ff", color: "#3730a3" };
    const dueChipText = overdue ? `⚠️ ${dueLabel} 지남` : dueToday ? `🔥 오늘 마감` : `📅 ${dueLabel} 마감`;
    return (_jsxs("div", { className: `card transition ${done ? "" : "hover:shadow-md"} ${hasSubs || locked ? "" : "cursor-pointer"} ${overdue ? "border-red-300 dark:border-red-800" : ""}`, onClick: handleClick, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-12 h-12 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 transition border-2 ${done
                            ? awaitingVerify
                                ? "bg-amber-500 border-amber-500 text-white"
                                : "bg-emerald-500 border-emerald-500 text-white"
                            : overdue
                                ? "bg-white dark:bg-stone-900 border-red-400 dark:border-red-700 text-stone-400 dark:text-stone-500"
                                : "bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-600 text-stone-300 dark:text-stone-600 hover:border-brand-500 hover:text-brand-500"}`, "aria-label": done ? "완료" : "체크해서 완료", role: "checkbox", "aria-checked": done, children: done ? (awaitingVerify ? "⏳" : "✓") : "✓" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: `font-semibold truncate ${done ? "line-through" : ""}`, children: quest.title }), _jsxs("div", { className: "text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2 mt-0.5 flex-wrap", children: [subject && (_jsxs("span", { style: { color: subject.color }, children: [subject.icon, " ", subject.name] })), _jsxs("span", { children: [quest.target, quest.unit] }), _jsx("span", { children: DIFF_STARS[quest.difficulty] }), _jsx("span", { className: "chip", style: dueChipStyle, children: dueChipText }), awaitingVerify && (_jsx("span", { className: "chip", style: { backgroundColor: "#fef3c7", color: "#92400e" }, children: "\uBCF4\uD638\uC790 \uD655\uC778 \uB300\uAE30" })), rejected && (_jsx("span", { className: "chip", style: { backgroundColor: "#fee2e2", color: "#991b1b" }, children: "\uB2E4\uC2DC \uD574\uC8FC\uC138\uC694" }))] }), quest.note && (_jsxs("div", { className: "text-xs text-stone-500 dark:text-stone-400 mt-1 italic", children: ["\uD83D\uDCA1 ", quest.note] })), rejected && (_jsxs("div", { className: "text-xs text-red-500 mt-1", children: ["\uC0AC\uC720: ", quest.rejectedReason] }))] }), _jsxs("div", { className: "text-right flex-shrink-0 flex flex-col items-end gap-1", children: [_jsxs("div", { className: "font-bold text-brand-600 dark:text-brand-400", children: ["+", quest.points, "p"] }), awaitingVerify && (_jsx("div", { className: "text-[10px] text-amber-600 dark:text-amber-400", children: "\uD655\uC778 \uD6C4 \uC9C0\uAE09" })), verified && _jsx("div", { className: "text-xs", children: "\uD83D\uDD12" }), done && !locked && !hasSubs && (_jsx("button", { className: "text-xs text-stone-500 dark:text-stone-400 underline", onClick: (e) => {
                                    e.stopPropagation();
                                    onToggleMain(quest, e);
                                }, "aria-label": "\uCDE8\uC18C", children: "\u21BA \uCDE8\uC18C" }))] })] }), hasSubs && (_jsx("div", { className: "mt-3 space-y-1 pl-2 border-l-2 border-stone-200 dark:border-stone-700", children: quest.subtasks.map((s) => (_jsxs("button", { disabled: locked, onClick: (e) => {
                        e.stopPropagation();
                        if (locked)
                            return;
                        onToggleSubtask(quest, s.id, e);
                    }, className: `flex items-center gap-2 w-full text-left py-1 rounded px-1 ${locked
                        ? "cursor-not-allowed"
                        : "hover:bg-stone-50 dark:hover:bg-stone-800"}`, children: [_jsx("div", { className: `w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${s.done
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-stone-300 dark:border-stone-600"}`, children: s.done && "✓" }), _jsx("span", { className: `text-sm ${s.done ? "line-through text-stone-400" : ""}`, children: s.label })] }, s.id))) }))] }));
}
async function buildPerfectsMap(studentId) {
    const ledger = (await storage.read(KEYS.pointLedger(studentId))) ?? [];
    const map = {};
    for (const e of ledger) {
        if (e.reason === "perfect_day")
            map[e.date] = true;
    }
    return map;
}
// 퀘스트 체크 해제: 해당 퀘스트 포인트 + (완주 상태가 깨졌다면) 그날의 완주/스트릭 보너스도 회수
async function undoQuestAndBonuses(q, studentId, today) {
    const data = (await storage.read(KEYS.pointLedger(studentId))) ?? [];
    const allQuests = await loadStudentQuests(studentId);
    const stillPerfect = evaluatePerfectForToday(allQuests, today);
    const next = data.filter((e) => {
        if (e.quest_id === q.id)
            return false;
        if (!stillPerfect && e.date === today) {
            if (e.reason === "perfect_day" || e.reason === "streak_bonus")
                return false;
        }
        return true;
    });
    if (next.length !== data.length) {
        await storage.write(KEYS.pointLedger(studentId), next);
    }
}
