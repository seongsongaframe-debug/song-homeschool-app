import { useCallback, useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
export function useDailyLog(date, studentId) {
    const [log, setLog] = useState(null);
    const load = useCallback(async () => {
        const existing = await storage.read(KEYS.log(date, studentId));
        setLog(existing ?? { date, student_id: studentId, entries: [] });
    }, [date, studentId]);
    useEffect(() => {
        load();
    }, [load]);
    const append = useCallback(async (entry) => {
        const current = (await storage.read(KEYS.log(date, studentId))) ?? {
            date,
            student_id: studentId,
            entries: [],
        };
        const next = { ...current, entries: [...current.entries, entry] };
        await storage.write(KEYS.log(date, studentId), next);
        setLog(next);
    }, [date, studentId]);
    const setReflection = useCallback(async (text) => {
        const current = (await storage.read(KEYS.log(date, studentId))) ?? {
            date,
            student_id: studentId,
            entries: [],
        };
        const next = { ...current, reflection: text };
        await storage.write(KEYS.log(date, studentId), next);
        setLog(next);
    }, [date, studentId]);
    return { log, append, setReflection, reload: load };
}
