import { useCallback, useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
import type { MonsterCollection, MonsterInstance } from "../types";
import { applyProgress, makeEgg } from "../lib/monsters";
import { findSpecies } from "../data/monsters";

const EMPTY: MonsterCollection = { active: null, dex: [] };

export interface ProgressOutcome {
  instance: MonsterInstance;
  hatched: boolean;
  evolved: boolean;
  completed: boolean;
}

export function useMonsters(studentId: string) {
  const [collection, setCollection] = useState<MonsterCollection>(EMPTY);

  const load = useCallback(async () => {
    if (!studentId) {
      setCollection(EMPTY);
      return;
    }
    const data = await storage.read<MonsterCollection>(KEYS.monsters(studentId));
    setCollection(data ?? EMPTY);
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  // 항상 storage에서 최신 상태를 읽고 갱신 — React 상태 stale 회피.
  async function readFresh(): Promise<MonsterCollection> {
    const data = await storage.read<MonsterCollection>(KEYS.monsters(studentId));
    return data ?? EMPTY;
  }

  const buyEgg = useCallback(async (): Promise<
    { ok: true; egg: MonsterInstance } | { ok: false; reason: "already-active" | "no-student" }
  > => {
    if (!studentId) return { ok: false, reason: "no-student" };
    const cur = await readFresh();
    if (cur.active) return { ok: false, reason: "already-active" };
    const egg = makeEgg(studentId, crypto.randomUUID());
    const next: MonsterCollection = { ...cur, active: egg };
    await storage.write(KEYS.monsters(studentId), next);
    setCollection(next);
    return { ok: true, egg };
  }, [studentId]);

  const applyProgressToActive = useCallback(async (): Promise<ProgressOutcome | null> => {
    if (!studentId) return null;
    const cur = await readFresh();
    if (!cur.active) return null;
    const before = cur.active;
    const after = applyProgress(before, 1);
    if (after === before) return null;

    const sp = after.species_id ? findSpecies(after.species_id) : null;
    const completed = !!sp && after.stage >= sp.stages.length;
    const hatched = !before.species_id && !!after.species_id;
    const evolved = !!before.species_id && before.stage !== after.stage;

    const next: MonsterCollection = completed
      ? { active: null, dex: [...cur.dex, after] }
      : { ...cur, active: after };
    await storage.write(KEYS.monsters(studentId), next);
    setCollection(next);
    return { instance: after, hatched, evolved, completed };
  }, [studentId]);

  // 보호자/디버그 용도. 현재 키우는 친구를 도감에 보내지 않고 그냥 버린다.
  const releaseActive = useCallback(async () => {
    if (!studentId) return;
    const cur = await readFresh();
    if (!cur.active) return;
    const next: MonsterCollection = { ...cur, active: null };
    await storage.write(KEYS.monsters(studentId), next);
    setCollection(next);
  }, [studentId]);

  return { collection, buyEgg, applyProgressToActive, releaseActive, reload: load };
}
