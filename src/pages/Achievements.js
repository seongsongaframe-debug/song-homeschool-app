import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { useAuth } from "../store/AuthContext";
import { usePoints } from "../store/usePoints";
import { tierFor, progressToNext } from "../lib/levels";
import { BADGES } from "../data/badges";
import { evaluateBadges, gatherStats } from "../lib/badges";
import { storage, KEYS } from "../storage";
export default function Achievements() {
    const { students } = useData();
    const { activeChildId, setChild } = useAuth();
    const [studentId, setStudentId] = useState(activeChildId ?? students[0]?.id ?? "");
    const { balance, ledger } = usePoints(studentId);
    const [earnedIds, setEarnedIds] = useState(new Set());
    const [stats, setStats] = useState(null);
    useEffect(() => {
        if (studentId && studentId !== activeChildId)
            setChild(studentId);
    }, [studentId]);
    useEffect(() => {
        if (!studentId)
            return;
        (async () => {
            await evaluateBadges(studentId);
            const earned = (await storage.read(KEYS.badgesEarned(studentId))) ?? [];
            setEarnedIds(new Set(earned.map((e) => e.badge_id)));
            setStats(await gatherStats(studentId));
        })();
    }, [studentId, ledger.length]);
    const tier = tierFor(balance);
    const lv = progressToNext(balance);
    const recent = useMemo(() => [...ledger].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 20), [ledger]);
    if (!studentId)
        return null;
    const earnedBadges = BADGES.filter((b) => earnedIds.has(b.id));
    const lockedBadges = BADGES.filter((b) => !earnedIds.has(b.id));
    return (_jsxs("div", { className: "max-w-3xl mx-auto p-4", children: [_jsxs("header", { className: "mb-4", children: [_jsx("h1", { className: "text-2xl font-bold", children: "\uD83C\uDFC6 \uC131\uCDE8" }), _jsx("p", { className: "text-stone-500 dark:text-stone-400", children: "\uB808\uBCA8\u00B7\uBC30\uC9C0\u00B7\uD3EC\uC778\uD2B8 \uB0B4\uC5ED" })] }), _jsx(StudentTabs, { students: students, selected: studentId, onSelect: setStudentId }), _jsx("section", { className: "card mb-4", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "text-6xl", children: tier.icon }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "text-sm text-stone-500 dark:text-stone-400", children: ["Lv.", tier.level] }), _jsx("div", { className: "text-xl font-bold", children: tier.title }), _jsx("div", { className: "w-full bg-stone-200 dark:bg-stone-800 rounded-full h-2 mt-1 overflow-hidden", children: _jsx("div", { className: "h-full bg-brand-500 transition-all", style: { width: `${lv.percent * 100}%` } }) }), _jsx("div", { className: "text-xs text-stone-500 dark:text-stone-400 mt-1", children: lv.next ? `${lv.next.title}까지 ${lv.delta}p` : "최고 레벨" })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-xs text-stone-500 dark:text-stone-400", children: "\uBCF4\uC720" }), _jsxs("div", { className: "text-2xl font-extrabold text-brand-600 dark:text-brand-400", children: [balance, "p"] })] })] }) }), stats && (_jsxs("section", { className: "card mb-4 grid grid-cols-4 gap-2 text-center", children: [_jsx(Stat, { label: "\uB204\uC801", value: `${stats.totalPoints}p` }), _jsx(Stat, { label: "\uC644\uC8FC\uC758 \uB0A0", value: stats.perfectDaysCount }), _jsx(Stat, { label: "\uCD5C\uC7A5 \uC5F0\uC18D", value: `${stats.maxStreak}일` }), _jsx(Stat, { label: "\uC644\uB8CC \uD018\uC2A4\uD2B8", value: stats.allQuests.length })] })), _jsxs("section", { className: "mb-4", children: [_jsxs("h3", { className: "font-bold mb-2", children: ["\uD83C\uDFC5 \uBC30\uC9C0 (", earnedBadges.length, " / ", BADGES.length, ")"] }), _jsxs("div", { className: "grid grid-cols-3 md:grid-cols-4 gap-2", children: [earnedBadges.map((b) => (_jsxs("div", { className: "card text-center py-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30", children: [_jsx("div", { className: "text-3xl", children: b.icon }), _jsx("div", { className: "font-bold text-sm mt-1", children: b.title }), _jsx("div", { className: "text-[10px] text-stone-500 dark:text-stone-400 mt-0.5", children: b.description })] }, b.id))), lockedBadges.map((b) => (_jsxs("div", { className: "card text-center py-3 opacity-50", children: [_jsx("div", { className: "text-3xl grayscale", children: b.icon }), _jsx("div", { className: "font-bold text-sm mt-1", children: b.title }), _jsx("div", { className: "text-[10px] text-stone-500 dark:text-stone-400 mt-0.5", children: b.description })] }, b.id)))] })] }), _jsxs("section", { children: [_jsx("h3", { className: "font-bold mb-2", children: "\uD83D\uDCDC \uCD5C\uADFC \uD3EC\uC778\uD2B8 \uB0B4\uC5ED" }), _jsxs("div", { className: "space-y-1", children: [recent.map((e) => (_jsxs("div", { className: "card py-2 flex items-center gap-2 text-sm", children: [_jsx("span", { className: "text-stone-400 text-xs w-16", children: e.date.slice(5) }), _jsxs("span", { className: "flex-1 truncate", children: [reasonLabel(e.reason), e.note ? ` — ${e.note}` : ""] }), _jsxs("span", { className: `font-bold ${e.delta >= 0
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-red-500 dark:text-red-400"}`, children: [e.delta >= 0 ? "+" : "", e.delta, "p"] })] }, e.id))), recent.length === 0 && (_jsx("div", { className: "text-center text-stone-400 py-6 text-sm", children: "\uB0B4\uC5ED \uC5C6\uC74C" }))] })] })] }));
}
function Stat({ label, value }) {
    return (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-stone-500 dark:text-stone-400", children: label }), _jsx("div", { className: "font-bold", children: value })] }));
}
function reasonLabel(r) {
    return {
        quest_complete: "퀘스트 완료",
        streak_bonus: "연속 보너스",
        perfect_day: "완주 보너스",
        reward_purchase: "보상 구매",
        manual_adjust: "수동 조정",
    }[r] ?? r;
}
