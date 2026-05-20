import { useCallback, useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
import { applyProgress, makeEgg } from "../lib/monsters";
import { findSpecies } from "../data/monsters";
const EMPTY = { active: null, dex: [] };
export function useMonsters(studentId) {
    const [collection, setCollection] = useState(EMPTY);
    const load = useCallback(async () => {
        if (!studentId) {
            setCollection(EMPTY);
            return;
        }
        const data = await storage.read(KEYS.monsters(studentId));
        setCollection(data ?? EMPTY);
    }, [studentId]);
    useEffect(() => {
        load();
    }, [load]);
    // 항상 storage에서 최신 상태를 읽고 갱신 — React 상태 stale 회피.
    async function readFresh() {
        const data = await storage.read(KEYS.monsters(studentId));
        return data ?? EMPTY;
    }
    const buyEgg = useCallback(async () => {
        if (!studentId)
            return { ok: false, reason: "no-student" };
        const cur = await readFresh();
        if (cur.active)
            return { ok: false, reason: "already-active" };
        const egg = makeEgg(studentId, crypto.randomUUID());
        const next = { ...cur, active: egg };
        await storage.write(KEYS.monsters(studentId), next);
        setCollection(next);
        return { ok: true, egg };
    }, [studentId]);
    const applyProgressToActive = useCallback(async () => {
        if (!studentId)
            return null;
        const cur = await readFresh();
        if (!cur.active)
            return null;
        const before = cur.active;
        const after = applyProgress(before, 1);
        if (after === before)
            return null;
        const sp = after.species_id ? findSpecies(after.species_id) : null;
        const completed = !!sp && after.stage >= sp.stages.length;
        const hatched = !before.species_id && !!after.species_id;
        const evolved = !!before.species_id && before.stage !== after.stage;
        const next = completed
            ? { active: null, dex: [...cur.dex, after] }
            : { ...cur, active: after };
        await storage.write(KEYS.monsters(studentId), next);
        setCollection(next);
        return { instance: after, hatched, evolved, completed };
    }, [studentId]);
    // 보호자/디버그 용도. 현재 키우는 친구를 도감에 보내지 않고 그냥 버린다.
    const releaseActive = useCallback(async () => {
        if (!studentId)
            return;
        const cur = await readFresh();
        if (!cur.active)
            return;
        const next = { ...cur, active: null };
        await storage.write(KEYS.monsters(studentId), next);
        setCollection(next);
    }, [studentId]);
    return { collection, buyEgg, applyProgressToActive, releaseActive, reload: load };
}
