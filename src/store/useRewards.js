import { useCallback, useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
export function useRewards() {
    const [rewards, setRewards] = useState([]);
    const load = useCallback(async () => {
        const data = await storage.read(KEYS.rewards);
        setRewards(data ?? []);
    }, []);
    useEffect(() => {
        load();
    }, [load]);
    const save = useCallback(async (r) => {
        const data = (await storage.read(KEYS.rewards)) ?? [];
        const exists = data.find((x) => x.id === r.id);
        const next = exists
            ? data.map((x) => (x.id === r.id ? r : x))
            : [...data, r];
        await storage.write(KEYS.rewards, next);
        setRewards(next);
    }, []);
    const remove = useCallback(async (id) => {
        const data = (await storage.read(KEYS.rewards)) ?? [];
        const next = data.filter((x) => x.id !== id);
        await storage.write(KEYS.rewards, next);
        setRewards(next);
    }, []);
    return { rewards, save, remove, reload: load };
}
export function usePurchases() {
    const [purchases, setPurchases] = useState([]);
    const load = useCallback(async () => {
        const keys = await storage.list(KEYS.purchasesAll);
        const items = [];
        for (const k of keys) {
            const p = await storage.read(k);
            if (p)
                items.push(p);
        }
        items.sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
        setPurchases(items);
    }, []);
    useEffect(() => {
        load();
    }, [load]);
    const save = useCallback(async (p) => {
        await storage.write(KEYS.purchase(p.id), p);
        await load();
    }, [load]);
    const remove = useCallback(async (id) => {
        await storage.remove(KEYS.purchase(id));
        await load();
    }, [load]);
    return { purchases, save, remove, reload: load };
}
