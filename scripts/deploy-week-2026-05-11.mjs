// 이번 주 숙제 배포 (2026-05-11 ~ 2026-05-17).
// - 세인: 14건 수동 (5/4 영어 6건 + 5/6 능률보카·영문학당 4건 + 5/8 영문학당 4과 4건)
//         + 7건 자동 (월·수·금 영어, 화·수·목 수학, 토 스케이트) = 21건 / 1000p
// - 혜인: 5건 수동 (5/7 영어 6과) + 8건 자동 (월·화·목 피아노, 수·금 미술, 화 눈높이 1/2·2/2, 토 스케이트) = 13건 / 800p
// - autoSeedFlag(2026-05-11) 세팅 → 앱이 일요일 자동 시드 시 중복 생성하지 않도록.
// - 시작 전 sein/hyein 의 due_date < 2026-05-11 미완료 퀘스트 목록을 보고용으로 출력.

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
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
const TODAY = "2026-05-10";
const WEEK_START = "2026-05-11";
const WEEK_END = "2026-05-17";
const MAX_CHAR = String.fromCharCode(0xf8ff);

const ACADEMY_SUBTASKS = [
  { label: "학원 도착, 선생님께 인사" },
  { label: "선생님 말씀 집중해서 듣기" },
  { label: "오늘 배운 것 1가지 아빠에게 메세지 보내기" },
];

// ---------- 세인 수동 (14건 / 650p) ----------
const SEIN_MANUAL = [
  // 5/4 월 → 5/11 월 (영어 15·16과 + 그래머 12과)
  {
    due_date: "2026-05-11",
    title: "15과 단어 틀린것 3회 쓰기",
    subject_id: "english",
    target: 3,
    unit: "회",
    points: 30,
    note: "영어학원 — 뜻 필수",
  },
  {
    due_date: "2026-05-11",
    title: "16과 단어 암기 5회 쓰기",
    subject_id: "english",
    target: 5,
    unit: "회",
    points: 40,
    note: "영어학원 — 뜻 필수",
  },
  {
    due_date: "2026-05-11",
    title: "15과 낭독 5회 + 영상 올리기",
    subject_id: "english",
    target: 5,
    unit: "회",
    points: 60,
    note: "영어학원",
    subtaskLabels: ["5회 낭독 연습", "영상 올리기"],
  },
  {
    due_date: "2026-05-11",
    title: "15과 워크북",
    subject_id: "english",
    target: 1,
    unit: "건",
    points: 40,
    note: "영어학원",
  },
  {
    due_date: "2026-05-11",
    title: "15과 text writing",
    subject_id: "english",
    target: 1,
    unit: "건",
    points: 40,
    note: "영어학원 — 따라 읽으면서 쓰기",
  },
  {
    due_date: "2026-05-11",
    title: "그래머 12과 워크북",
    subject_id: "english",
    target: 1,
    unit: "건",
    points: 30,
    note: "그래머",
  },

  // 5/6 수 → 5/13 수 (능률보카 26·27과 + 영문학당 The Peter and Wolf)
  {
    due_date: "2026-05-13",
    title: "능률보카 26과 틀린단어 3회 쓰기",
    subject_id: "english",
    target: 3,
    unit: "회",
    points: 30,
    note: "능률보카",
  },
  {
    due_date: "2026-05-13",
    title: "능률보카 27과 단어 5회 + 문장 2회 + 문제풀기",
    subject_id: "english",
    target: 1,
    unit: "건",
    points: 50,
    note: "능률보카",
    subtaskLabels: ["단어 5회 쓰기", "문장 2회 쓰기", "문제 풀기"],
  },
  {
    due_date: "2026-05-13",
    title: "본문 전체 필사 1회 + 낭독 영상",
    subject_id: "english",
    target: 1,
    unit: "회",
    points: 70,
    note: "영문학당 — The Peter and Wolf",
    subtaskLabels: ["본문 전체 필사 1회", "낭독 영상 올리기"],
  },
  {
    due_date: "2026-05-13",
    title: "작문 전체 필사 1회 + 낭독 영상",
    subject_id: "english",
    target: 1,
    unit: "회",
    points: 70,
    note: "영문학당 — The Peter and Wolf",
    subtaskLabels: ["작문 전체 필사 1회", "낭독 영상 올리기"],
  },

  // 5/8 금 → 5/15 금 (영문학당 4과)
  {
    due_date: "2026-05-15",
    title: "영문학당 4과 단어 3회씩 쓰기",
    subject_id: "english",
    target: 3,
    unit: "회",
    points: 50,
    note: "영문학당 4과 — 46p, 48p, 52p",
  },
  {
    due_date: "2026-05-15",
    title: "영문학당 4과 낭독 5회 + 영상",
    subject_id: "english",
    target: 5,
    unit: "회",
    points: 70,
    note: "영문학당 4과 — 47-D, 49-E, 52p",
    subtaskLabels: ["5회 낭독 연습", "영상 올리기 (47-D, 49-E, 52p)"],
  },
  {
    due_date: "2026-05-15",
    title: "영문학당 4과 48p 필사 1회",
    subject_id: "english",
    target: 1,
    unit: "회",
    points: 30,
    note: "영문학당 4과",
  },
  {
    due_date: "2026-05-15",
    title: "영문학당 4과 워크북",
    subject_id: "english",
    target: 1,
    unit: "건",
    points: 40,
    note: "영문학당 4과",
  },
];

