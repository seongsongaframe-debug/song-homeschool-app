import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { useRewards, usePurchases } from "../store/useRewards";
import { usePoints } from "../store/usePoints";
import { useAuth } from "../store/AuthContext";
const KIND_LABEL = {
    treat: "간식",
    privilege: "특권",
    item: "아이템",
    experience: "경험",
};
export default function Shop() {
    const { students } = useData();
    const { activeChildId, setChild } = useAuth();
    const [studentId, setStudentId] = useState(activeChildId ?? students[0]?.id ?? "");
    const { rewards } = useRewards();
    const { purchases, save: savePurchase } = usePurchases();
    const { balance } = usePoints(studentId);
    useEffect(() => {
        if (studentId && studentId !== activeChildId)
            setChild(studentId);
    }, [studentId]);
    const myPurchases = useMemo(() => purchases.filter((p) => p.student_id === studentId), [purchases, studentId]);
    const pendingMine = myPurchases.filter((p) => p.status === "pending");
    async function request(reward) {
        if (reward.cost_points > balance)
            return;
        const p = {
            id: crypto.randomUUID(),
            student_id: studentId,
            reward_id: reward.id,
            requestedAt: new Date().toISOString(),
            status: "pending",
            cost_points: reward.cost_points,
        };
        await savePurchase(p);
    }
    async function cancel(p) {
        if (p.status !== "pending")
            return;
        await savePurchase({ ...p, status: "rejected", decidedAt: new Date().toISOString() });
    }
    if (!studentId)
        return null;
    // 학생 한정 보상은 본인 것만, 공용은 모두 노출.
    const activeRewards = rewards.filter((r) => r.active && (!r.student_id || r.student_id === studentId));
    return (_jsxs("div", { className: "max-w-3xl mx-auto p-4", children: [_jsxs("header", { className: "mb-4", children: [_jsx("h1", { className: "text-2xl font-bold", children: "\uD83C\uDFEA \uBCF4\uC0C1 \uC0C1\uC810" }), _jsx("p", { className: "text-stone-500 dark:text-stone-400", children: "\uD3EC\uC778\uD2B8\uB85C \uAD50\uD658\uD558\uC138\uC694. \uAD6C\uB9E4\uB294 \uBCF4\uD638\uC790 \uC2B9\uC778 \uD6C4 \uD655\uC815\uB429\uB2C8\uB2E4." })] }), _jsx(StudentTabs, { students: students, selected: studentId, onSelect: setStudentId }), _jsxs("section", { className: "card mb-4 text-center", children: [_jsx("div", { className: "text-sm text-stone-500 dark:text-stone-400", children: "\uB0B4 \uD3EC\uC778\uD2B8" }), _jsxs("div", { className: "text-4xl font-extrabold text-brand-600 dark:text-brand-400", children: ["\uD83D\uDCB0 ", balance, "p"] })] }), pendingMine.length > 0 && (_jsxs("section", { className: "card mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", children: [_jsx("h3", { className: "font-bold mb-2", children: "\u23F3 \uC2B9\uC778 \uB300\uAE30 \uC911" }), pendingMine.map((p) => {
                        const r = rewards.find((x) => x.id === p.reward_id);
                        return (_jsxs("div", { className: "flex items-center gap-2 py-1", children: [_jsx("span", { children: r?.icon ?? "🎁" }), _jsx("span", { className: "flex-1", children: r?.title ?? "(삭제된 보상)" }), _jsxs("span", { className: "text-sm", children: [p.cost_points, "p"] }), _jsx("button", { className: "text-xs text-stone-500 hover:text-red-500", onClick: () => cancel(p), children: "\uCDE8\uC18C" })] }, p.id));
                    })] })), _jsxs("section", { children: [activeRewards.length === 0 && (_jsx("div", { className: "card text-center py-10 text-stone-500 dark:text-stone-400", children: "\uC544\uC9C1 \uBCF4\uC0C1\uC774 \uB4F1\uB85D\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694." })), _jsx("div", { className: "grid grid-cols-2 gap-3", children: activeRewards.map((r) => {
                            const canAfford = balance >= r.cost_points;
                            return (_jsxs("div", { className: "card flex flex-col text-center", children: [r.image_url ? (_jsx("div", { className: "aspect-square w-full mb-2 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 flex items-center justify-center", children: _jsx("img", { src: r.image_url, alt: r.title, className: "w-full h-full object-contain", loading: "lazy", onError: (e) => {
                                                e.currentTarget.style.display = "none";
                                            } }) })) : (_jsx("div", { className: "text-5xl mb-2", children: r.icon })), _jsx("div", { className: "font-bold", children: r.title }), _jsx("div", { className: "text-xs text-stone-500 dark:text-stone-400 mb-2", children: KIND_LABEL[r.kind] }), r.description && (_jsx("div", { className: "text-xs text-stone-500 dark:text-stone-400 mb-2 flex-1", children: r.description })), _jsxs("div", { className: "font-bold text-lg mb-2", children: [r.cost_points, "p"] }), _jsx("button", { className: canAfford ? "btn-primary" : "btn-ghost opacity-50", disabled: !canAfford, onClick: () => request(r), children: canAfford ? "구매 요청" : "포인트 부족" })] }, r.id));
                        }) })] }), _jsxs("section", { className: "mt-6", children: [_jsx("h3", { className: "font-bold mb-2", children: "\uCD5C\uADFC \uB0B4\uC5ED" }), _jsxs("div", { className: "space-y-1 text-sm", children: [myPurchases.slice(0, 10).map((p) => {
                                const r = rewards.find((x) => x.id === p.reward_id);
                                return (_jsxs("div", { className: "card py-2 flex items-center gap-2", children: [_jsx("span", { children: r?.icon ?? "🎁" }), _jsx("span", { className: "flex-1 truncate", children: r?.title ?? "(삭제됨)" }), _jsx(StatusChip, { status: p.status }), _jsx("span", { className: "text-stone-400 text-xs", children: p.requestedAt.slice(5, 10) })] }, p.id));
                            }), myPurchases.length === 0 && (_jsx("div", { className: "text-stone-400 text-center py-6", children: "\uC544\uC9C1 \uB0B4\uC5ED \uC5C6\uC74C" }))] })] })] }));
}
function StatusChip({ status }) {
    const style = {
        pending: { bg: "#fef3c7", text: "#92400e", label: "승인 대기" },
        approved: { bg: "#dcfce7", text: "#166534", label: "승인" },
        rejected: { bg: "#fee2e2", text: "#991b1b", label: "거부" },
        fulfilled: { bg: "#dbeafe", text: "#1e40af", label: "수령 완료" },
    }[status];
    return (_jsx("span", { className: "chip", style: { backgroundColor: style.bg, color: style.text }, children: style.label }));
}
