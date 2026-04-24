import { useEffect, useMemo, useState } from "react";
import { storage, KEYS } from "../storage";
import { useData } from "../store/DataContext";
import type {
  DailyLog,
  Material,
  Project,
  ReadingEntry,
  Subject,
} from "../types";
import { fmtKDate, shiftDate, todayISO } from "../lib/dates";

export default function Report() {
  const { students, subjects, materials } = useData();
  const [date, setDate] = useState(todayISO());
  const [logs, setLogs] = useState<Record<string, DailyLog | null>>({});
  const [reading, setReading] = useState<Record<string, ReadingEntry[]>>({});
  const [projects, setProjects] = useState<Record<string, Project[]>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const materialMap = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials]
  );
  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lmap: Record<string, DailyLog | null> = {};
      const rmap: Record<string, ReadingEntry[]> = {};
      const pmap: Record<string, Project[]> = {};
      for (const s of students) {
        lmap[s.id] = await storage.read<DailyLog>(KEYS.log(date, s.id));
        rmap[s.id] = (await storage.read<ReadingEntry[]>(KEYS.reading(s.id))) ?? [];
        const keys = await storage.list(KEYS.projectsList(s.id));
        const items: Project[] = [];
        for (const k of keys) {
          const p = await storage.read<Project>(k);
          if (p) items.push(p);
        }
        pmap[s.id] = items;
      }
      if (cancelled) return;
      setLogs(lmap);
      setReading(rmap);
      setProjects(pmap);
      const stored = await storage.read<{ generatedAt: string; body: string }>(
        KEYS.report(date)
      );
      setSavedAt(stored?.generatedAt ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [date, students]);

  const md = useMemo(
    () =>
      buildReport({
        date,
        students,
        subjectMap,
        materialMap,
        logs,
        reading,
        projects,
      }),
    [date, students, subjectMap, materialMap, logs, reading, projects]
  );

  async function save() {
    await storage.write(KEYS.report(date), {
      date,
      generatedAt: new Date().toISOString(),
      body: md,
    });
    setSavedAt(new Date().toISOString());
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(md);
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">일일 요약</h1>
        <p className="text-stone-500">{fmtKDate(date)}</p>
      </header>

      <div className="flex items-center gap-2 mb-4">
        <button className="btn-ghost" onClick={() => setDate((d) => shiftDate(d, -1))}>
          ◀
        </button>
        <input
          type="date"
          className="input flex-1"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button className="btn-ghost" onClick={() => setDate((d) => shiftDate(d, 1))}>
          ▶
        </button>
        <button className="btn-ghost" onClick={() => setDate(todayISO())}>
          오늘
        </button>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm text-stone-500">
            {savedAt ? `저장됨: ${new Date(savedAt).toLocaleString()}` : "미저장"}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost text-sm" onClick={copyToClipboard}>
              복사
            </button>
            <button className="btn-primary text-sm" onClick={save}>
              저장
            </button>
          </div>
        </div>
        <pre className="whitespace-pre-wrap text-sm font-[Pretendard,sans-serif] leading-6 text-stone-800 dark:text-stone-200">
          {md}
        </pre>
      </div>
    </div>
  );
}

function buildReport(args: {
  date: string;
  students: { id: string; name: string; grade: number; emoji: string }[];
  subjectMap: Map<string, Subject>;
  materialMap: Map<string, Material>;
  logs: Record<string, DailyLog | null>;
  reading: Record<string, ReadingEntry[]>;
  projects: Record<string, Project[]>;
}) {
  const { date, students, subjectMap, materialMap, logs, reading, projects } = args;
  const lines: string[] = [];
  lines.push(`# 송홈스쿨 일일 요약 — ${fmtKDate(date)}`);
  lines.push("");
  for (const s of students) {
    lines.push(`## ${s.emoji} ${s.name} (${s.grade}학년)`);
    const log = logs[s.id];
    const entries = log?.entries ?? [];

    const bySubject = new Map<string, typeof entries>();
    for (const e of entries) {
      const m = materialMap.get(e.material_id);
      if (!m) continue;
      const arr = bySubject.get(m.subject_id) ?? [];
      arr.push(e);
      bySubject.set(m.subject_id, arr);
    }

    if (bySubject.size === 0) {
      lines.push("- 기록 없음");
    } else {
      for (const [subjId, items] of bySubject) {
        const subj = subjectMap.get(subjId);
        const totalDur = items.reduce((sum, e) => sum + (e.duration_min ?? 0), 0);
        const matIds = Array.from(new Set(items.map((e) => e.material_id)));
        lines.push(
          `- ${subj?.icon ?? "•"} **${subj?.name ?? subjId}** (${items.length}건${totalDur ? `, ${totalDur}분` : ""})`
        );
        for (const mid of matIds) {
          const m = materialMap.get(mid);
          const its = items.filter((e) => e.material_id === mid);
          const total = its.reduce((s, e) => s + (e.amount ?? e.items_done ?? 1), 0);
          lines.push(`  - ${m?.name ?? mid}: ${total}회/항목`);
        }
      }
    }

    const todayBooks = (reading[s.id] ?? []).filter((b) => b.date === date);
    if (todayBooks.length > 0) {
      lines.push(`- 📚 영어 독서: ${todayBooks.length}권`);
      for (const b of todayBooks) {
        lines.push(`  - ${b.title} (AR ${b.ar_level.toFixed(1)})`);
      }
    }

    const activeProjects = (projects[s.id] ?? []).filter(
      (p) => p.status === "in_progress"
    );
    if (activeProjects.length > 0) {
      lines.push(`- 🔬 진행 중 프로젝트: ${activeProjects.length}개`);
      for (const p of activeProjects.slice(0, 3)) {
        lines.push(`  - ${p.title}`);
      }
    }

    if (log?.reflection) {
      lines.push(`- 💭 오늘의 한마디: "${log.reflection}"`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