// ---------- 세인 자동 (7건 / 350p) ----------
const SEIN_AUTO = [
  { due_date: "2026-05-11", title: "📗 영어학원 다녀오기", subject_id: "english", points: 50 },
  { due_date: "2026-05-12", title: "✏️ 수학 수업 다녀오기", subject_id: "math",    points: 50 },
  { due_date: "2026-05-13", title: "📗 영어학원 다녀오기", subject_id: "english", points: 50 },
  { due_date: "2026-05-13", title: "✏️ 수학 수업 다녀오기", subject_id: "math",    points: 50 },
  { due_date: "2026-05-14", title: "✏️ 수학 수업 다녀오기", subject_id: "math",    points: 50 },
  { due_date: "2026-05-15", title: "📗 영어학원 다녀오기", subject_id: "english", points: 50 },
  { due_date: "2026-05-16", title: "⛸️ 스케이트 수업 다녀오기", subject_id: "arts", points: 50 },
];

// ---------- 혜인 수동 (5건 / 140p) ----------
const HYEIN_MANUAL = [
  // 5/7 목 → 5/14 목 (영어 6과 — 화요일 5/5는 휴일)
  {
    due_date: "2026-05-14",
    title: "6과 단어 낭독 연습 3회 + 단어 쓰기 2회",
    subject_id: "english",
    target: 1,
    unit: "건",
    points: 30,
    note: "영어학원 — 56-58p",
    subtaskLabels: ["단어 낭독 연습 3회", "단어 쓰기 2회"],
  },
  {
    due_date: "2026-05-14",
    title: "6과 낭독 영상 + 필사 1회",
    subject_id: "english",
    target: 1,
    unit: "회",
    points: 30,
    note: "영어학원 — 58p",
    subtaskLabels: ["낭독 영상 올리기", "필사 1회"],
  },
  {
    due_date: "2026-05-14",
    title: "6과 본문 낭독 영상",
    subject_id: "english",
    target: 1,
    unit: "건",
    points: 20,
    note: "영어학원 — 60p",
  },
  {
    due_date: "2026-05-14",
    title: "6과 워크북",
    subject_id: "english",
    target: 1,
    unit: "건",
    points: 30,
    note: "영어학원",
  },
  {
    due_date: "2026-05-14",
    title: "55p 라이팅 낭독 영상",
    subject_id: "english",
    target: 1,
    unit: "건",
    points: 30,
    note: "영어학원",
  },
];

// ---------- 혜인 자동 (8건 / 660p) ----------
const HYEIN_AUTO = [
  { due_date: "2026-05-11", title: "🎹 피아노학원 다녀오기", subject_id: "arts",  points: 60 },
  { due_date: "2026-05-12", title: "눈높이 숙제 1/2",       subject_id: undefined, points: 150, hard: true, note: "1주일치 분량을 반반씩 분할" },
  { due_date: "2026-05-12", title: "눈높이 숙제 2/2",       subject_id: undefined, points: 150, hard: true, note: "1주일치 분량을 반반씩 분할" },
  { due_date: "2026-05-12", title: "🎹 피아노학원 다녀오기", subject_id: "arts",  points: 60 },
  { due_date: "2026-05-13", title: "🎨 미술학원 다녀오기",   subject_id: "arts",  points: 60 },
  { due_date: "2026-05-14", title: "🎹 피아노학원 다녀오기", subject_id: "arts",  points: 60 },
  { due_date: "2026-05-15", title: "🎨 미술학원 다녀오기",   subject_id: "arts",  points: 60 },
  { due_date: "2026-05-16", title: "⛸️ 스케이트교습 다녀오기", subject_id: "arts", points: 60 },
];

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

function buildSubtasks(title, labels) {
  if (!labels?.length) return null;
  return [
    { id: randomUUID(), label: title, done: false },
    ...labels.map((l) => ({ id: randomUUID(), label: l, done: false })),
  ];
}

function manualToQuest(student_id, item) {
  const id = randomUUID();
  return {
    id,
    student_id,
    assigned_date: TODAY,
    due_date: item.due_date,
    title: item.title,
    subject_id: item.subject_id,
    target: item.target,
    unit: item.unit,
    difficulty: "normal",
    points: item.points,
    status: "pending",
    note: item.note ?? null,
    subtasks: buildSubtasks(item.title, item.subtaskLabels),
    requires_verification: true,
    verified: false,
  };
}

