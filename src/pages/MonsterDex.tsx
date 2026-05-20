import { useEffect, useMemo, useState } from "react";
import { useData } from "../store/DataContext";
import { useAuth } from "../store/AuthContext";
import { StudentTabs } from "../components/StudentTabs";
import { usePoints } from "../store/usePoints";
import { useMonsters } from "../store/useMonsters";
import { display } from "../lib/monsters";
import { MONSTER_SPECIES, findSpecies } from "../data/monsters";
import { EGG_PRICE } from "../types";
import type { MonsterInstance } from "../types";
import { todayISO } from "../lib/dates";

const RARITY_LABEL: Record<string, { label: string; color: string }> = {
  common: { label: "흔함", color: "#64748b" },
  rare: { label: "희귀", color: "#7c3aed" },
  epic: { label: "전설", color: "#dc2626" },
};

export default function MonsterDex() {
  const { students } = useData();
  const { activeChildId, setChild, role } = useAuth();
  const [studentId, setStudentId] = useState(
    activeChildId ?? students[0]?.id ?? ""
  );
  const { balance, append } = usePoints(studentId);
  const { collection, buyEgg, releaseActive, reload } = useMonsters(studentId);

  useEffect(() => {
    if (studentId && studentId !== activeChildId) setChild(studentId);
  }, [studentId]);

  // 도감에 수집된 종족 id 집합
  const collectedSpecies = useMemo(() => {
    const set = new Set<string>();
    for (const m of collection.dex) if (m.species_id) set.add(m.species_id);
    if (collection.active?.species_id) set.add(collection.active.species_id);
    return set;
  }, [collection]);

  const totalSpecies = MONSTER_SPECIES.length;
  const collectedCount = collectedSpecies.size;

  async function handleBuyEgg() {
    if (!studentId) return;
    if (collection.active) {
      alert("이미 키우는 친구가 있어요!\n진화가 끝나면 새 알을 살 수 있어요.");
      return;
    }
    if (balance < EGG_PRICE) {
      alert(`포인트가 부족해요!\n잔고: ${balance}p / 필요: ${EGG_PRICE}p`);
      return;
    }
    const result = await buyEgg();
    if (!result.ok) return;
    await append({
      student_id: studentId,
      date: todayISO(),
      delta: -EGG_PRICE,
      reason: "reward_purchase",
      note: "🥚 알 구매 (몬스터 도감)",
    });
  }

  async function handleRelease() {
    if (!confirm("정말 이 친구를 보내줄까요?\n진척도가 사라져요.")) return;
    await releaseActive();
    await reload();
  }

  if (!studentId) return null;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">📓 몬스터 도감</h1>
        <p className="text-stone-500 dark:text-stone-400">
          알을 사서 키우고, 퀘스트를 완료할 때마다 자라요.
        </p>
      </header>

      <StudentTabs
        students={students}
        selected={studentId}
        onSelect={setStudentId}
      />

      <ActiveCard
        active={collection.active}
        balance={balance}
        eggPrice={EGG_PRICE}
        onBuyEgg={handleBuyEgg}
        onRelease={role === "parent" ? handleRelease : undefined}
      />

      <section className="card">
        <header className="flex items-center justify-between mb-3">
          <h2 className="font-bold">🏆 도감</h2>
          <span className="text-sm text-stone-500 dark:text-stone-400">
            {collectedCount} / {totalSpecies}
          </span>
        </header>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {MONSTER_SPECIES.map((sp) => {
            const collected = collectedSpecies.has(sp.id);
            const final = sp.stages[sp.stages.length - 1];
            const rar = RARITY_LABEL[sp.rarity] ?? RARITY_LABEL.common;
            return (
              <div
                key={sp.id}
                className={`flex flex-col items-center text-center p-3 rounded-xl border ${
                  collected
                    ? "border-brand-300 bg-white dark:bg-stone-900 dark:border-brand-700"
                    : "border-stone-200 bg-stone-50 dark:bg-stone-800 dark:border-stone-700 opacity-60"
                }`}
              >
                <div className="text-4xl mb-1">
                  {collected ? final.emoji : "❓"}
                </div>
                <div className="text-xs font-bold">
                  {collected ? final.name : "???"}
                </div>
                <span
                  className="chip text-[10px] mt-1"
                  style={{ backgroundColor: rar.color + "22", color: rar.color }}
                >
                  {rar.label}
                </span>
                {collected && (
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                    {sp.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <DexEntries dex={collection.dex} />
    </div>
  );
}

function ActiveCard({
  active,
  balance,
  eggPrice,
  onBuyEgg,
  onRelease,
}: {
  active: MonsterInstance | null;
  balance: number;
  eggPrice: number;
  onBuyEgg: () => void;
  onRelease?: () => void;
}) {
  if (!active) {
    return (
      <section className="card text-center mb-4">
        <div className="text-6xl mb-2">🪺</div>
        <h2 className="font-bold mb-1">아직 키우는 친구가 없어요</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
          알을 사서 부화시켜 보세요. 퀘스트 5개를 완료하면 부화해요!
        </p>
        <button
          className={
            balance >= eggPrice ? "btn-primary" : "btn-ghost opacity-50"
          }
          disabled={balance < eggPrice}
          onClick={onBuyEgg}
        >
          🥚 알 구매 — {eggPrice}p
        </button>
        {balance < eggPrice && (
          <p className="text-xs text-stone-400 mt-2">
            잔고 {balance}p — {eggPrice - balance}p 더 필요해요
          </p>
        )}
      </section>
    );
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

  return (
    <section className="card text-center mb-4">
      <div className="text-7xl mb-2">{d.emoji}</div>
      <h2 className="font-bold text-xl mb-1">{d.name}</h2>
      {sp && (
        <div className="text-xs text-stone-500 dark:text-stone-400 mb-2">
          {sp.description}
        </div>
      )}
      <div className="text-xs text-stone-400 mb-3">
        단계 {cur} / {totalStages - 1}
      </div>

      {next && (
        <>
          <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-3 overflow-hidden mb-1">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mb-3">
            {d.isEgg
              ? `부화까지 퀘스트 ${next.remaining}개 더!`
              : `다음 ${next.emoji} ${next.name}까지 ${next.remaining}개`}
          </div>
        </>
      )}
      {!next && (
        <div className="text-sm text-amber-700 dark:text-amber-400 mb-3">
          ✨ 최종 진화 완료! 곧 도감으로 이동해요.
        </div>
      )}

      <div className="flex justify-center gap-2">
        <button
          className="btn-ghost opacity-50"
          disabled
          title="키우는 친구가 있어 새 알을 살 수 없어요"
        >
          🥚 알 구매 — {eggPrice}p
        </button>
        {onRelease && (
          <button
            className="btn-ghost text-xs text-red-500"
            onClick={onRelease}
            title="보호자만 가능"
          >
            방생
          </button>
        )}
      </div>
    </section>
  );
}

function DexEntries({ dex }: { dex: MonsterInstance[] }) {
  if (dex.length === 0) return null;
  return (
    <section className="card mt-4">
      <h3 className="font-bold mb-2">📜 졸업한 친구들</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {dex.map((m) => {
          const d = display(m);
          return (
            <div
              key={m.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 dark:bg-stone-800"
            >
              <span className="text-3xl">{d.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{d.name}</div>
                <div className="text-[10px] text-stone-500">
                  {m.acquiredAt.slice(0, 10)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
