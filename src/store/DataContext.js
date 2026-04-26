import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
import { storage, KEYS } from "../storage";
import { bootstrapIfEmpty, resetAll } from "../data/bootstrap";
import { migrateQuestsIfNeeded } from "../lib/migrate-quests";
const DataContext = createContext(null);
export function DataProvider({ children }) {
    const [state, setState] = useState({
        students: [],
        subjects: [],
        materials: [],
        assignments: {},
    });
    const [ready, setReady] = useState(false);
    const load = useCallback(async () => {
        await bootstrapIfEmpty();
        await migrateQuestsIfNeeded();
        const [students, subjects, materials, assignments] = await Promise.all([
            storage.read(KEYS.students),
            storage.read(KEYS.subjects),
            storage.read(KEYS.materials),
            storage.read(KEYS.assignments),
        ]);
        setState({
            students: students ?? [],
            subjects: (subjects ?? []).sort((a, b) => a.order - b.order),
            materials: materials ?? [],
            assignments: assignments ?? {},
        });
        setReady(true);
    }, []);
    useEffect(() => {
        load();
    }, [load]);
    const value = useMemo(() => ({
        ...state,
        ready,
        reload: load,
        reset: async () => {
            await resetAll();
            await load();
        },
        saveStudents: async (s) => {
            await storage.write(KEYS.students, s);
            await load();
        },
        saveSubjects: async (s) => {
            await storage.write(KEYS.subjects, s);
            await load();
        },
        saveMaterials: async (m) => {
            await storage.write(KEYS.materials, m);
            await load();
        },
        saveAssignments: async (a) => {
            await storage.write(KEYS.assignments, a);
            await load();
        },
    }), [state, ready, load]);
    return _jsx(DataContext.Provider, { value: value, children: children });
}
export function useData() {
    const ctx = useContext(DataContext);
    if (!ctx)
        throw new Error("useData must be used inside DataProvider");
    return ctx;
}
