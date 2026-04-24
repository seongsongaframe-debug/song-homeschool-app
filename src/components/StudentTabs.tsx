import type { Student } from "../types";

interface Props {
  students: Student[];
  selected: string;
  onSelect: (id: string) => void;
}

export function StudentTabs({ students, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 mb-4">
      {students.map((s) => {
        const active = s.id === selected;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex-1 px-4 py-3 rounded-2xl border-2 transition flex items-center justify-center gap-2 ${
              active
                ? "border-transparent text-white shadow-md"
                : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            }`}
            style={active ? { backgroundColor: s.color } : undefined}
          >
            <span className="text-xl">{s.emoji}</span>
            <span className="font-semibold">{s.name}</span>
            <span className={`text-xs ${active ? "opacity-80" : "text-stone-400 dark:text-stone-500"}`}>
              {s.grade}학년
            </span>
          </button>
        );
      })}
    </div>
  );
}
