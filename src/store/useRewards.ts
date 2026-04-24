import { useCallback, useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
import type { Purchase, Reward } from "../types";

export function useRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);

  const load = useCallback(async () => {
    const data = await storage.read<Reward[]>(KEYS.rewards);
    setRewards(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (r: Reward) => {
      const data = (await storage.read<Reward[]>(KEYS.rewards)) ?? [];
      const exists = data.find((x) => x.id === r.id);
      const next = exists
        ? data.map((x) => (x.id === r.id ? r : x))
        : [...data, r];
      await storage.write(KEYS.rewards, next);
      setRewards(next);
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    const data = (await storage.read<Reward[]>(KEYS.rewards)) ?? [];
    const next = data.filter((x) => x.id !== id);
    await storage.write(KEYS.rewards, next);
    setRewards(next);
  }, []);

  return { rewards, save, remove, reload: load };
}

export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const load = useCallback(async () => {
    const keys = await storage.list(KEYS.purchasesAll);
    const items: Purchase[] = [];
    for (const k of keys) {
      const p = await storage.read<Purchase>(k);
      if (p) items.push(p);
    }
    items.sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
    setPurchases(items);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (p: Purchase) => {
    await storage.write(KEYS.purchase(p.id), p);
    await load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await storage.remove(KEYS.purchase(id));
    await load();
  }, [load]);

  return { purchases, save, remove, reload: load };
}
