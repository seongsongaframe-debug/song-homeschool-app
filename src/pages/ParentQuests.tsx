import { useEffect, useMemo, useState } from "react";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import { fmtKDate, shiftDate, todayISO } from "../lib/dates";
import { storage, KEYS } from "../storage";
import type {
  Difficulty,
  Quest,
  QuestStatus,
  QuestTemplate,
  Subtask,
} from "../types";
import { DIFFICULTY_POINTS } from "../types";
import { parseHomework } from "../lib/homework-parser";

interface DraftItem {
  id: string;
  title: string;
  subject_id?: string;
  material_id?: string;
  target: number;
  unit: string;
  difficulty: Difficulty;
  points: number;
  note?: string;
  subtasks?: Subtask[];
  requires_verification?: boolean;
  existing?: Quest;
}

function fromQuest(q: Quest): DraftItem {
  return {
    id: q.id,
    title: q.title,
    subject_id: q.subject_id,
    material_id: q.material_id,
    target: q.target,
    unit: q.unit,
    difficulty: q.difficulty,
    points: q.points,
    note: q.note,
    subtasks: q.subtasks,
    requires_verification: q.requires_verification,
    existing: q,
  };
}

function emptyDraft(): DraftItem {
  return {
    id: crypto.randomUUID(),
    title: "",
    target: 1,
    unit: "건",
    difficulty: "normal",
    points: DIFFICULTY_POINTS.normal,
  };
}

