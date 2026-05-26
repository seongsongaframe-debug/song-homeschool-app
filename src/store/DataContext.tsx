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
import { migrateQuestsIfNeeded } from "../lib/migrate-quests";
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
  error: string | null;
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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      await bootstrapIfEmpty();
      await migrateQuestsIfNeeded();
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
      setError(null);
    } catch (e) {
      // 조용히 "준비 중…" 으로 영원히 멈추는 것을 방지.
      // 가장 흔한 원인: Firestore Rules 권한 거부 (테스트 모드 만료 등).
      // App.tsx 가 error 메시지를 띄워 사용자에게 조치 경로를 안내한다.
      const err = e as { code?: string; message?: string };
      console.error("[data:load]", err);
      setError(
        err?.code === "permission-denied"
          ? "Firestore 권한 거부 — Firebase 콘솔 > Firestore Database > 규칙 탭에서 firestore.rules 내용을 게시하세요."
          : err?.message ?? String(e)
      );
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<DataContextValue>(
    () => ({
      ...state,
      ready,
      error,
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
    [state, ready, error, load]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
