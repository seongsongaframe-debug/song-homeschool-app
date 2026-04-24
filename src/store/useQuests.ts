import { useCallback, useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
import type { Quest } from "../types";

export function useQuests(studentId: string, date: string) {
  const [quests, setQuests] = useState<Quest[]>([]);

  const load = useCallback(async () => {
    if (!studentId || !date) {
      setQuests([]);
      return;
    }
    const keys = await storage.list(KEYS.questsByDay(studentId, date));
    const items: Quest[] = [];
    for (const k of keys) {
      const q = await storage.read<Quest>(k);
      if (q) items.push(q);
    }
    items.sort((a, b) => a.id.localeCompare(b.id));
    setQuests(items);
  }, [studentId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (q: Quest) => {
      await storage.write(KEYS.quest(q.student_id, q.date, q.id), q);
      await load();
    },
    [load]
  );

  const remove = useCallback(
    async (q: Quest) => {
      await storage.remove(KEYS.quest(q.student_id, q.date, q.id));
      await load();
    },
    [load]
  );

  const saveBatch = useCallback(
    async (list: Quest[]) => {
      for (const q of list) {
        await storage.write(KEYS.quest(q.student_id, q.date, q.id), q);
      }
      await load();
    },
    [load]
  );

  return { quests, save, remove, saveBatch, reload: load };
}