export default function ParentQuests() {
  const { students, subjects, materials } = useData();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [templates, setTemplates] = useState<QuestTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPaste, setShowPaste] = useState(false);

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );
  const materialMap = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials]
  );

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      const keys = await storage.list(KEYS.questsByDay(studentId, date));
      const items: Quest[] = [];
      for (const k of keys) {
        const q = await storage.read<Quest>(k);
        if (q) items.push(q);
      }
      items.sort((a, b) => a.id.localeCompare(b.id));
      setDrafts(items.map(fromQuest));
    })();
    (async () => {
      const t = await storage.read<QuestTemplate[]>(KEYS.questTemplates(studentId));
      setTemplates(t ?? []);
    })();
  }, [studentId, date]);

  if (!studentId) return null;

  function addRow() {
    setDrafts((d) => [...d, emptyDraft()]);
  }

  function addFromMaterial(materialId: string) {
    const m = materialMap.get(materialId);
    if (!m) return;
    const d = emptyDraft();
    d.subject_id = m.subject_id;
    d.material_id = m.id;
    d.title = m.name;
    d.unit =
      m.progress_type === "daily_reps"
        ? m.unit
        : m.progress_type === "linear"
        ? "항목"
        : "건";
    d.target = m.progress_type === "daily_reps" ? m.daily_target : 1;
    setDrafts((list) => [...list, d]);
  }

  function update(id: string, patch: Partial<DraftItem>) {
    setDrafts((list) =>
      list.map((d) => {
        if (d.id !== id) return d;
        const next = { ...d, ...patch };
        if (patch.difficulty) {
          next.points = DIFFICULTY_POINTS[patch.difficulty];
        }
        return next;
      })
    );
  }

  function removeRow(id: string) {
    setDrafts((list) => list.filter((d) => d.id !== id));
  }

  async function distribute() {
    setSaving(true);
    const existingKeys = await storage.list(KEYS.questsByDay(studentId, date));
    const currentIds = new Set(drafts.map((d) => d.id));
    for (const k of existingKeys) {
      const q = await storage.read<Quest>(k);
      if (q && !currentIds.has(q.id)) {
        await storage.remove(k);
      }
    }
    for (const d of drafts) {
      const status: QuestStatus = d.existing?.status ?? "pending";
      const q: Quest = {
        id: d.id,
        student_id: studentId,
        date,
        title: d.title.trim() || "(제목 없음)",
        subject_id: d.subject_id,
        material_id: d.material_id,
        target: d.target,
        unit: d.unit,
        difficulty: d.difficulty,
        points: d.points,
        status,
        completedAt: d.existing?.completedAt,
        note: d.note,
        subtasks: d.subtasks,
        requires_verification: d.requires_verification,
        verified: d.existing?.verified ?? false,
      };
      await storage.write(KEYS.quest(studentId, date, q.id), q);
    }
    setSaving(false);
  }

  async function saveAsTemplate() {
    const name = templateName.trim();
    if (!name || drafts.length === 0) return;
    const template: QuestTemplate = {
      id: crypto.randomUUID(),
      name,
      student_id: studentId,
      items: drafts.map((d) => ({
        title: d.title,
        subject_id: d.subject_id,
        material_id: d.material_id,
        target: d.target,
        unit: d.unit,
        difficulty: d.difficulty,
        points: d.points,
        note: d.note,
        subtasks: d.subtasks,
        requires_verification: d.requires_verification,
      })),
    };
    const next = [...templates, template];
    await storage.write(KEYS.questTemplates(studentId), next);
    setTemplates(next);
    setTemplateName("");
  }

  function applyTemplate(t: QuestTemplate) {
    setDrafts(
      t.items.map((it) => ({
        id: crypto.randomUUID(),
        ...it,
      }))
    );
  }

  async function removeTemplate(id: string) {
    const next = templates.filter((t) => t.id !== id);
    await storage.write(KEYS.questTemplates(studentId), next);
    setTemplates(next);
  }

  function importParsed(parsed: ReturnType<typeof parseHomework>) {
    if (parsed.date) setDate(parsed.date);
    const imported: DraftItem[] = parsed.quests.map((p) => ({
      id: p.id,
      title: p.title,
      target: p.target,
      unit: p.unit,
      difficulty: p.difficulty,
      points: p.points,
      note: p.note,
      subtasks: p.subtasks.length > 0 ? p.subtasks : undefined,
      requires_verification: true,
    }));
    setDrafts((list) => [...list, ...imported]);
    setShowPaste(false);
  }

  const totalPoints = drafts.reduce((s, d) => s + d.points, 0);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">오늘 과제 배포 (보호자)</h1>
          <p className="text-stone-500 dark:text-stone-400">
            {fmtKDate(date)} · 총 {drafts.length}개 · 최대 {totalPoints}p
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowPaste(true)}
        >
          📋 학원 숙제 붙여넣기
        </button>
      </header>

      <div className="flex items-center gap-2 mb-4">
        <button
          className="btn-ghost"
          onClick={() => setDate((d) => shiftDate(d, -1))}
        >
          ◀
        </button>
        <input
          type="date"
          className="input flex-1"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          className="btn-ghost"
          onClick={() => setDate((d) => shiftDate(d, 1))}
        >
          ▶
        </button>
        <button className="btn-ghost" onClick={() => setDate(todayISO())}>
          오늘
        </button>
      </div>

      <StudentTabs
        students={students}
        selected={studentId}
        onSelect={setStudentId}
      />

      {showPaste && (
        <PasteDialog
          defaultDate={date}
          onCancel={() => setShowPaste(false)}
          onImport={importParsed}
        />
      )}

      {templates.length > 0 && (
        <section className="card mb-4">
          <h3 className="font-bold mb-2">📋 저장된 템플릿</h3>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg pl-3 pr-1 py-1"
              >
                <button
                  className="text-sm font-medium"
                  onClick={() => applyTemplate(t)}
                >
                  {t.name} ({t.items.length})
                </button>
                <button
                  className="text-xs text-stone-400 hover:text-red-500 px-1"
                  onClick={() => removeTemplate(t.id)}
                  aria-label={`${t.name} 템플릿 삭제`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card mb-4">
        <h3 className="font-bold mb-2">교재에서 바로 추가</h3>
        <div className="flex flex-wrap gap-1">
          {materials.map((m) => {
            const s = subjectMap.get(m.subject_id);
            return (
              <button
                key={m.id}
                onClick={() => addFromMaterial(m.id)}
                className="chip hover:brightness-95"
                style={{
                  backgroundColor: (s?.color ?? "#64748b") + "22",
                  color: s?.color ?? "#64748b",
                }}
              >
                {s?.icon} {m.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2 mb-4">
        {drafts.map((d) => {
          const subj = d.subject_id ? subjectMap.get(d.subject_id) : null;
          return (
            <div key={d.id} className="card">
              <div className="flex items-center gap-2 mb-2">
                {subj && (
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: subj.color }}
                  >
                    {subj.icon}
                  </span>
                )}
                <input
                  className="input flex-1"
                  placeholder="과제 제목 (예: 디딤돌 1단원 3페이지)"
                  value={d.title}
                  onChange={(e) => update(d.id, { title: e.target.value })}
                />
                <button
                  className="text-stone-400 hover:text-red-500 px-2"
                  onClick={() => removeRow(d.id)}
                  aria-label="삭제"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-stone-500 dark:text-stone-400">
                    분량
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    value={d.target}
                    onChange={(e) =>
                      update(d.id, { target: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500 dark:text-stone-400">
                    단위
                  </label>
                  <input
                    className="input"
                    value={d.unit}
                    onChange={(e) => update(d.id, { unit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500 dark:text-stone-400">
                    난이도
                  </label>
                  <select
                    className="input"
                    value={d.difficulty}
                    onChange={(e) =>
                      update(d.id, {
                        difficulty: e.target.value as Difficulty,
                      })
                    }
                  >
                    <option value="easy">⭐ 쉬움 (5p)</option>
                    <option value="normal">⭐⭐ 보통 (10p)</option>
                    <option value="hard">⭐⭐⭐ 어려움 (20p)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-stone-500 dark:text-stone-400">
                    포인트
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={d.points}
                    onChange={(e) =>
                      update(d.id, { points: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="mt-2">
                <label className="text-xs text-stone-500 dark:text-stone-400">
                  부연 설명 (선택)
                </label>
                <input
                  className="input"
                  placeholder="예: 따라읽으면서 쓰기 / 뜻 필수"
                  value={d.note ?? ""}
                  onChange={(e) =>
                    update(d.id, { note: e.target.value || undefined })
                  }
                />
              </div>

              <SubtaskEditor
                subtasks={d.subtasks}
                onChange={(list) => update(d.id, { subtasks: list })}
              />

              <label className="flex items-center gap-2 text-sm mt-2">
                <input
                  type="checkbox"
                  checked={d.requires_verification ?? false}
                  onChange={(e) =>
                    update(d.id, { requires_verification: e.target.checked })
                  }
                />
                보호자 확인 후 포인트 지급 (학원 숙제용)
              </label>
            </div>
          );
        })}

        <button className="btn-ghost w-full py-3" onClick={addRow}>
          + 과제 추가
        </button>
      </section>

      <section className="card mb-4 flex flex-col md:flex-row gap-2">
        <input
          className="input flex-1"
          placeholder="템플릿 이름 (예: 평일 기본 세트)"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
        />
        <button
          className="btn-ghost"
          onClick={saveAsTemplate}
          disabled={!templateName.trim() || drafts.length === 0}
        >
          현재 구성을 템플릿으로 저장
        </button>
      </section>

      <div className="sticky bottom-20 md:bottom-4 flex gap-2">
        <button
          className="btn-primary flex-1 py-4 text-lg shadow-lg"
          onClick={distribute}
          disabled={saving}
        >
          {saving ? "배포 중…" : `🚀 오늘 과제 배포 (${drafts.length}개)`}
        </button>
      </div>
    </div>
  );
}

function SubtaskEditor({
  subtasks,
  onChange,
}: {
  subtasks?: Subtask[];
  onChange: (list: Subtask[] | undefined) => void;
}) {
  const list = subtasks ?? [];
  return (
    <div className="mt-2">
      <label className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2">
        세부 체크 항목
        <button
          className="text-xs text-brand-600 dark:text-brand-400"
          onClick={() =>
            onChange([
              ...list,
              { id: crypto.randomUUID(), label: "", done: false },
            ])
          }
        >
          + 추가
        </button>
      </label>
      {list.length > 0 && (
        <div className="space-y-1 mt-1">
          {list.map((s, i) => (
            <div key={s.id} className="flex gap-1">
              <input
                className="input flex-1 py-1 text-sm"
                placeholder={`세부 항목 ${i + 1}`}
                value={s.label}
                onChange={(e) => {
                  const next = list.map((x) =>
                    x.id === s.id ? { ...x, label: e.target.value } : x
                  );
                  onChange(next);
                }}
              />
              <button
                className="text-stone-400 hover:text-red-500 px-2"
                onClick={() => {
                  const next = list.filter((x) => x.id !== s.id);
                  onChange(next.length > 0 ? next : undefined);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PasteDialog({
  defaultDate,
  onCancel,
  onImport,
}: {
  defaultDate: string;
  onCancel: () => void;
  onImport: (r: ReturnType<typeof parseHomework>) => void;
}) {
  const [text, setText] = useState("");
  const parsed = useMemo(
    () => parseHomework(text, defaultDate),
    [text, defaultDate]
  );
  const SAMPLE = `4.20 월
1. 13과 단어틀린것 3회쓰기,뜻필수
2. 14과 단어암기 5회쓰기,뜻필수
3.13과 낭독 5회연습후,영상올리기
4.13과 워크북
5.13과 text writing풀기
(따라읽으면서 쓰기)

그래머
11과 워크북 풀기`;
  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur flex items-start justify-center p-4 overflow-y-auto">
      <div className="card max-w-2xl w-full my-8">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg">📋 숙제 붙여넣기</h3>
          <button
            className="text-stone-400 hover:text-red-500"
            onClick={onCancel}
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-2">
          학원에서 받은 숙제 텍스트를 그대로 붙여넣으세요. 날짜·분량·세부항목을
          자동 인식합니다.
        </p>
        <textarea
          className="input min-h-[180px] font-mono text-sm"
          placeholder={SAMPLE}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {text.trim().length === 0 ? (
          <button
            className="btn-ghost w-full mt-2 text-sm"
            onClick={() => setText(SAMPLE)}
          >
            샘플 붙여넣기
          </button>
        ) : (
          <>
            <div className="mt-3">
              <div className="text-sm font-semibold mb-1">
                미리보기 — {parsed.quests.length}개 퀘스트
                {parsed.date && ` · 날짜 ${parsed.date}`}
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {parsed.quests.map((q, i) => (
                  <div
                    key={q.id}
                    className="text-sm p-2 rounded-lg bg-stone-50 dark:bg-stone-800"
                  >
                    <div className="font-medium">
                      {i + 1}. {q.title}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      {q.target}
                      {q.unit}
                      {q.note && ` · ${q.note}`}
                      {q.subtasks.length > 0 &&
                        ` · 세부 ${q.subtasks.length}개`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="btn-ghost flex-1" onClick={onCancel}>
                취소
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => onImport(parsed)}
                disabled={parsed.quests.length === 0}
              >
                {parsed.quests.length}개 가져오기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
