import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
import { useData } from "../store/DataContext";
import { useRewards, usePurchases } from "../store/useRewards";
import { useAuth } from "../store/AuthContext";
import { evaluatePerfectForToday, loadStudentQuests } from "../lib/quest-eval";
import { manualSeedHyein } from "../lib/auto-quests";
import { todayISO } from "../lib/dates";
const KIND_LABEL = {
    treat: "간식",
    privilege: "특권",
    item: "아이템",
    experience: "경험",
};
const DEFAULT_REWARDS = [
    { title: "아이스크림 1개", icon: "🍦", cost_points: 50, kind: "treat", active: true },
    { title: "닌텐도 30분", icon: "🎮", cost_points: 100, kind: "privilege", active: true },
    { title: "보드게임 1판", icon: "🎲", cost_points: 30, kind: "experience", active: true },
    { title: "외식 메뉴 선택권", icon: "🍜", cost_points: 300, kind: "privilege", active: true },
    { title: "책 1권 구매", icon: "📘", cost_points: 200, kind: "item", active: true },
];
export default function Manage() {
    const { students, reset } = useData();
    const { pinSet, setPin, clearPin, exitParent } = useAuth();
    const { rewards, save: saveReward, remove: removeReward } = useRewards();
    const { purchases, save: savePurchase } = usePurchases();
    const [editing, setEditing] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [pinInput, setPinInput] = useState("");
    // ----- 혜인 주간 자동 부여 -----
    const [autoSeedBusy, setAutoSeedBusy] = useState(false);
    const [autoSeedToast, setAutoSeedToast] = useState(null);
    async function triggerHyeinAutoSeed() {
        setAutoSeedBusy(true);
        try {
            const r = await manualSeedHyein();
            const msgByReason = {
                seeded: `✓ ${r.weekStart} 주에 ${r.created}개 퀘스트 생성`,
                already_flagged: `이미 ${r.weekStart} 주는 자동 생성됨 (스킵)`,
                existing_quests: `${r.weekStart} 주에 이미 퀘스트가 있어 스킵`,
            };
            setAutoSeedToast(msgByReason[r.reason]);
        }
        catch (e) {
            setAutoSeedToast(`오류: ${e.message}`);
        }
        finally {
            setAutoSeedBusy(false);
            setTimeout(() => setAutoSeedToast(null), 5000);
        }
    }
    // ----- 직접 포인트 지급 폼 -----
    const [grantStudentId, setGrantStudentId] = useState(students[0]?.id ?? "");
    const [grantAmount, setGrantAmount] = useState(10);
    const [grantNote, setGrantNote] = useState("");
    const [grantBusy, setGrantBusy] = useState(false);
    const [grantToast, setGrantToast] = useState(null);
    async function grantPoints() {
        if (!grantStudentId || grantAmount === 0 || !grantNote.trim())
            return;
        if (grantAmount < 0) {
            const ok = confirm(`${grantAmount}p 차감합니다. 계속할까요?\n\n사유: ${grantNote}`);
            if (!ok)
                return;
        }
        setGrantBusy(true);
        const ledger = (await storage.read(KEYS.pointLedger(grantStudentId))) ?? [];
        const next = [
            ...ledger,
            {
                id: crypto.randomUUID(),
                student_id: grantStudentId,
                date: todayISO(),
                delta: grantAmount,
                reason: "manual_adjust",
                note: grantNote.trim(),
            },
        ];
        await storage.write(KEYS.pointLedger(grantStudentId), next);
        const s = students.find((x) => x.id === grantStudentId);
        setGrantToast(`${s?.emoji ?? ""} ${s?.name ?? ""} 에게 ${grantAmount > 0 ? "+" : ""}${grantAmount}p ${grantAmount > 0 ? "지급" : "차감"} 완료`);
        setGrantNote("");
        setGrantAmount(10);
        setGrantBusy(false);
        setTimeout(() => setGrantToast(null), 3000);
    }
    async function approve(p) {
        await savePurchase({
            ...p,
            status: "approved",
            decidedAt: new Date().toISOString(),
        });
        const data = (await storage.read(KEYS.pointLedger(p.student_id))) ?? [];
        const next = [
            ...data,
            {
                id: crypto.randomUUID(),
                student_id: p.student_id,
                date: new Date().toISOString().slice(0, 10),
                delta: -p.cost_points,
                reason: "reward_purchase",
                reward_id: p.reward_id,
            },
        ];
        await storage.write(KEYS.pointLedger(p.student_id), next);
    }
    async function reject(p) {
        await savePurchase({
            ...p,
            status: "rejected",
            decidedAt: new Date().toISOString(),
        });
    }
    async function fulfill(p) {
        await savePurchase({
            ...p,
            status: "fulfilled",
            decidedAt: new Date().toISOString(),
        });
    }
    async function addDefaults() {
        for (const r of DEFAULT_REWARDS) {
            await saveReward({ id: crypto.randomUUID(), ...r });
        }
    }
    const pending = purchases.filter((p) => p.status === "pending");
    const approved = purchases.filter((p) => p.status === "approved");
    const [verifyQueue, setVerifyQueue] = useState([]);
    const [recentVerified, setRecentVerified] = useState([]);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const loadVerify = useCallback(async () => {
        const queue = [];
        const recent = [];
        for (const s of students) {
            const keys = await storage.list(`quests/${s.id}/`);
            for (const k of keys) {
                const q = await storage.read(k);
                if (!q)
                    continue;
                if (q.status === "done" &&
                    q.requires_verification &&
                    !q.verified &&
                    !q.rejectedReason) {
                    queue.push(q);
                }
                else if (q.status === "done" && q.verified) {
                    recent.push(q);
                }
            }
        }
        queue.sort((a, b) => (a.due_date < b.due_date ? 1 : -1));
        recent.sort((a, b) => (b.verifiedAt ?? "").localeCompare(a.verifiedAt ?? ""));
        setVerifyQueue(queue);
        setRecentVerified(recent.slice(0, 15)); // 최근 15건
    }, [students]);
    useEffect(() => {
        loadVerify();
    }, [loadVerify]);
    async function verifyQuest(q) {
        const today = todayISO();
        const next = {
            ...q,
            verified: true,
            verifiedAt: new Date().toISOString(),
            rejectedReason: undefined,
        };
        await storage.write(KEYS.quest(q.student_id, q.id), next);
        const ledger = (await storage.read(KEYS.pointLedger(q.student_id))) ?? [];
        if (!ledger.some((e) => e.quest_id === q.id && e.reason === "quest_complete")) {
            const nextLedger = [
                ...ledger,
                {
                    id: crypto.randomUUID(),
                    student_id: q.student_id,
                    date: today,
                    delta: q.points,
                    reason: "quest_complete",
                    quest_id: q.id,
                    note: q.title,
                },
            ];
            await storage.write(KEYS.pointLedger(q.student_id), nextLedger);
        }
        await loadVerify();
    }
    // 확인 취소: verified=true 였던 퀘스트를 다시 대기 상태로 되돌림.
    // 점수/완주 보너스 회수, status 는 done 유지(아이 입장에서 다시 확인 받을 수 있게).
    async function unverifyQuest(q) {
        const today = todayISO();
        const next = {
            ...q,
            verified: false,
            verifiedAt: undefined,
        };
        await storage.write(KEYS.quest(q.student_id, q.id), next);
        // ledger 에서 이 quest 의 quest_complete 항목 제거
        const ledger = (await storage.read(KEYS.pointLedger(q.student_id))) ?? [];
        let nextLedger = ledger.filter((e) => !(e.quest_id === q.id && e.reason === "quest_complete"));
        // 완주 상태 깨졌으면 today 의 perfect/streak 도 회수
        const allQuests = await loadStudentQuests(q.student_id);
        const stillPerfect = evaluatePerfectForToday(allQuests, today);
        if (!stillPerfect) {
            nextLedger = nextLedger.filter((e) => {
                if (e.date !== today)
                    return true;
                return e.reason !== "perfect_day" && e.reason !== "streak_bonus";
            });
        }
        if (nextLedger.length !== ledger.length) {
            await storage.write(KEYS.pointLedger(q.student_id), nextLedger);
        }
        await loadVerify();
    }
    async function rejectQuest(q, reason) {
        const today = todayISO();
        const next = {
            ...q,
            status: "pending",
            completedAt: undefined,
            verified: false,
            rejectedReason: reason.trim() || "다시 해주세요",
        };
        await storage.write(KEYS.quest(q.student_id, q.id), next);
        // 완주 상태가 깨졌으면 오늘의 perfect/streak 보너스 회수
        const allQuests = await loadStudentQuests(q.student_id);
        const stillPerfect = evaluatePerfectForToday(allQuests, today);
        if (!stillPerfect) {
            const ledger = (await storage.read(KEYS.pointLedger(q.student_id))) ?? [];
            const nextLedger = ledger.filter((e) => {
                if (e.date !== today)
                    return true;
                return e.reason !== "perfect_day" && e.reason !== "streak_bonus";
            });
            if (nextLedger.length !== ledger.length) {
                await storage.write(KEYS.pointLedger(q.student_id), nextLedger);
            }
        }
        await loadVerify();
    }
    return (_jsxs("div", { className: "max-w-3xl mx-auto p-4", children: [_jsxs("header", { className: "mb-4 flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold", children: "\uD83D\uDD27 \uBCF4\uD638\uC790 \uAD00\uB9AC" }), _jsx("p", { className: "text-stone-500 dark:text-stone-400", children: "\uBCF4\uC0C1 \uB4F1\uB85D, \uAD6C\uB9E4 \uC2B9\uC778, PIN \uAD00\uB9AC" })] }), _jsx("button", { className: "btn-ghost", onClick: exitParent, children: "\uD83D\uDEAA \uC544\uC774 \uBAA8\uB4DC\uB85C" })] }), _jsxs("section", { className: "card mb-4", children: [_jsx("h3", { className: "font-bold mb-2", children: "\uD83D\uDD10 PIN \uAD00\uB9AC" }), pinSet ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-sm text-stone-500 dark:text-stone-400 flex-1", children: "PIN\uC774 \uC124\uC815\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4." }), _jsx("button", { className: "btn-ghost text-sm", onClick: async () => {
                                    if (confirm("PIN을 해제하면 누구나 보호자 모드 진입 가능합니다. 계속?")) {
                                        await clearPin();
                                    }
                                }, children: "\uD574\uC81C" })] })) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { className: "input flex-1", type: "password", maxLength: 4, pattern: "[0-9]{4}", placeholder: "4\uC790\uB9AC \uC22B\uC790", value: pinInput, onChange: (e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4)) }), _jsx("button", { className: "btn-primary", disabled: pinInput.length !== 4, onClick: async () => {
                                    await setPin(pinInput);
                                    setPinInput("");
                                }, children: "PIN \uC124\uC815" })] }))] }), _jsxs("section", { className: "card mb-4", children: [_jsx("h3", { className: "font-bold mb-2", children: "\uD83D\uDD01 \uD61C\uC778 \uC8FC\uAC04 \uACFC\uC81C \uC790\uB3D9 \uBD80\uC5EC" }), _jsx("p", { className: "text-xs text-stone-500 dark:text-stone-400 mb-2", children: "\uB9E4\uC8FC \uD1A0/\uC77C \uCCAB \uB85C\uB4DC \uC2DC \uCC28\uC8FC 7\uAC1C (\uB208\uB192\uC774 2 + \uD559\uC6D0 5 = 1000p) \uC790\uB3D9 \uC0DD\uC131. \uB204\uB77D \uC2DC \uC544\uB798 \uBC84\uD2BC\uC73C\uB85C \uC218\uB3D9 \uD2B8\uB9AC\uAC70." }), _jsx("button", { className: "btn-ghost text-sm", disabled: autoSeedBusy, onClick: triggerHyeinAutoSeed, children: autoSeedBusy ? "처리 중…" : "지금 채우기" }), autoSeedToast && (_jsx("div", { className: "mt-2 text-sm text-emerald-600 dark:text-emerald-400", children: autoSeedToast }))] }), _jsxs("section", { className: "card mb-4", children: [_jsx("h3", { className: "font-bold mb-2", children: "\uD83D\uDCB0 \uD3EC\uC778\uD2B8 \uC9C1\uC811 \uC9C0\uAE09 / \uCC28\uAC10" }), _jsx("p", { className: "text-xs text-stone-500 dark:text-stone-400 mb-3", children: "\uCE6D\uCC2C\u00B7\uAC00\uC0AC \uB3C4\uC6C0\u00B7\uB3D9\uC0DD \uCC59\uAE40 \uB4F1 \uC77C\uC0C1\uC5D0\uC11C \uC989\uC11D \uBCF4\uC0C1. \uC74C\uC218\uB294 \uCC28\uAC10." }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-stone-500 dark:text-stone-400", children: "\uB300\uC0C1" }), _jsx("select", { className: "input", value: grantStudentId, onChange: (e) => setGrantStudentId(e.target.value), children: students.map((s) => (_jsxs("option", { value: s.id, children: [s.emoji, " ", s.name] }, s.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-stone-500 dark:text-stone-400", children: "\uD3EC\uC778\uD2B8" }), _jsx("input", { type: "number", step: 5, className: "input", value: grantAmount, onChange: (e) => setGrantAmount(Number(e.target.value)) })] }), _jsxs("div", { className: "col-span-2 md:col-span-2", children: [_jsx("label", { className: "text-xs text-stone-500 dark:text-stone-400", children: "\uC0AC\uC720 (\uD544\uC218)" }), _jsx("input", { className: "input", placeholder: "\uC608: \uB3D9\uC0DD \uC798 \uCC59\uACA8\uC90C", value: grantNote, onChange: (e) => setGrantNote(e.target.value) })] })] }), _jsxs("div", { className: "flex flex-wrap gap-1 mt-2", children: [[10, 20, 50, 100, -10].map((amt) => (_jsxs("button", { className: "chip bg-stone-100 dark:bg-stone-800 hover:brightness-95", onClick: () => setGrantAmount(amt), children: [amt > 0 ? `+${amt}` : amt, "p"] }, amt))), _jsx("button", { className: "btn-primary ml-auto", disabled: grantBusy || grantAmount === 0 || !grantNote.trim(), onClick: grantPoints, children: grantBusy
                                    ? "처리 중…"
                                    : grantAmount > 0
                                        ? `+${grantAmount}p 지급`
                                        : `${grantAmount}p 차감` })] }), grantToast && (_jsxs("div", { className: "mt-2 text-sm text-emerald-600 dark:text-emerald-400", children: ["\u2713 ", grantToast] }))] }), verifyQueue.length > 0 && (_jsxs("section", { className: "card mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", children: [_jsx("div", { className: "flex items-center justify-between mb-2", children: _jsxs("h3", { className: "font-bold", children: ["\uD83D\uDCDD \uD018\uC2A4\uD2B8 \uD655\uC778 \uB300\uAE30 (", verifyQueue.length, ")"] }) }), _jsx("div", { className: "space-y-2", children: verifyQueue.map((q) => {
                            const s = students.find((x) => x.id === q.student_id);
                            return (_jsx("div", { className: "border-t border-amber-200 dark:border-amber-800 pt-2", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-medium truncate", children: q.title }), _jsxs("div", { className: "text-xs text-stone-500 dark:text-stone-400", children: [s?.emoji, " ", s?.name, " \u00B7 \uB9C8\uAC10 ", q.due_date.slice(5).replace("-", "."), " \u00B7", " ", q.target, q.unit, " \u00B7 +", q.points, "p"] }), q.note && (_jsxs("div", { className: "text-xs text-stone-500 dark:text-stone-400 italic", children: ["\uD83D\uDCA1 ", q.note] })), q.subtasks && q.subtasks.length > 0 && (_jsx("div", { className: "text-xs text-stone-500 dark:text-stone-400 mt-1", children: q.subtasks.map((s) => (_jsxs("span", { className: "mr-2", children: [s.done ? "✅" : "☐", " ", s.label] }, s.id))) }))] }), _jsx("button", { className: "btn-primary text-sm", onClick: () => verifyQuest(q), children: "\uD655\uC778 \u2713" }), _jsx("button", { className: "btn-ghost text-sm", onClick: () => {
                                                setRejectTarget(q);
                                                setRejectReason("");
                                            }, children: "\uB2E4\uC2DC" })] }) }, q.id));
                        }) })] })), recentVerified.length > 0 && (_jsxs("section", { className: "card mb-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("h3", { className: "font-bold", children: ["\u2705 \uCD5C\uADFC \uD655\uC778 \uC644\uB8CC (", recentVerified.length, ")"] }), _jsx("span", { className: "text-xs text-stone-500 dark:text-stone-400", children: "\uC2E4\uC218\uB85C \uD655\uC778\uD55C \uD56D\uBAA9\uC740 \"\uB418\uB3CC\uB9AC\uAE30\" \uAC00\uB2A5" })] }), _jsx("div", { className: "space-y-2", children: recentVerified.map((q) => {
                            const s = students.find((x) => x.id === q.student_id);
                            return (_jsxs("div", { className: "border-t border-stone-200 dark:border-stone-800 pt-2 flex items-center gap-2", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-medium truncate", children: q.title }), _jsxs("div", { className: "text-xs text-stone-500 dark:text-stone-400", children: [s?.emoji, " ", s?.name, " \u00B7 \uB9C8\uAC10", " ", q.due_date.slice(5).replace("-", "."), " \u00B7 +", q.points, "p", q.verifiedAt &&
                                                        ` · 확인 ${q.verifiedAt.slice(5, 16).replace("T", " ")}`] })] }), _jsx("button", { className: "btn-ghost text-sm", onClick: () => unverifyQuest(q), children: "\u21BA \uB418\uB3CC\uB9AC\uAE30" })] }, q.id));
                        }) })] })), _jsxs("section", { className: "card mb-4", children: [_jsx("div", { className: "flex items-center justify-between mb-2", children: _jsxs("h3", { className: "font-bold", children: ["\u23F3 \uBCF4\uC0C1 \uC2B9\uC778 \uB300\uAE30 (", pending.length, ")"] }) }), _jsxs("div", { className: "space-y-2", children: [pending.length === 0 && (_jsx("div", { className: "text-sm text-stone-400 text-center py-4", children: "\uB300\uAE30 \uC911\uC778 \uC694\uCCAD\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })), pending.map((p) => {
                                const r = rewards.find((x) => x.id === p.reward_id);
                                const s = students.find((x) => x.id === p.student_id);
                                return (_jsxs("div", { className: "flex items-center gap-2 border-t border-stone-200 dark:border-stone-800 pt-2", children: [_jsx("span", { className: "text-2xl", children: r?.icon ?? "🎁" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-medium truncate", children: r?.title ?? "(삭제된 보상)" }), _jsxs("div", { className: "text-xs text-stone-500 dark:text-stone-400", children: [s?.emoji, " ", s?.name, " \u00B7 ", p.cost_points, "p \u00B7 ", p.requestedAt.slice(5, 16).replace("T", " ")] })] }), _jsx("button", { className: "btn-primary text-sm", onClick: () => approve(p), children: "\uC2B9\uC778" }), _jsx("button", { className: "btn-ghost text-sm", onClick: () => reject(p), children: "\uAC70\uBD80" })] }, p.id));
                            })] })] }), approved.length > 0 && (_jsxs("section", { className: "card mb-4", children: [_jsxs("h3", { className: "font-bold mb-2", children: ["\uD83D\uDCE6 \uC218\uB839 \uB300\uAE30 (", approved.length, ")"] }), _jsx("div", { className: "space-y-2", children: approved.map((p) => {
                            const r = rewards.find((x) => x.id === p.reward_id);
                            const s = students.find((x) => x.id === p.student_id);
                            return (_jsxs("div", { className: "flex items-center gap-2 border-t border-stone-200 dark:border-stone-800 pt-2", children: [_jsx("span", { className: "text-2xl", children: r?.icon ?? "🎁" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-medium truncate", children: r?.title }), _jsxs("div", { className: "text-xs text-stone-500 dark:text-stone-400", children: [s?.emoji, " ", s?.name] })] }), _jsx("button", { className: "btn-ghost text-sm", onClick: () => fulfill(p), children: "\uC218\uB839 \uC644\uB8CC" })] }, p.id));
                        }) })] })), _jsxs("section", { className: "card mb-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("h3", { className: "font-bold", children: "\uD83C\uDF81 \uBCF4\uC0C1 \uBAA9\uB85D" }), _jsxs("div", { className: "flex gap-1", children: [rewards.length === 0 && (_jsx("button", { className: "btn-ghost text-xs", onClick: addDefaults, children: "\uAE30\uBCF8 \uBCF4\uC0C1 \uCD94\uAC00" })), _jsx("button", { className: "btn-primary text-sm", onClick: () => {
                                            setEditing(blankReward());
                                            setShowNew(true);
                                        }, children: "+ \uBCF4\uC0C1 \uB4F1\uB85D" })] })] }), showNew && editing && (_jsx(RewardEditor, { reward: editing, onCancel: () => {
                            setShowNew(false);
                            setEditing(null);
                        }, onSave: async (r) => {
                            await saveReward(r);
                            setShowNew(false);
                            setEditing(null);
                        } })), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-2 mt-2", children: rewards.map((r) => {
                            const owner = r.student_id
                                ? students.find((s) => s.id === r.student_id)
                                : null;
                            return (_jsxs("div", { className: "card text-center py-3", children: [_jsx("div", { className: "text-3xl", children: r.icon }), _jsx("div", { className: "font-medium text-sm", children: r.title }), _jsxs("div", { className: "text-xs text-stone-500 dark:text-stone-400", children: [KIND_LABEL[r.kind], " \u00B7 ", r.cost_points, "p", owner && ` · ${owner.emoji} ${owner.name}만`] }), _jsxs("div", { className: "flex gap-1 mt-2 justify-center", children: [_jsx("button", { className: "text-xs text-stone-500 hover:text-brand-500", onClick: () => {
                                                    setEditing(r);
                                                    setShowNew(true);
                                                }, children: "\uD3B8\uC9D1" }), _jsx("button", { className: "text-xs text-stone-400 hover:text-red-500", onClick: () => removeReward(r.id), children: "\uC0AD\uC81C" })] })] }, r.id));
                        }) })] }), _jsxs("section", { className: "card", children: [_jsx("h3", { className: "font-bold mb-2 text-red-600 dark:text-red-400", children: "\u26A0\uFE0F \uC704\uD5D8 \uAD6C\uC5ED" }), _jsx("button", { className: "btn-ghost text-sm text-red-600 dark:text-red-400", onClick: async () => {
                            if (confirm("모든 데이터를 초기화합니다. 계속?")) {
                                await reset();
                                location.reload();
                            }
                        }, children: "\uC804\uCCB4 \uB370\uC774\uD130 \uCD08\uAE30\uD654" })] }), rejectTarget && (_jsx("div", { className: "fixed inset-0 z-50 bg-stone-950/70 backdrop-blur flex items-center justify-center p-4", children: _jsxs("div", { className: "card max-w-md w-full", children: [_jsx("h3", { className: "font-bold text-lg mb-2", children: "\uB2E4\uC2DC \uD574\uC57C \uD560 \uC774\uC720" }), _jsx("p", { className: "text-sm text-stone-500 dark:text-stone-400 mb-3 truncate", children: rejectTarget.title }), _jsx("textarea", { className: "input min-h-[80px]", placeholder: "\uC608: \uC601\uC0C1\uC774 \uC798 \uC548 \uB4E4\uB824\uC694. \uB2E4\uC2DC \uB179\uD654\uD574\uC8FC\uC138\uC694.", value: rejectReason, onChange: (e) => setRejectReason(e.target.value), autoFocus: true }), _jsxs("div", { className: "flex gap-2 mt-3", children: [_jsx("button", { className: "btn-ghost flex-1", onClick: () => {
                                        setRejectTarget(null);
                                        setRejectReason("");
                                    }, children: "\uCDE8\uC18C" }), _jsx("button", { className: "btn-primary flex-1", onClick: async () => {
                                        const target = rejectTarget;
                                        const reason = rejectReason;
                                        setRejectTarget(null);
                                        setRejectReason("");
                                        await rejectQuest(target, reason);
                                    }, children: "\uB2E4\uC2DC \uBCF4\uB0B4\uAE30" })] })] }) }))] }));
}
function blankReward() {
    return {
        id: crypto.randomUUID(),
        title: "",
        icon: "🎁",
        cost_points: 50,
        kind: "treat",
        active: true,
    };
}
function RewardEditor({ reward, onCancel, onSave, }) {
    const { students } = useData();
    const [draft, setDraft] = useState(reward);
    return (_jsxs("div", { className: "card mb-2 border-brand-500 dark:border-brand-400 border-2", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs", children: "\uC774\uBAA8\uC9C0" }), _jsx("input", { className: "input text-center text-2xl", value: draft.icon, onChange: (e) => setDraft({ ...draft, icon: e.target.value }) })] }), _jsxs("div", { className: "col-span-2 md:col-span-3", children: [_jsx("label", { className: "text-xs", children: "\uC81C\uBAA9" }), _jsx("input", { className: "input", value: draft.title, onChange: (e) => setDraft({ ...draft, title: e.target.value }), placeholder: "\uC608: \uC544\uC774\uC2A4\uD06C\uB9BC 1\uAC1C" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs", children: "\uBD84\uB958" }), _jsx("select", { className: "input", value: draft.kind, onChange: (e) => setDraft({ ...draft, kind: e.target.value }), children: Object.entries(KIND_LABEL).map(([k, v]) => (_jsx("option", { value: k, children: v }, k))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs", children: "\uD3EC\uC778\uD2B8" }), _jsx("input", { type: "number", min: 1, className: "input", value: draft.cost_points, onChange: (e) => setDraft({ ...draft, cost_points: Number(e.target.value) }) })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: "text-xs", children: "\uC124\uBA85(\uC120\uD0DD)" }), _jsx("input", { className: "input", value: draft.description ?? "", onChange: (e) => setDraft({ ...draft, description: e.target.value }) })] }), _jsxs("div", { className: "col-span-2 md:col-span-4", children: [_jsx("label", { className: "text-xs", children: "\uC0C1\uD488 \uC774\uBBF8\uC9C0 URL (\uC120\uD0DD)" }), _jsx("input", { className: "input", placeholder: "https://...", value: draft.image_url ?? "", onChange: (e) => setDraft({ ...draft, image_url: e.target.value || undefined }) })] }), _jsxs("div", { className: "col-span-2 md:col-span-4", children: [_jsx("label", { className: "text-xs", children: "\uC0C1\uD488 \uD398\uC774\uC9C0 URL (\uC120\uD0DD)" }), _jsx("input", { className: "input", placeholder: "https://...", value: draft.source_url ?? "", onChange: (e) => setDraft({ ...draft, source_url: e.target.value || undefined }) })] }), _jsxs("div", { className: "col-span-2 md:col-span-4", children: [_jsx("label", { className: "text-xs", children: "\uB300\uC0C1 \uD559\uC0DD" }), _jsxs("select", { className: "input", value: draft.student_id ?? "", onChange: (e) => setDraft({ ...draft, student_id: e.target.value || undefined }), children: [_jsx("option", { value: "", children: "\uBAA8\uB450 (\uACF5\uC6A9 \uBCF4\uC0C1)" }), students.map((s) => (_jsxs("option", { value: s.id, children: [s.emoji, " ", s.name, " \uC804\uC6A9"] }, s.id)))] })] })] }), _jsxs("div", { className: "flex gap-2 mt-2", children: [_jsxs("label", { className: "flex items-center gap-2 text-sm flex-1", children: [_jsx("input", { type: "checkbox", checked: draft.active, onChange: (e) => setDraft({ ...draft, active: e.target.checked }) }), "\uD65C\uC131\uD654 (\uC0C1\uC810\uC5D0 \uB178\uCD9C)"] }), _jsx("button", { className: "btn-ghost", onClick: onCancel, children: "\uCDE8\uC18C" }), _jsx("button", { className: "btn-primary", onClick: () => onSave(draft), disabled: !draft.title.trim(), children: "\uC800\uC7A5" })] })] }));
}
