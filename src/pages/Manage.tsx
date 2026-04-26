import { useCallback, useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
import { useData } from "../store/DataContext";
import { useRewards, usePurchases } from "../store/useRewards";
import { useAuth } from "../store/AuthContext";
import { evaluatePerfectForToday, loadStudentQuests } from "../lib/quest-eval";
import { todayISO } from "../lib/dates";
import type { PointEntry, Purchase, Quest, Reward } from "../types";

const KIND_LABEL: Record<Reward["kind"], string> = {
  treat: "간식",
  privilege: "특권",
  item: "아이템",
  experience: "경험",
};

const DEFAULT_REWARDS: Omit<Reward, "id">[] = [
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
  const [editing, setEditing] = useState<Reward | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [pinInput, setPinInput] = useState("");

  // ----- 직접 포인트 지급 폼 -----
  const [grantStudentId, setGrantStudentId] = useState(students[0]?.id ?? "");
  const [grantAmount, setGrantAmount] = useState<number>(10);
  const [grantNote, setGrantNote] = useState("");
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantToast, setGrantToast] = useState<string | null>(null);

  async function grantPoints() {
    if (!grantStudentId || grantAmount === 0 || !grantNote.trim()) return;
    if (grantAmount < 0) {
      const ok = confirm(
        `${grantAmount}p 차감합니다. 계속할까요?\n\n사유: ${grantNote}`
      );
      if (!ok) return;
    }
    setGrantBusy(true);
    const ledger =
      (await storage.read<PointEntry[]>(KEYS.pointLedger(grantStudentId))) ?? [];
    const next: PointEntry[] = [
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
    setGrantToast(
      `${s?.emoji ?? ""} ${s?.name ?? ""} 에게 ${grantAmount > 0 ? "+" : ""}${grantAmount}p ${grantAmount > 0 ? "지급" : "차감"} 완료`
    );
    setGrantNote("");
    setGrantAmount(10);
    setGrantBusy(false);
    setTimeout(() => setGrantToast(null), 3000);
  }

  async function approve(p: Purchase) {
    await savePurchase({
      ...p,
      status: "approved",
      decidedAt: new Date().toISOString(),
    });
    const data =
      (await storage.read<any[]>(KEYS.pointLedger(p.student_id))) ?? [];
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

  async function reject(p: Purchase) {
    await savePurchase({
      ...p,
      status: "rejected",
      decidedAt: new Date().toISOString(),
    });
  }

  async function fulfill(p: Purchase) {
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

  const [verifyQueue, setVerifyQueue] = useState<Quest[]>([]);
  const [recentVerified, setRecentVerified] = useState<Quest[]>([]);
  const [rejectTarget, setRejectTarget] = useState<Quest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadVerify = useCallback(async () => {
    const queue: Quest[] = [];
    const recent: Quest[] = [];
    for (const s of students) {
      const keys = await storage.list(`quests/${s.id}/`);
      for (const k of keys) {
        const q = await storage.read<Quest>(k);
        if (!q) continue;
        if (
          q.status === "done" &&
          q.requires_verification &&
          !q.verified &&
          !q.rejectedReason
        ) {
          queue.push(q);
        } else if (q.status === "done" && q.verified) {
          recent.push(q);
        }
      }
    }
    queue.sort((a, b) => (a.due_date < b.due_date ? 1 : -1));
    recent.sort((a, b) =>
      (b.verifiedAt ?? "").localeCompare(a.verifiedAt ?? "")
    );
    setVerifyQueue(queue);
    setRecentVerified(recent.slice(0, 15)); // 최근 15건
  }, [students]);
  useEffect(() => {
    loadVerify();
  }, [loadVerify]);

  async function verifyQuest(q: Quest) {
    const today = todayISO();
    const next: Quest = {
      ...q,
      verified: true,
      verifiedAt: new Date().toISOString(),
      rejectedReason: undefined,
    };
    await storage.write(KEYS.quest(q.student_id, q.id), next);
    const ledger =
      (await storage.read<PointEntry[]>(KEYS.pointLedger(q.student_id))) ?? [];
    if (!ledger.some((e) => e.quest_id === q.id && e.reason === "quest_complete")) {
      const nextLedger: PointEntry[] = [
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
  async function unverifyQuest(q: Quest) {
    const today = todayISO();
    const next: Quest = {
      ...q,
      verified: false,
      verifiedAt: undefined,
    };
    await storage.write(KEYS.quest(q.student_id, q.id), next);

    // ledger 에서 이 quest 의 quest_complete 항목 제거
    const ledger =
      (await storage.read<PointEntry[]>(KEYS.pointLedger(q.student_id))) ?? [];
    let nextLedger = ledger.filter(
      (e) => !(e.quest_id === q.id && e.reason === "quest_complete")
    );

    // 완주 상태 깨졌으면 today 의 perfect/streak 도 회수
    const allQuests = await loadStudentQuests(q.student_id);
    const stillPerfect = evaluatePerfectForToday(allQuests, today);
    if (!stillPerfect) {
      nextLedger = nextLedger.filter((e) => {
        if (e.date !== today) return true;
        return e.reason !== "perfect_day" && e.reason !== "streak_bonus";
      });
    }

    if (nextLedger.length !== ledger.length) {
      await storage.write(KEYS.pointLedger(q.student_id), nextLedger);
    }
    await loadVerify();
  }

  async function rejectQuest(q: Quest, reason: string) {
    const today = todayISO();
    const next: Quest = {
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
      const ledger =
        (await storage.read<PointEntry[]>(KEYS.pointLedger(q.student_id))) ?? [];
      const nextLedger = ledger.filter((e) => {
        if (e.date !== today) return true;
        return e.reason !== "perfect_day" && e.reason !== "streak_bonus";
      });
      if (nextLedger.length !== ledger.length) {
        await storage.write(KEYS.pointLedger(q.student_id), nextLedger);
      }
    }
    await loadVerify();
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-4 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">🔧 보호자 관리</h1>
          <p className="text-stone-500 dark:text-stone-400">
            보상 등록, 구매 승인, PIN 관리
          </p>
        </div>
        <button className="btn-ghost" onClick={exitParent}>
          🚪 아이 모드로
        </button>
      </header>

      <section className="card mb-4">
        <h3 className="font-bold mb-2">🔐 PIN 관리</h3>
        {pinSet ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-500 dark:text-stone-400 flex-1">
              PIN이 설정되어 있습니다.
            </span>
            <button
              className="btn-ghost text-sm"
              onClick={async () => {
                if (confirm("PIN을 해제하면 누구나 보호자 모드 진입 가능합니다. 계속?")) {
                  await clearPin();
                }
              }}
            >
              해제
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              className="input flex-1"
              type="password"
              maxLength={4}
              pattern="[0-9]{4}"
              placeholder="4자리 숫자"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
            <button
              className="btn-primary"
              disabled={pinInput.length !== 4}
              onClick={async () => {
                await setPin(pinInput);
                setPinInput("");
              }}
            >
              PIN 설정
            </button>
          </div>
        )}
      </section>

      <section className="card mb-4">
        <h3 className="font-bold mb-2">💰 포인트 직접 지급 / 차감</h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
          칭찬·가사 도움·동생 챙김 등 일상에서 즉석 보상. 음수는 차감.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="text-xs text-stone-500 dark:text-stone-400">대상</label>
            <select
              className="input"
              value={grantStudentId}
              onChange={(e) => setGrantStudentId(e.target.value)}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-500 dark:text-stone-400">포인트</label>
            <input
              type="number"
              step={5}
              className="input"
              value={grantAmount}
              onChange={(e) => setGrantAmount(Number(e.target.value))}
            />
          </div>
          <div className="col-span-2 md:col-span-2">
            <label className="text-xs text-stone-500 dark:text-stone-400">사유 (필수)</label>
            <input
              className="input"
              placeholder="예: 동생 잘 챙겨줌"
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {[10, 20, 50, 100, -10].map((amt) => (
            <button
              key={amt}
              className="chip bg-stone-100 dark:bg-stone-800 hover:brightness-95"
              onClick={() => setGrantAmount(amt)}
            >
              {amt > 0 ? `+${amt}` : amt}p
            </button>
          ))}
          <button
            className="btn-primary ml-auto"
            disabled={grantBusy || grantAmount === 0 || !grantNote.trim()}
            onClick={grantPoints}
          >
            {grantBusy
              ? "처리 중…"
              : grantAmount > 0
              ? `+${grantAmount}p 지급`
              : `${grantAmount}p 차감`}
          </button>
        </div>
        {grantToast && (
          <div className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
            ✓ {grantToast}
          </div>
        )}
      </section>

      {verifyQueue.length > 0 && (
        <section className="card mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">
              📝 퀘스트 확인 대기 ({verifyQueue.length})
            </h3>
          </div>
          <div className="space-y-2">
            {verifyQueue.map((q) => {
              const s = students.find((x) => x.id === q.student_id);
              return (
                <div
                  key={q.id}
                  className="border-t border-amber-200 dark:border-amber-800 pt-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{q.title}</div>
                      <div className="text-xs text-stone-500 dark:text-stone-400">
                        {s?.emoji} {s?.name} · 마감 {q.due_date.slice(5).replace("-", ".")} ·{" "}
                        {q.target}
                        {q.unit} · +{q.points}p
                      </div>
                      {q.note && (
                        <div className="text-xs text-stone-500 dark:text-stone-400 italic">
                          💡 {q.note}
                        </div>
                      )}
                      {q.subtasks && q.subtasks.length > 0 && (
                        <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          {q.subtasks.map((s) => (
                            <span key={s.id} className="mr-2">
                              {s.done ? "✅" : "☐"} {s.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="btn-primary text-sm"
                      onClick={() => verifyQuest(q)}
                    >
                      확인 ✓
                    </button>
                    <button
                      className="btn-ghost text-sm"
                      onClick={() => {
                        setRejectTarget(q);
                        setRejectReason("");
                      }}
                    >
                      다시
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {recentVerified.length > 0 && (
        <section className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">
              ✅ 최근 확인 완료 ({recentVerified.length})
            </h3>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              실수로 확인한 항목은 "되돌리기" 가능
            </span>
          </div>
          <div className="space-y-2">
            {recentVerified.map((q) => {
              const s = students.find((x) => x.id === q.student_id);
              return (
                <div
                  key={q.id}
                  className="border-t border-stone-200 dark:border-stone-800 pt-2 flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{q.title}</div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      {s?.emoji} {s?.name} · 마감{" "}
                      {q.due_date.slice(5).replace("-", ".")} · +{q.points}p
                      {q.verifiedAt &&
                        ` · 확인 ${q.verifiedAt.slice(5, 16).replace("T", " ")}`}
                    </div>
                  </div>
                  <button
                    className="btn-ghost text-sm"
                    onClick={() => unverifyQuest(q)}
                  >
                    ↺ 되돌리기
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">⏳ 보상 승인 대기 ({pending.length})</h3>
        </div>
        <div className="space-y-2">
          {pending.length === 0 && (
            <div className="text-sm text-stone-400 text-center py-4">
              대기 중인 요청이 없습니다.
            </div>
          )}
          {pending.map((p) => {
            const r = rewards.find((x) => x.id === p.reward_id);
            const s = students.find((x) => x.id === p.student_id);
            return (
              <div key={p.id} className="flex items-center gap-2 border-t border-stone-200 dark:border-stone-800 pt-2">
                <span className="text-2xl">{r?.icon ?? "🎁"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r?.title ?? "(삭제된 보상)"}</div>
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    {s?.emoji} {s?.name} · {p.cost_points}p · {p.requestedAt.slice(5, 16).replace("T", " ")}
                  </div>
                </div>
                <button className="btn-primary text-sm" onClick={() => approve(p)}>
                  승인
                </button>
                <button
                  className="btn-ghost text-sm"
                  onClick={() => reject(p)}
                >
                  거부
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {approved.length > 0 && (
        <section className="card mb-4">
          <h3 className="font-bold mb-2">📦 수령 대기 ({approved.length})</h3>
          <div className="space-y-2">
            {approved.map((p) => {
              const r = rewards.find((x) => x.id === p.reward_id);
              const s = students.find((x) => x.id === p.student_id);
              return (
                <div key={p.id} className="flex items-center gap-2 border-t border-stone-200 dark:border-stone-800 pt-2">
                  <span className="text-2xl">{r?.icon ?? "🎁"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r?.title}</div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      {s?.emoji} {s?.name}
                    </div>
                  </div>
                  <button className="btn-ghost text-sm" onClick={() => fulfill(p)}>
                    수령 완료
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">🎁 보상 목록</h3>
          <div className="flex gap-1">
            {rewards.length === 0 && (
              <button className="btn-ghost text-xs" onClick={addDefaults}>
                기본 보상 추가
              </button>
            )}
            <button
              className="btn-primary text-sm"
              onClick={() => {
                setEditing(blankReward());
                setShowNew(true);
              }}
            >
              + 보상 등록
            </button>
          </div>
        </div>

        {showNew && editing && (
          <RewardEditor
            reward={editing}
            onCancel={() => {
              setShowNew(false);
              setEditing(null);
            }}
            onSave={async (r) => {
              await saveReward(r);
              setShowNew(false);
              setEditing(null);
            }}
          />
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          {rewards.map((r) => {
            const owner = r.student_id
              ? students.find((s) => s.id === r.student_id)
              : null;
            return (
            <div key={r.id} className="card text-center py-3">
              <div className="text-3xl">{r.icon}</div>
              <div className="font-medium text-sm">{r.title}</div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                {KIND_LABEL[r.kind]} · {r.cost_points}p
                {owner && ` · ${owner.emoji} ${owner.name}만`}
              </div>
              <div className="flex gap-1 mt-2 justify-center">
                <button
                  className="text-xs text-stone-500 hover:text-brand-500"
                  onClick={() => {
                    setEditing(r);
                    setShowNew(true);
                  }}
                >
                  편집
                </button>
                <button
                  className="text-xs text-stone-400 hover:text-red-500"
                  onClick={() => removeReward(r.id)}
                >
                  삭제
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h3 className="font-bold mb-2 text-red-600 dark:text-red-400">⚠️ 위험 구역</h3>
        <button
          className="btn-ghost text-sm text-red-600 dark:text-red-400"
          onClick={async () => {
            if (confirm("모든 데이터를 초기화합니다. 계속?")) {
              await reset();
              location.reload();
            }
          }}
        >
          전체 데이터 초기화
        </button>
      </section>

      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur flex items-center justify-center p-4">
          <div className="card max-w-md w-full">
            <h3 className="font-bold text-lg mb-2">다시 해야 할 이유</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-3 truncate">
              {rejectTarget.title}
            </p>
            <textarea
              className="input min-h-[80px]"
              placeholder="예: 영상이 잘 안 들려요. 다시 녹화해주세요."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                className="btn-ghost flex-1"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
              >
                취소
              </button>
              <button
                className="btn-primary flex-1"
                onClick={async () => {
                  const target = rejectTarget;
                  const reason = rejectReason;
                  setRejectTarget(null);
                  setRejectReason("");
                  await rejectQuest(target, reason);
                }}
              >
                다시 보내기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function blankReward(): Reward {
  return {
    id: crypto.randomUUID(),
    title: "",
    icon: "🎁",
    cost_points: 50,
    kind: "treat",
    active: true,
  };
}

function RewardEditor({
  reward,
  onCancel,
  onSave,
}: {
  reward: Reward;
  onCancel: () => void;
  onSave: (r: Reward) => void;
}) {
  const { students } = useData();
  const [draft, setDraft] = useState(reward);
  return (
    <div className="card mb-2 border-brand-500 dark:border-brand-400 border-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="text-xs">이모지</label>
          <input
            className="input text-center text-2xl"
            value={draft.icon}
            onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
          />
        </div>
        <div className="col-span-2 md:col-span-3">
          <label className="text-xs">제목</label>
          <input
            className="input"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="예: 아이스크림 1개"
          />
        </div>
        <div>
          <label className="text-xs">분류</label>
          <select
            className="input"
            value={draft.kind}
            onChange={(e) =>
              setDraft({ ...draft, kind: e.target.value as Reward["kind"] })
            }
          >
            {Object.entries(KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs">포인트</label>
          <input
            type="number"
            min={1}
            className="input"
            value={draft.cost_points}
            onChange={(e) =>
              setDraft({ ...draft, cost_points: Number(e.target.value) })
            }
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs">설명(선택)</label>
          <input
            className="input"
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <div className="col-span-2 md:col-span-4">
          <label className="text-xs">상품 이미지 URL (선택)</label>
          <input
            className="input"
            placeholder="https://..."
            value={draft.image_url ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, image_url: e.target.value || undefined })
            }
          />
        </div>
        <div className="col-span-2 md:col-span-4">
          <label className="text-xs">상품 페이지 URL (선택)</label>
          <input
            className="input"
            placeholder="https://..."
            value={draft.source_url ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, source_url: e.target.value || undefined })
            }
          />
        </div>
        <div className="col-span-2 md:col-span-4">
          <label className="text-xs">대상 학생</label>
          <select
            className="input"
            value={draft.student_id ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, student_id: e.target.value || undefined })
            }
          >
            <option value="">모두 (공용 보상)</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {s.name} 전용
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <label className="flex items-center gap-2 text-sm flex-1">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
          활성화 (상점에 노출)
        </label>
        <button className="btn-ghost" onClick={onCancel}>
          취소
        </button>
        <button
          className="btn-primary"
          onClick={() => onSave(draft)}
          disabled={!draft.title.trim()}
        >
          저장
        </button>
      </div>
    </div>
  );
}
