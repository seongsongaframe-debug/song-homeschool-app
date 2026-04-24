import { useEffect, useState } from "react";
import { storage, KEYS } from "../storage";
import { useData } from "../store/DataContext";
import { StudentTabs } from "../components/StudentTabs";
import type { Project, ProjectKind } from "../types";
import { todayISO } from "../lib/dates";

const KIND_LABEL: Record<ProjectKind, string> = {
  experience: "체험",
  research: "리서치",
  creative: "창작",
  field_trip: "현장학습",
};

const KIND_ICON: Record<ProjectKind, string> = {
  experience: "🌳",
  research: "🔬",
  creative: "🎨",
  field_trip: "🚌",
};

export default function Projects() {
  const { students } = useData();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function reload() {
    if (!studentId) return;
    const keys = await storage.list(KEYS.projectsList(studentId));
    const items: Project[] = [];
    for (const k of keys) {
      const p = await storage.read<Project>(k);
      if (p) items.push(p);
    }
    items.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    setProjects(items);
  }

  useEffect(() => {
    reload();
  }, [studentId]);

  if (!studentId) return null;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">체험·프로젝트</h1>
          <p className="text-stone-500">
            체험·리서치·창작 활동을 프로젝트 단위로 관리
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(blankProject(studentId));
            setShowNew(true);
          }}
        >
          + 새 프로젝트
        </button>
      </header>

      <StudentTabs
        students={students}
        selected={studentId}
        onSelect={setStudentId}
      />

      {showNew && editing && (
        <ProjectEditor
          project={editing}
          onCancel={() => {
            setShowNew(false);
            setEditing(null);
          }}
          onSave={async (p) => {
            await storage.write(KEYS.project(studentId, p.id), p);
            setShowNew(false);
            setEditing(null);
            await reload();
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            onEdit={() => {
              setEditing(p);
              setShowNew(true);
            }}
            onDelete={async () => {
              await storage.remove(KEYS.project(studentId, p.id));
              await reload();
            }}
          />
        ))}
        {projects.length === 0 && (
          <div className="md:col-span-2 text-center text-stone-400 py-12">
            아직 프로젝트가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function blankProject(studentId: string): Project {
  return {
    id: crypto.randomUUID(),
    student_id: studentId,
    kind: "experience",
    title: "",
    startDate: todayISO(),
    goal: "",
    status: "in_progress",
    notes: [],
    photos: [],
  };
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="card">
      <div className="flex items-start gap-2">
        <span className="text-2xl">{KIND_ICON[project.kind]}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{project.title || "(제목 없음)"}</div>
          <div className="text-xs text-stone-500">
            {KIND_LABEL[project.kind]} · {project.startDate}
            {project.endDate ? ` ~ ${project.endDate}` : " ~ 진행 중"}
          </div>
        </div>
        <span
          className="chip"
          style={
            project.status === "done"
              ? { backgroundColor: "#dcfce7", color: "#166534" }
              : project.status === "in_progress"
              ? { backgroundColor: "#dbeafe", color: "#1e40af" }
              : { backgroundColor: "#f5f5f4", color: "#57534e" }
          }
        >
          {project.status === "done" ? "완료" : project.status === "in_progress" ? "진행" : "예정"}
        </span>
      </div>
      {project.goal && (
        <div className="text-sm text-stone-600 dark:text-stone-300 mt-2 line-clamp-2">
          🎯 {project.goal}
        </div>
      )}
      {project.research && (
        <div className="mt-2 text-xs text-stone-500">
          📋 리서치: {project.research.topic}
        </div>
      )}
      <div className="text-xs text-stone-400 mt-2">
        노트 {project.notes.length}개 · 사진 {project.photos.length}장
      </div>
      <div className="flex gap-2 mt-3">
        <button className="btn-ghost flex-1 text-sm" onClick={onEdit}>
          편집
        </button>
        <button
          className="text-sm text-stone-400 hover:text-red-500"
          onClick={onDelete}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

function ProjectEditor({
  project,
  onCancel,
  onSave,
}: {
  project: Project;
  onCancel: () => void;
  onSave: (p: Project) => void;
}) {
  const [draft, setDraft] = useState<Project>(project);

  return (
    <div className="card mb-4 border-brand-500 border-2 dark:border-brand-400">
      <h3 className="font-bold mb-2">프로젝트 편집</h3>
      <div className="space-y-2">
        <div>
          <label className="text-sm text-stone-600 dark:text-stone-300">제목</label>
          <input
            className="input"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="예: 우리 동네 곤충 관찰"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm text-stone-600 dark:text-stone-300">분야</label>
            <select
              className="input"
              value={draft.kind}
              onChange={(e) =>
                setDraft({ ...draft, kind: e.target.value as ProjectKind })
              }
            >
              {Object.entries(KIND_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {KIND_ICON[k as ProjectKind]} {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-stone-600 dark:text-stone-300">상태</label>
            <select
              className="input"
              value={draft.status}
              onChange={(e) =>
                setDraft({ ...draft, status: e.target.value as Project["status"] })
              }
            >
              <option value="planned">예정</option>
              <option value="in_progress">진행 중</option>
              <option value="done">완료</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-stone-600 dark:text-stone-300">시작일</label>
            <input
              type="date"
              className="input"
              value={draft.startDate}
              onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-stone-600 dark:text-stone-300">종료일</label>
            <input
              type="date"
              className="input"
              value={draft.endDate ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, endDate: e.target.value || undefined })
              }
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-stone-600 dark:text-stone-300">목표</label>
          <textarea
            className="input min-h-[60px]"
            value={draft.goal}
            onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
            placeholder="이 프로젝트로 무엇을 알게 되거나 만들 건지"
          />
        </div>

        {draft.kind === "research" && (
          <fieldset className="border border-stone-200 dark:border-stone-700 rounded-lg p-3 space-y-2">
            <legend className="px-1 text-sm font-semibold text-stone-600 dark:text-stone-300">
              📋 리서치 템플릿
            </legend>
            <input
              className="input"
              placeholder="주제"
              value={draft.research?.topic ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  research: { ...emptyResearch(draft), topic: e.target.value },
                })
              }
            />
            <textarea
              className="input min-h-[60px]"
              placeholder="가설"
              value={draft.research?.hypothesis ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  research: { ...emptyResearch(draft), hypothesis: e.target.value },
                })
              }
            />
            <textarea
              className="input min-h-[60px]"
              placeholder="자료 조사"
              value={draft.research?.sources ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  research: { ...emptyResearch(draft), sources: e.target.value },
                })
              }
            />
            <textarea
              className="input min-h-[60px]"
              placeholder="결론"
              value={draft.research?.conclusion ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  research: { ...emptyResearch(draft), conclusion: e.target.value },
                })
              }
            />
          </fieldset>
        )}

        <div>
          <label className="text-sm text-stone-600 dark:text-stone-300">노트</label>
          <div className="space-y-2">
            {draft.notes.map((n, i) => (
              <div key={n.id} className="flex gap-2">
                <input
                  className="input flex-1"
                  value={n.title}
                  onChange={(e) => {
                    const notes = [...draft.notes];
                    notes[i] = { ...n, title: e.target.value };
                    setDraft({ ...draft, notes });
                  }}
                  placeholder="제목"
                />
                <button
                  className="text-sm text-stone-400 hover:text-red-500"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      notes: draft.notes.filter((x) => x.id !== n.id),
                    })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              className="btn-ghost text-sm w-full"
              onClick={() =>
                setDraft({
                  ...draft,
                  notes: [
                    ...draft.notes,
                    {
                      id: crypto.randomUUID(),
                      date: todayISO(),
                      title: "",
                      content: "",
                    },
                  ],
                })
              }
            >
              + 노트 추가
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button className="btn-ghost flex-1" onClick={onCancel}>
            취소
          </button>
          <button className="btn-primary flex-1" onClick={() => onSave(draft)}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function emptyResearch(p: Project) {
  return p.research ?? { topic: "", hypothesis: "", sources: "", conclusion: "" };
}
