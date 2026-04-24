import { useCallback, useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
import type { DailyLog, DailyLogEntry } from "../types";

export function useDailyLog(date: string, studentId: string) {
  const [log, setLog] = useState<DailyLog | null>(null);

  const load = useCallback(async () => {
    const existing = await storage.read<DailyLog>(KEYS.log(date, studentId));
    setLog(existing ?? { date, student_id: studentId, entries: [] });
  }, [date, studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const append = useCallback(
    async (entry: DailyLogEntry) => {
      const current =
        (await storage.read<DailyLog>(KEYS.log(date, studentId))) ?? {
          date,
          student_id: studentId,
          entries: [],
        };
      const next: DailyLog = { ...current, entries: [...current.entries, entry] };
      await storage.write(KEYS.log(date, studentId), next);
      setLog(next);
    },
    [date, studentId]
  );

  const setReflection = useCallback(
    async (text: string) => {
      const current =
        (await storage.read<DailyLog>(KEYS.log(date, studentId))) ?? {
          date,
          student_id: studentId,
          entries: [],
        };
      const next: DailyLog = { ...current, reflection: text };
      await storage.write(KEYS.log(date, studentId), next);
      setLog(next);
    },
    [date, studentId]
  );

  return { log, append, setReflection, reload: load };
}
