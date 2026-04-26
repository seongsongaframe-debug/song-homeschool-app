import { useCallback, useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
function defaultProgress(material) {
    switch (material.progress_type) {
        case "linear":
            return { type: "linear", completed: {} };
        case "daily_reps":
            return { type: "daily_reps", totalDone: 0, byDate: {} };
        case "mastery":
            return { type: "mastery", attempts: [], unlocked: false };
        case "free":
            return { type: "free", count: 0 };
    }
}
export function useProgress(studentId, material) {
    const [progress, setProgress] = useState(null);
    const load = useCallback(async () => {
        if (!material) {
            setProgress(null);
            return;
        }
        const p = await storage.read(KEYS.progress(studentId, material.id));
        setProgress(p ?? defaultProgress(material));
    }, [studentId, material]);
    useEffect(() => {
        load();
    }, [load]);
    const save = useCallback(async (next) => {
        if (!material)
            return;
        await storage.write(KEYS.progress(studentId, material.id), next);
        setProgress(next);
    }, [studentId, material]);
    return { progress, save, reload: load };
}
export function masteryAvg(p, lastN = 3) {
    if (p.attempts.length === 0)
        return 0;
    const last = p.attempts.slice(-lastN);
    const sum = last.reduce((acc, a) => acc + a.score / a.total, 0);
    return sum / last.length;
}
export function linearPercent(p, m) {
    const total = m.structure.units.reduce((acc, u) => acc + u.items, 0);
    if (total === 0)
        return 0;
    const done = m.structure.units.reduce((acc, u) => acc + Math.min(p.completed[u.id] ?? 0, u.items), 0);
    return done / total;
}
export function dailyRepsToday(p, date) {
    return p.byDate[date] ?? 0;
}
export function freeCount(p) {
    return p.count;
}
export { defaultProgress };
