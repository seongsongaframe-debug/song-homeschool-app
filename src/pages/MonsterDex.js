import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useData } from "../store/DataContext";
import { useAuth } from "../store/AuthContext";
import { StudentTabs } from "../components/StudentTabs";
import { usePoints } from "../store/usePoints";
import { useMonsters } from "../store/useMonsters";
import { display } from "../lib/monsters";
import { MONSTER_SPECIES, findSpecies } from "../data/monsters";
import { EGG_PRICE } from "../types";
import { todayISO } from "../lib/dates";
const RARITY_LABEL = {
    common: { label: "흔함", color: "#64748b" },
    rare: { label: "희귀", color: "#7c3aed" },
    epic: { label: "전설", color: "#dc2626" },
};
export default function MonsterDex() {
    const { students } = useData();
    const { activeChildId, setChild, role } = useAuth();
    const [studentId, setStudentId] = useState(activeChildId ?? students[0]?.id ?? "");
    const { balance, append } = usePoints(studentId);
    const { collection, buyEgg, releaseActive, reload } = useMonsters(studentId);
    useEffect(() => {
        if (studentId && studentId !== activeChildId)
            setChild(studentId);
    }, [studentId]);
    // 도감에 수집된 종족 id 집합
    const collectedSpecies = useMemo(() => {
        const set = new Set();
        for (const m of collection.dex)
            if (m.species_id)
                set.add(m.species_id);
        if (collection.active?.species_id)
            set.add(collection.active.species_id);
        return set;
    }, [collection]);
    const totalSpecies = MONSTER_SPECIES.length;
    const collectedCount = collectedSpecies.size;
    async function handleBuyEgg() {
        if (!studentId)
            return;
        if (collection.active) {
            alert("이미 키우는 친구가 있어요!\n진화가 끝나면 새 알을 살 수 있어요.");
            return;
        }
        if (balance < EGG_PRICE) {
            alert(`포인트가 부족해요!\n잔고: ${balance}p / 필요: ${EGG_PRICE}p`);
            return;
        }
        const result = await buyEgg();
        if (!result.ok)
            return;
        await append({
            student_id: studentId,
            date: todayISO(),
            delta: -EGG_PRICE,
            reason: "reward_purchase",
            note: "🥚 알 구매 (몬스터 도감)",
        });
    }
    async function handleRelease() {
        if (!confirm("정말 이 친구를 보내줄까요?\n진척도가 사라져요."))
            return;
        await releaseActive();
        await reload();
    }
    if (!studentId)
        return null;
    return (_jsxs("div", { className: "max-w-3xl mx-auto p-4", children: [_jsxs("header", { className: "mb-4", children: [_jsx("h1", { className: "text-2xl font-bold", children: "\uD83D\uDCD3 \uBAAC\uC2A4\uD130 \uB3C4\uAC10" }), _jsx("p", { className: "text-stone-500 dark:text-stone-400", children: "\uC54C\uC744 \uC0AC\uC11C \uD0A4\uC6B0\uACE0, \uD018\uC2A4\uD2B8\uB97C \uC644\uB8CC\uD560 \uB54C\uB9C8\uB2E4 \uC790\uB77C\uC694." })] }), _jsx(StudentTabs, { students: students, selected: studentId, onSelect: setStudentId }), _jsx(ActiveCard, { active: collection.active, balance: balance, eggPrice: EGG_PRICE, onBuyEgg: handleBuyEgg, onRelease: role === "parent" ? handleRelease : undefined }), _jsxs("section", { className: "card", children: [_jsxs("header", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "font-bold", children: "\uD83C\uDFC6 \uB3C4\uAC10" }), _jsxs("span", { className: "text-sm text-stone-500 dark:text-stone-400", children: [collectedCount, " / ", totalSpecies] })] }), _jsx("div", { className: "grid grid-cols-3 sm:grid-cols-5 gap-3", children: MONSTER_SPECIES.map((sp) => {
                            const collected = collectedSpecies.has(sp.id);
                            const final = sp.stages[sp.stages.length - 1];
                            const rar = RARITY_LABEL[sp.rarity] ?? RARITY_LABEL.common;
                            return (_jsxs("div", { className: `flex flex-col items-center text-center p-3 rounded-xl border ${collected
                                    ? "border-brand-300 bg-white dark:bg-stone-900 dark:border-brand-700"
                                    : "border-stone-200 bg-stone-50 dark:bg-stone-800 dark:border-stone-700 opacity-60"}`, children: [_jsx("div", { className: "text-4xl mb-1", children: collected ? final.emoji : "❓" }), _jsx("div", { className: "text-xs font-bold", children: collected ? final.name : "???" }), _jsx("span", { className: "chip text-[10px] mt-1", style: { backgroundColor: rar.color + "22", color: rar.color }, children: rar.label }), collected && (_jsx("div", { className: "text-[10px] text-stone-500 dark:text-stone-400 mt-1", children: sp.description }))] }, sp.id));
                        }) })] }), _jsx(DexEntries, { dex: collection.dex })] }));
}
function ActiveCard({ active, balance, eggPrice, onBuyEgg, onRelease, }) {
    if (!active) {
        return (_jsxs("section", { className: "card text-center mb-4", children: [_jsx("div", { className: "text-6xl mb-2", children: "\uD83E\uDEBA" }), _jsx("h2", { className: "font-bold mb-1", children: "\uC544\uC9C1 \uD0A4\uC6B0\uB294 \uCE5C\uAD6C\uAC00 \uC5C6\uC5B4\uC694" }), _jsx("p", { className: "text-sm text-stone-500 dark:text-stone-400 mb-4", children: "\uC54C\uC744 \uC0AC\uC11C \uBD80\uD654\uC2DC\uCF1C \uBCF4\uC138\uC694. \uD018\uC2A4\uD2B8 5\uAC1C\uB97C \uC644\uB8CC\uD558\uBA74 \uBD80\uD654\uD574\uC694!" }), _jsxs("button", { className: balance >= eggPrice ? "btn-primary" : "btn-ghost opacity-50", disabled: balance < eggPrice, onClick: onBuyEgg, children: ["\uD83E\uDD5A \uC54C \uAD6C\uB9E4 \u2014 ", eggPrice, "p"] }), balance < eggPrice && (_jsxs("p", { className: "text-xs text-stone-400 mt-2", children: ["\uC794\uACE0 ", balance, "p \u2014 ", eggPrice - balance, "p \uB354 \uD544\uC694\uD574\uC694"] }))] }));
    }
    const d = display(active);
    const sp = active.species_id ? findSpecies(active.species_id) : null;
    const next = d.next;
    const totalStages = sp ? sp.stages.length + 1 : 4; // 알(0) + stages
    const cur = active.stage;
    // 진행률: 다음 단계까지 (없으면 100%)
    const startProg = active.stage === 0 ? 0 : (sp?.stages[cur - 1]?.questsToReach ?? 0);
    const target = next ? (active.stage === 0 ? 5 : (sp?.stages[cur]?.questsToReach ?? active.progress)) : active.progress;
    const pct = next
        ? Math.min(1, Math.max(0, (active.progress - startProg) / (target - startProg || 1)))
        : 1;
    return (_jsxs("section", { className: "card text-center mb-4", children: [_jsx("div", { className: "text-7xl mb-2", children: d.emoji }), _jsx("h2", { className: "font-bold text-xl mb-1", children: d.name }), sp && (_jsx("div", { className: "text-xs text-stone-500 dark:text-stone-400 mb-2", children: sp.description })), _jsxs("div", { className: "text-xs text-stone-400 mb-3", children: ["\uB2E8\uACC4 ", cur, " / ", totalStages - 1] }), next && (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-full bg-stone-200 dark:bg-stone-800 rounded-full h-3 overflow-hidden mb-1", children: _jsx("div", { className: "h-full bg-brand-500 transition-all", style: { width: `${pct * 100}%` } }) }), _jsx("div", { className: "text-xs text-stone-500 dark:text-stone-400 mb-3", children: d.isEgg
                            ? `부화까지 퀘스트 ${next.remaining}개 더!`
                            : `다음 ${next.emoji} ${next.name}까지 ${next.remaining}개` })] })), !next && (_jsx("div", { className: "text-sm text-amber-700 dark:text-amber-400 mb-3", children: "\u2728 \uCD5C\uC885 \uC9C4\uD654 \uC644\uB8CC! \uACE7 \uB3C4\uAC10\uC73C\uB85C \uC774\uB3D9\uD574\uC694." })), _jsxs("div", { className: "flex justify-center gap-2", children: [_jsxs("button", { className: "btn-ghost opacity-50", disabled: true, title: "\uD0A4\uC6B0\uB294 \uCE5C\uAD6C\uAC00 \uC788\uC5B4 \uC0C8 \uC54C\uC744 \uC0B4 \uC218 \uC5C6\uC5B4\uC694", children: ["\uD83E\uDD5A \uC54C \uAD6C\uB9E4 \u2014 ", eggPrice, "p"] }), onRelease && (_jsx("button", { className: "btn-ghost text-xs text-red-500", onClick: onRelease, title: "\uBCF4\uD638\uC790\uB9CC \uAC00\uB2A5", children: "\uBC29\uC0DD" }))] })] }));
}
function DexEntries({ dex }) {
    if (dex.length === 0)
        return null;
    return (_jsxs("section", { className: "card mt-4", children: [_jsx("h3", { className: "font-bold mb-2", children: "\uD83D\uDCDC \uC878\uC5C5\uD55C \uCE5C\uAD6C\uB4E4" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3", children: dex.map((m) => {
                    const d = display(m);
                    return (_jsxs("div", { className: "flex items-center gap-2 p-2 rounded-lg bg-stone-50 dark:bg-stone-800", children: [_jsx("span", { className: "text-3xl", children: d.emoji }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-bold text-sm truncate", children: d.name }), _jsx("div", { className: "text-[10px] text-stone-500", children: m.acquiredAt.slice(0, 10) })] })] }, m.id));
                }) })] }));
}