function autoToQuest(student_id, item) {
  const id = randomUUID();
  const isAcademy = item.title.includes("다녀오기");
  return {
    id,
    student_id,
    assigned_date: TODAY,
    due_date: item.due_date,
    title: item.title,
    subject_id: item.subject_id ?? null,
    target: 1,
    unit: "회",
    difficulty: item.hard ? "hard" : "normal",
    points: item.points,
    status: "pending",
    note: item.note ?? null,
    subtasks: isAcademy
      ? [
          { id: randomUUID(), label: item.title, done: false },
          ...ACADEMY_SUBTASKS.map((st) => ({
            id: randomUUID(),
            label: st.label,
            done: false,
          })),
        ]
      : null,
    requires_verification: true,
    verified: false,
  };
}

async function listOverdue(root, sid) {
  const prefix = `quests/${sid}/`;
  const snap = await getDocs(
    query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
  );
  const past = [];
  snap.forEach((d) => {
    const q = d.data()?.value;
    if (!q) return;
    if (q.status === "done") return;
    if (q.due_date >= WEEK_START) return;
    // 매일 자동 청소 퀘스트는 자동 정리되므로 보고에서 제외.
    if (q.title?.startsWith("🧹 청소")) return;
    past.push(q);
  });
  past.sort((a, b) => a.due_date.localeCompare(b.due_date));
  return past;
}

async function writeQuest(root, q) {
  const key = `quests/${q.student_id}/${q.id}`;
  await setDoc(doc(root, encodeKey(key)), {
    key,
    value: q,
    updatedAt: Date.now(),
  });
}

async function setAutoSeedFlag(root, sid) {
  const key = `_autoseed/${sid}/${WEEK_START}`;
  await setDoc(doc(root, encodeKey(key)), {
    key,
    value: true,
    updatedAt: Date.now(),
  });
}

async function sumWeek(root, sid) {
  const prefix = `quests/${sid}/`;
  const snap = await getDocs(
    query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
  );
  let total = 0;
  let count = 0;
  snap.forEach((d) => {
    const q = d.data()?.value;
    if (!q) return;
    if (q.due_date < WEEK_START || q.due_date > WEEK_END) return;
    if (q.title?.startsWith("🧹 청소")) return;
    total += q.points || 0;
    count += 1;
  });
  return { total, count };
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);
  console.log("로그인:", auth.currentUser?.uid);
  console.log(`기준일: ${TODAY} · 이번 주: ${WEEK_START} ~ ${WEEK_END}\n`);

  const root = collection(db, "families", FAMILY_ID, "kv");

  // --- 0) 사전 — 지난주 이전 미완료 퀘스트 보고 ---
  console.log("===== [사전] 지난주 이전 미완료 (마감 지남 박스) =====");
  for (const sid of ["sein", "hyein"]) {
    const past = await listOverdue(root, sid);
    console.log(`[${sid}] ${past.length}건`);
    for (const q of past) {
      console.log(`  · ${q.due_date} | ${q.title} (${q.points || 0}p)`);
    }
  }
  console.log();

  // --- 1) 세인 수동 ---
  console.log("===== [세인] 수동 14건 =====");
  for (const item of SEIN_MANUAL) {
    const q = manualToQuest("sein", item);
    await writeQuest(root, q);
    console.log(`  ✓ ${item.due_date} | ${item.title} (${item.points}p)`);
  }
  console.log();

  // --- 2) 세인 자동 ---
  console.log("===== [세인] 자동 7건 =====");
  for (const item of SEIN_AUTO) {
    const q = autoToQuest("sein", item);
    await writeQuest(root, q);
    console.log(`  ✓ ${item.due_date} | ${item.title} (${item.points}p)`);
  }
  console.log();

  // --- 3) 혜인 수동 ---
  console.log("===== [혜인] 수동 5건 =====");
  for (const item of HYEIN_MANUAL) {
    const q = manualToQuest("hyein", item);
    await writeQuest(root, q);
    console.log(`  ✓ ${item.due_date} | ${item.title} (${item.points}p)`);
  }
  console.log();

  // --- 4) 혜인 자동 ---
  console.log("===== [혜인] 자동 8건 =====");
  for (const item of HYEIN_AUTO) {
    const q = autoToQuest("hyein", item);
    await writeQuest(root, q);
    console.log(`  ✓ ${item.due_date} | ${item.title} (${item.points}p)`);
  }
  console.log();

  // --- 5) autoSeedFlag 세팅 ---
  console.log("===== [플래그] 차주 자동 시드 차단 =====");
  for (const sid of ["sein", "hyein"]) {
    await setAutoSeedFlag(root, sid);
    console.log(`  ✓ _autoseed/${sid}/${WEEK_START} = true`);
  }
  console.log();

  // --- 6) 검증 ---
  console.log("===== [검증] 이번 주 합계 (5/11 ~ 5/17) =====");
  for (const sid of ["sein", "hyein"]) {
    const { total, count } = await sumWeek(root, sid);
    const target = sid === "sein" ? 1000 : 800;
    const ok = total === target ? "✓" : "✗";
    console.log(`  ${ok} [${sid}] ${count}건 / ${total}p (목표 ${target}p)`);
  }
  console.log("\n배포 완료.");
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
