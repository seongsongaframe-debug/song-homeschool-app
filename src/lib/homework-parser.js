// 학원 숙제 텍스트 파서.
// 규칙:
// - 첫 날짜 패턴(예: 4.20 월, 2026-04-20)을 발견하면 기본 날짜로 사용
// - 번호(1. 2. 1) 으로 시작하는 줄은 새 퀘스트
// - 섹션 헤더(짧은 단독 줄, 숫자 없음)는 이후 퀘스트의 note 접두어로
// - "(...)" 괄호 줄은 직전 퀘스트의 note 로 추가
// - 콤마로 구분된 세부 요구사항은 subtasks 로 분리
// - "3회", "5번", "5쪽", "30분" 등에서 target/unit 추출
import { DIFFICULTY_POINTS } from "../types";
const NUMBERED_LINE = /^\s*\d+\s*[.)]\s*(.*)$/;
const SECTION_HEADER_MAX_LEN = 20;
const AMOUNT_PATTERNS = [
    { re: /(\d+)\s*회/, unit: "회" },
    { re: /(\d+)\s*번/, unit: "번" },
    { re: /(\d+)\s*쪽/, unit: "쪽" },
    { re: /(\d+)\s*페이지/, unit: "페이지" },
    { re: /(\d+)\s*분/, unit: "분" },
    { re: /(\d+)\s*개/, unit: "개" },
    { re: /(\d+)\s*문제/, unit: "문제" },
    { re: /(\d+)\s*권/, unit: "권" },
];
export function parseHomework(text, fallbackDate) {
    const lines = text.split(/\r?\n/);
    const quests = [];
    let currentSection;
    let date;
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line)
            continue;
        // 날짜 먼저 체크
        if (!date) {
            const parsed = tryParseDate(line);
            if (parsed) {
                date = parsed;
                continue;
            }
        }
        // 괄호 줄 → 직전 퀘스트의 note
        const parenMatch = line.match(/^\((.+)\)$/);
        if (parenMatch && quests.length > 0) {
            const last = quests[quests.length - 1];
            last.note = [last.note, parenMatch[1]].filter(Boolean).join(" · ");
            continue;
        }
        // 번호 시작 줄 → 새 퀘스트
        const numbered = line.match(NUMBERED_LINE);
        if (numbered) {
            quests.push(buildQuest(numbered[1], currentSection));
            continue;
        }
        // 짧은 단독 줄 → 섹션 헤더로 간주
        if (isLikelySection(line)) {
            currentSection = line;
            continue;
        }
        // 나머지: 직전 퀘스트 있으면 제목 이어붙이기, 없으면 그 자체로 새 퀘스트
        if (quests.length > 0) {
            const last = quests[quests.length - 1];
            last.title = `${last.title} ${line}`.trim();
            extractTargetUnit(last);
        }
        else {
            quests.push(buildQuest(line, currentSection));
        }
    }
    return { date: date ?? fallbackDate, quests };
}
function tryParseDate(s) {
    const iso = s.match(/\b(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\b/);
    if (iso) {
        return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;
    }
    const m = s.match(/^\s*(\d{1,2})[.\-/](\d{1,2})(?:\s|$)/);
    if (m) {
        const year = new Date().getFullYear();
        return `${year}-${pad(m[1])}-${pad(m[2])}`;
    }
    return undefined;
}
function pad(x) {
    return String(x).padStart(2, "0");
}
function isLikelySection(s) {
    if (s.length > SECTION_HEADER_MAX_LEN)
        return false;
    if (/\d/.test(s))
        return false;
    return true;
}
function buildQuest(body, section) {
    const parts = body.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    const title = parts[0] ?? body.trim();
    const subtaskLabels = parts.slice(1);
    const q = {
        id: crypto.randomUUID(),
        title,
        note: section,
        target: 1,
        unit: "건",
        difficulty: "normal",
        points: DIFFICULTY_POINTS.normal,
        subtasks: [],
    };
    if (subtaskLabels.length > 0) {
        q.subtasks = [
            { id: crypto.randomUUID(), label: title, done: false },
            ...subtaskLabels.map((l) => ({
                id: crypto.randomUUID(),
                label: l,
                done: false,
            })),
        ];
    }
    extractTargetUnit(q);
    return q;
}
function extractTargetUnit(q) {
    for (const p of AMOUNT_PATTERNS) {
        const m = q.title.match(p.re);
        if (m) {
            q.target = Number(m[1]);
            q.unit = p.unit;
            return;
        }
    }
}
// 파싱 결과 → 저장 가능한 Quest 객체 배열로 변환
export function materializeQuests(parsed, studentId, assignedDate, dueDate, requiresVerification) {
    return parsed.map((p) => ({
        id: p.id,
        student_id: studentId,
        assigned_date: assignedDate,
        due_date: dueDate,
        title: p.title,
        target: p.target,
        unit: p.unit,
        difficulty: p.difficulty,
        points: p.points,
        status: "pending",
        note: p.note,
        subtasks: p.subtasks.length > 0 ? p.subtasks : undefined,
        requires_verification: requiresVerification,
        verified: false,
    }));
}
