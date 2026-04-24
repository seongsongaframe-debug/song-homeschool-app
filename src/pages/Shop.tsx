import { useEffect, useMemo, useState } from "react";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { useRewards, usePurchases } from "../store/useRewards";
import { usePoints } from "../store/usePoints";
import { useAuth } from "../store/AuthContext";
import type { Purchase, Reward } from "../types";
import { todayISO } from "../lib/dates";

const KIND_LABEL: Record<Reward["kind"], string> = {
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
    if (studentId && studentId !== activeChildId) setChild(studentId);
  }, [studentId]);

  const myPurchases = useMemo(
    () => purchases.filter((p) => p.student_id === studentId),
    [purchases, studentId]
  );
  const pendingMine = myPurchases.filter((p) => p.status === "pending");

  async function request(reward: Reward) {
    if (reward.cost_points > balance) return;
    const p: Purchase = {
      id: crypto.randomUUID(),
      student_id: studentId,
      reward_id: reward.id,
      requestedAt: new Date().toISOString(),
      status: "pending",
      cost_points: reward.cost_points,
    };
    await savePurchase(p);
  }

  async function cancel(p: Purchase) {
    if (p.status !== "pending") return;
    await savePurchase({ ...p, status: "rejected", decidedAt: new Date().toISOString() });
  }

  if (!studentId) return null;

  const activeRewards = rewards.filter((r) => r.active);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">🏪 보상 상점</h1>
        <p className="text-stone-500 dark:text-stone-400">
          포인트로 교환하세요. 구매는 보호자 승인 후 확정됩니다.
        </p>
      </header>

      <StudentTabs
        students={students}
        selected={studentId}
        onSelect={setStudentId}
      />

      <section className="card mb-4 text-center">
        <div className="text-sm text-stone-500 dark:text-stone-400">내 포인트</div>
        <div className="text-4xl font-extrabold text-brand-600 dark:text-brand-400">
          💰 {balance}p
        </div>
      </section>

      {pendingMine.length > 0 && (
        <section className="card mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <h3 className="font-bold mb-2">⏳ 승인 대기 중</h3>
          {pendingMine.map((p) => {
            const r = rewards.find((x) => x.id === p.reward_id);
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 py-1"
              >
                <span>{r?.icon ?? "🎁"}</span>
                <span className="flex-1">{r?.title ?? "(삭제된 보상)"}</span>
                <span className="text-sm">{p.cost_points}p</span>
                <button
                  className="text-xs text-stone-500 hover:text-red-500"
                  onClick={() => cancel(p)}
                >
                  취소
                </button>
              </div>
            );
          })}
        </section>
      )}

      <section>
        {activeRewards.length === 0 && (
          <div className="card text-center py-10 text-stone-500 dark:text-stone-400">
            아직 보상이 등록되지 않았어요.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {activeRewards.map((r) => {
            const canAfford = balance >= r.cost_points;
            return (
              <div key={r.id} className="card flex flex-col text-center">
                <div className="text-5xl mb-2">{r.icon}</div>
                <div className="font-bold">{r.title}</div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                  {KIND_LABEL[r.kind]}
                </div>
                {r.description && (
                  <div className="text-xs text-stone-500 dark:text-stone-400 mb-2 flex-1">
                    {r.description}
                  </div>
                )}
                <div className="font-bold text-lg mb-2">{r.cost_points}p</div>
                <button
                  className={canAfford ? "btn-primary" : "btn-ghost opacity-50"}
                  disabled={!canAfford}
                  onClick={() => request(r)}
                >
                  {canAfford ? "구매 요청" : "포인트 부족"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="font-bold mb-2">최근 내역</h3>
        <div className="space-y-1 text-sm">
          {myPurchases.slice(0, 10).map((p) => {
            const r = rewards.find((x) => x.id === p.reward_id);
            return (
              <div key={p.id} className="card py-2 flex items-center gap-2">
                <span>{r?.icon ?? "🎁"}</span>
                <span className="flex-1 truncate">{r?.title ?? "(삭제됨)"}</span>
                <StatusChip status={p.status} />
                <span className="text-stone-400 text-xs">
                  {p.requestedAt.slice(5, 10)}
                </span>
              </div>
            );
          })}
          {myPurchases.length === 0 && (
            <div className="text-stone-400 text-center py-6">아직 내역 없음</div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusChip({ status }: { status: Purchase["status"] }) {
  const style = {
    pending: { bg: "#fef3c7", text: "#92400e", label: "승인 대기" },
    approved: { bg: "#dcfce7", text: "#166534", label: "승인" },
    rejected: { bg: "#fee2e2", text: "#991b1b", label: "거부" },
    fulfilled: { bg: "#dbeafe", text: "#1e40af", label: "수령 완료" },
  }[status];
  return (
    <span
      className="chip"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}
