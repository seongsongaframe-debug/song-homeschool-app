import { useState } from "react";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { MaterialCard } from "../components/MaterialCard";
import { fmtKDate, todayISO } from "../lib/dates";
import { useDailyLog } from "../store/useDailyLog";

export default function Today() {
  const { students, subjects, materials, assignments, saveAssignments } =
    useData();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const date = todayISO();
  const { log, setReflection } = useDailyLog(date, studentId);

  if (!studentId) return null;

  const studentAssignments = (assignments[studentId] ?? []).filter((a) => a.active);
  const materialMap = new Map(materials.map((m) => [m.id, m]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const grouped = subjects
    .map((subj) => {
      const items = studentAssignments
        .map((a) => materialMap.get(a.material_id))
        .filter((m): m is NonNullable<typeof m> => !!m && m.subject_id === subj.id);
      return { subject: subj, items };
    })
    .filter((g) => g.items.length > 0);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">오늘의 학습</h1>
        <p className="text-stone-500">{fmtKDate(date)}</p>
      </header>

      <StudentTabs
        students={students}
        selected={studentId}
        onSelect={setStudentId}
      />

      {grouped.map(({ subject, items }) => (
        <section key={subject.id} className="mb-6">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <span>{subject.icon}</span>
            <span>{subject.name}</span>
            <span className="text-xs text-stone-400">{items.length}개</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((m) => (
              <MaterialCard
                key={m.id}
                material={m}
                subject={subjectMap.get(m.subject_id)}
                studentId={studentId}
                onUnlock={async (nextId) => {
                  const list = assignments[studentId] ?? [];
                  if (list.some((a) => a.material_id === nextId)) return;
                  const next = {
                    ...assignments,
                    [studentId]: [
                      ...list,
                      {
                        material_id: nextId,
                        started: todayISO(),
                        active: true,
                        priority: 1,
                      },
                    ],
                  };
                  await saveAssignments(next);
                }}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-8">
        <h2 className="font-bold text-lg mb-2">오늘의 한마디</h2>
        <textarea
          className="input min-h-[80px]"
          placeholder="오늘 가장 인상 깊었던 것 한 줄로 적기"
          value={log?.reflection ?? ""}
          onChange={(e) => setReflection(e.target.value)}
        />
      </section>

      <footer className="mt-8 text-center text-xs text-stone-400">
        오늘 기록 항목 {log?.entries.length ?? 0}개
      </footer>
    </div>
  );
}
