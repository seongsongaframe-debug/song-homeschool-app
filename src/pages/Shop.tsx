import { useEffect, useMemo, useState } from "react";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { useRewards, usePurchases } from "../store/useRewards";
import { usePoints } from "../store/usePoints";
import { useAuth } from "../store/AuthContext";
import type { PointEntry, Purchase, Reward } from "../types";
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
  const { balance, ledger, append: appendPoint } = usePoints(studentId);
  const [showLedger, setShowLedger] = useState(false);

  useEffect(() => {
    if (studentId && studentId !== activeChildId) setChild(studentId);
  }, [studentId]);

  const myPurchases = useMemo(
    () => purchases.filter((p) => p.student_id === studentId),
    [purchases, studentId]
  );
  const pendingMine = myPurchases.filter((p) => p.status === "pending");
  // 요청 즉시 포인트가 차감되므로 balance 자체가 이미 대기분을 반영한 실사용 가능액이다.
  const pendingTotal = pendingMine.reduce((s, p) => s + p.cost_points, 0);

  async function request(reward: Reward) {
    // 한 아이템에 한 번만: 진행 중(대기·승인) 요청이 있으면 중복 차단.
    const active = myPurchases.find(
      (p) =>
        p.reward_id === reward.id &&
        (p.status === "pending" || p.status === "approved")
    );
    if (active) {
      alert(
        `이미 요청한 상품이에요.\n"${reward.title}" 은(는) 진행 중인 요청이 있어요.\n취소하거나 수령한 뒤 다시 요청할 수 있어요.`
      );
      return;
    }
    if (reward.cost_points > balance) {
      alert(
        `포인트가 부족해요!\n내 포인트: ${balance}p\n필요: ${reward.cost_points}p`
      );
      return;
    }
    const now = new Date().toISOString();
    const p: Purchase = {
      id: crypto.randomUUID(),
      student_id: studentId,
      reward_id: reward.id,
      requestedAt: now,
      status: "pending",
      cost_points: reward.cost_points,
    };
    await savePurchase(p);
    // 요청과 동시에 통장에서 포인트 차감 (은행 출금처럼 바로 빠져나감).
    await appendPoint({
      student_id: studentId,
      date: now.slice(0, 10),
      delta: -reward.cost_points,
      reason: "reward_purchase",
      reward_id: reward.id,
      note: `구매 요청 · ${reward.title}`,
    });
  }

  async function cancel(p: Purchase) {
    if (p.status !== "pending") return;
    const r = rewards.find((x) => x.id === p.reward_id);
    const now = new Date().toISOString();
    await savePurchase({ ...p, status: "rejected", decidedAt: now });
    // 취소하면 차감했던 포인트를 그대로 환불 (통장에 다시 입금).
    await appendPoint({
      student_id: p.student_id,
      date: now.slice(0, 10),
      delta: p.cost_points,
      reason: "reward_refund",
      reward_id: p.reward_id,
      note: `구매 취소 환불 · ${r?.title ?? ""}`.trim(),
    });
  }

  if (!studentId) return null;

  // 학생 한정 보상은 본인 것만, 공용은 모두 노출.
  const activeRewards = rewards.filter(
    (r) => r.active && (!r.student_id || r.student_id === studentId)
  );

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">🏪 보상 상점</h1>
        <p className="text-stone-500 dark:text-stone-400">
          포인트로 교환하세요. 요청하면 포인트가 바로 빠져나가고, 취소하면 다시 돌려받아요.
        </p>
      </header>

      <StudentTabs
        students={students}
        selected={studentId}
        onSelect={setStudentId}
      />

      <section className="card mb-4 text-center">
        <div className="text-sm text-stone-500 dark:text-stone-400">내 포인트 (통장 잔액)</div>
        <div className="text-4xl font-extrabold text-brand-600 dark:text-brand-400">
          💰 {balance}p
        </div>
        {pendingTotal > 0 && (
          <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            승인 대기 {pendingMine.length}건 (−{pendingTotal}p 이미 출금됨 · 취소 시 환불)
          </div>
        )}
        <button
          className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700"
          onClick={() => setShowLedger((v) => !v)}
        >
          📒 포인트 통장 {showLedger ? "닫기" : "보기"}
        </button>
      </section>

      {showLedger && <Passbook ledger={ledger} rewards={rewards} balance={balance} />}

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
            const alreadyRequested = myPurchases.some(
              (p) =>
                p.reward_id === r.id &&
                (p.status === "pending" || p.status === "approved")
            );
            const canAfford = balance >= r.cost_points;
            return (
              <div key={r.id} className="card flex flex-col text-center">
                {r.image_url ? (
                  <div className="aspect-square w-full mb-2 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                    <img
                      src={r.image_url}
                      alt={r.title}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-5xl mb-2">{r.icon}</div>
                )}
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
                  className={
                    alreadyRequested
                      ? "btn-ghost opacity-60"
                      : canAfford
                      ? "btn-primary"
                      : "btn-ghost opacity-50"
                  }
                  disabled={alreadyRequested || !canAfford}
                  onClick={() => request(r)}
                >
                  {alreadyRequested
                    ? "요청됨"
                    : canAfford
                    ? "구매 요청"
                    : "포인트 부족"}
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

const REASON_META: Record<
  PointEntry["reason"],
  { icon: string; label: string }
> = {
  quest_complete: { icon: "📘", label: "과제 완료" },
  streak_bonus: { icon: "🔥", label: "연속 보너스" },
  perfect_day: { icon: "⭐", label: "완벽한 하루" },
  reward_purchase: { icon: "🛍️", label: "상품 구매" },
  reward_refund: { icon: "↩️", label: "구매 취소 환불" },
  manual_adjust: { icon: "✍️", label: "보호자 조정" },
};

// 은행 통장(거래내역)처럼 포인트 입출금을 시간순으로 보여준다.
// 최신순 표시하되, 각 줄의 "잔액"은 그 거래 직후의 누적 잔액.
function Passbook({
  ledger,
  rewards,
  balance,
}: {
  ledger: PointEntry[];
  rewards: Reward[];
  balance: number;
}) {
  // 저장 순서(=시간순)를 신뢰. 앞에서부터 누적하며 각 거래 직후 잔액을 기록.
  let running = 0;
  const rows = ledger.map((e) => {
    running += e.delta;
    return { e, after: running };
  });
  rows.reverse(); // 최신순

  const earned = ledger
    .filter((e) => e.delta > 0)
    .reduce((s, e) => s + e.delta, 0);
  const spent = ledger
    .filter((e) => e.delta < 0)
    .reduce((s, e) => s + e.delta, 0);

  function labelOf(e: PointEntry): string {
    const meta = REASON_META[e.reason] ?? { icon: "•", label: e.reason };
    if (e.note) return `${meta.icon} ${e.note}`;
    if (e.reward_id) {
      const r = rewards.find((x) => x.id === e.reward_id);
      if (r) return `${meta.icon} ${meta.label} · ${r.title}`;
    }
    return `${meta.icon} ${meta.label}`;
  }

  return (
    <section className="card mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">📒 포인트 통장</h3>
        <span className="text-xs text-stone-500 dark:text-stone-400">
          총 {ledger.length}건
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 py-2">
          <div className="text-[11px] text-stone-500 dark:text-stone-400">받은 포인트</div>
          <div className="font-bold text-emerald-700 dark:text-emerald-400">+{earned}p</div>
        </div>
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 py-2">
          <div className="text-[11px] text-stone-500 dark:text-stone-400">쓴 포인트</div>
          <div className="font-bold text-red-600 dark:text-red-400">{spent}p</div>
        </div>
        <div className="rounded-xl bg-brand-50 dark:bg-stone-800 py-2">
          <div className="text-[11px] text-stone-500 dark:text-stone-400">잔액</div>
          <div className="font-bold text-brand-700 dark:text-brand-400">{balance}p</div>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="text-stone-400 text-center py-6 text-sm">아직 거래 내역이 없어요.</div>
      ) : (
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {rows.map((row, i) => (
            <div key={row.e.id ?? i} className="flex items-center gap-2 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{labelOf(row.e)}</div>
                <div className="text-[11px] text-stone-400">{row.e.date}</div>
              </div>
              <div
                className={`text-sm font-bold tabular-nums ${
                  row.e.delta >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {row.e.delta >= 0 ? "+" : ""}
                {row.e.delta}p
              </div>
              <div className="text-xs text-stone-400 tabular-nums w-16 text-right">
                {row.after}p
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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
