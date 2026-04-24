// 일회성 숙제 배포 스크립트.
// node scripts/deploy-homework.mjs 로 실행.
// 앱의 homework-parser 와 동일 규칙으로 파싱 → Firestore 직접 쓰기.

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
} from "firebase/firestore";
import { randomUUID } from "crypto";

const firebaseConfig = {
  apiKey: "AIzaSyBAYelNW_yh_DUGStHWRhjrRlEmCGNGOx8",
  authDomain: "song-homeschool.firebaseapp.com",
  projectId: "song-homeschool",
  storageBucket: "song-homeschool.firebasestorage.app",
  messagingSenderId: "759452144888",
  appId: "1:759452144888:web:d68625927f36c96d93570d",
};

const FAMILY_ID = "song";
const STUDENT_ID = "sein";

const HOMEWORK_TEXT = `4.20 월
1. 13과 단어틀린것 3회쓰기,뜻필수
2. 14과 단어암기 5회쓰기,뜻필수
3.13과 낭독 5회연습후,영상올리기
4.13과 워크북
5.13과 text writing풀기
(따라읽으면서 쓰기)

그래머
11과 워크북 풀기`;

const DIFFICULTY_POINTS = { easy: 5, normal: 10, hard: 20 };
const NUMBERED_LINE = /^\s*\d+\s*[.)]\s*(.*)$/;
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

function tryParseDate(s) {
  const iso = s.match(/\b(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;
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
  if (s.length > 20) return false;
  if (/\d/.test(s)) return false;
  return true;
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

function buildQuest(body, section) {
  const parts = body.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  const title = parts[0] ?? body.trim();
  const subtaskLabels = parts.slice(1);
  const q = {
    id: randomUUID(),
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
      { id: randomUUID(), label: title, done: false },
      ...subtaskLabels.map((l) => ({
        id: randomUUID(),
        label: l,
        done: false,
      })),
    ];
  }
  extractTargetUnit(q);
  return q;
}

function parseHomework(text, fallbackDate) {
  const lines = text.split(/\r?\n/);
  const quests = [];
  let currentSection;
  let date;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!date) {
      const parsed = tryParseDate(line);
      if (parsed) {
        date = parsed;
        continue;
      }
    }

    const parenMatch = line.match(/^\((.+)\)$/);
    if (parenMatch && quests.length > 0) {
      const last = quests[quests.length - 1];
      last.note = [last.note, parenMatch[1]].filter(Boolean).join(" · ");
      continue;
    }

    const numbered = line.match(NUMBERED_LINE);
    if (numbered) {
      quests.push(buildQuest(numbered[1], currentSection));
      continue;
    }

    if (isLikelySection(line)) {
      currentSection = line;
      continue;
    }

    if (quests.length > 0) {
      const last = quests[quests.length - 1];
      last.title = `${last.title} ${line}`.trim();
      extractTargetUnit(last);
    } else {
      quests.push(buildQuest(line, currentSection));
    }
  }

  return { date: date ?? fallbackDate, quests };
}

function encodeKey(key) {
  return key.replace(/\//g, "__").replace(/\s/g, "_");
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log("로그인 중…");
  await signInAnonymously(auth);
  console.log("로그인 완료:", auth.currentUser?.uid);

  const parsed = parseHomework(HOMEWORK_TEXT, "2026-04-20");
  console.log(`\n날짜: ${parsed.date}`);
  console.log(`퀘스트 ${parsed.quests.length}개 생성\n`);

  const root = collection(db, "families", FAMILY_ID, "kv");

  for (const p of parsed.quests) {
    const quest = {
      id: p.id,
      student_id: STUDENT_ID,
      date: parsed.date,
      title: p.title,
      target: p.target,
      unit: p.unit,
      difficulty: p.difficulty,
      points: p.points,
      status: "pending",
      note: p.note ?? null,
      subtasks: p.subtasks.length > 0 ? p.subtasks : null,
      requires_verification: true,
      verified: false,
    };
    const key = `quests/${STUDENT_ID}/${parsed.date}/${p.id}`;
    const ref = doc(root, encodeKey(key));
    await setDoc(ref, { key, value: quest, updatedAt: Date.now() });
    console.log(
      `✓ ${p.title} — ${p.target}${p.unit}${
        p.note ? ` (${p.note})` : ""
      }${p.subtasks.length > 0 ? ` [${p.subtasks.length} 세부]` : ""}`
    );
  }

  console.log("\n배포 완료.");
  process.exit(0);
}

main().catch((err) => {
  console.error("실패:", err);
  process.exit(1);
});
