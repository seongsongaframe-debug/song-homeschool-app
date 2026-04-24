import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { storage, KEYS } from "../storage";
import { bootstrapIfEmpty, resetAll } from "../data/bootstrap";
import type {
  AssignmentsByStudent,
  Material,
  Student,
  Subject,
} from "../types";

interface DataState {
  students: Student[];
  subjects: Subject[];
  materials: Material[];
  assignments: AssignmentsByStudent;
}

interface DataContextValue extends DataState {
  reload: () => Promise<void>;
  reset: () => Promise<void>;
  saveStudents: (s: Student[]) => Promise<void>;
  saveSubjects: (s: Subject[]) => Promise<void>;
  saveMaterials: (m: Material[]) => Promise<void>;
  saveAssignments: (a: AssignmentsByStudent) => Promise<void>;
  ready: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>({
    students: [],
    subjects: [],
    materials: [],
    assignments: {},
  });
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    await bootstrapIfEmpty();
    const [students, subjects, materials, assignments] = await Promise.all([
      storage.read<Student[]>(KEYS.students),
      storage.read<Subject[]>(KEYS.subjects),
      storage.read<Material[]>(KEYS.materials),
      storage.read<AssignmentsByStudent>(KEYS.assignments),
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

  const value = useMemo<DataContextValue>(
    () => ({
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
    }),
    [state, ready, load]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
