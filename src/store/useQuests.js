import { useCallback, useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
export function useQuests(studentId) {
    const [quests, setQuests] = useState([]);
    const load = useCallback(async () => {
        if (!studentId) {
            setQuests([]);
            return;
        }
        const keys = await storage.list(KEYS.questsAll(studentId));
        const items = [];
        for (const k of keys) {
            const q = await storage.read(k);
            if (q)
                items.push(q);
        }
        items.sort((a, b) => {
            if (a.due_date !== b.due_date)
                return a.due_date.localeCompare(b.due_date);
            return a.id.localeCompare(b.id);
        });
        setQuests(items);
    }, [studentId]);
    useEffect(() => {
        load();
    }, [load]);
    const save = useCallback(async (q) => {
        await storage.write(KEYS.quest(q.student_id, q.id), q);
        await load();
    }, [load]);
    const remove = useCallback(async (q) => {
        await storage.remove(KEYS.quest(q.student_id, q.id));
        await load();
    }, [load]);
    const saveBatch = useCallback(async (list) => {
        for (const q of list) {
            await storage.write(KEYS.quest(q.student_id, q.id), q);
        }
        await load();
    }, [load]);
    return { quests, save, remove, saveBatch, reload: load };
}
