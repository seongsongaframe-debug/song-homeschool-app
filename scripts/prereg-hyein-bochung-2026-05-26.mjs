// 혜인 이번주(2026-05-23 토 ~ 2026-05-29 금) 수학 보충학습 4세션 사전 등록.
//
// 출처: 2026-05-26 학교 단원평가(3.덧셈과 뺄셈) 진단 결과 →
//       D:\gdrive_esc\GTI\Ghez-School\송혜인학습\
//       (오답분석 md / 보충교재 v1.docx / 학업로드맵 / 트래커 xlsx)
//
// 진단 핵심: 받아내림 뺄셈 「거꾸로 빼기」 오개념(뺄셈 6/6 오답). 받아올림 1회 덧셈은 강점.
// 처방: 보충교재 v1 PART 2~7 을 4세션으로 나눠 화~금 마감으로 등록.
// 점수: 30p × 4 = 120p (보너스. 이번주 정규 1000p 외 추가 학습).
// 중복 가드: 동일 (due_date + title) 이 이미 있으면 건너뜀.

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
const MAX_CHAR = String.fromCharCode(0xf8ff);
const TODAY = "2026-05-26";
const WEEK_START = "2026-05-23";
const WEEK_END = "2026-05-29";

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

// ── 혜인 보충학습 4세션 ──
const HYEIN_BOCHUNG = [
  {
    due: "2026-05-26",
    title: "📘 수학 보충 ① 받아내림 원리 + STEP A 첫 5문제",
    subject: "math",
    points: 30,
    note:
      "교재: 송혜인_보충교재_받아내림뺄셈_v1.docx · PART 2 (받아내림 원리 = 10 빌려오기) 읽기 + PART 1 「내가 자주 하는 실수」 확인 + STEP A 첫 5문제 풀기. 못 빼면 동전·막대로 10 빌려오기.",
    subtaskLabels: [
      "PART 1 「내가 자주 하는 실수」 함께 읽기",
      "PART 2 받아내림 원리 (52−27 맞는 방법) 따라하기",
      "STEP A 첫 5문제 풀기",
    ],
  },
  {
    due: "2026-05-27",
    title: "📘 수학 보충 ② STEP A 마무리 + STEP B 6문제",
    subject: "math",
    points: 30,
    note:
      "교재 PART 3 STEP A 나머지 10문제 + STEP B (몇십)−(몇십몇) 앞 6문제. 틀린 문제는 모형으로 되짚기.",
    subtaskLabels: [
      "STEP A 나머지 10문제",
      "STEP B 앞 6문제",
      "틀린 문제 모형으로 다시 풀기",
    ],
  },
  {
    due: "2026-05-28",
    title: "📘 수학 보충 ③ STEP C 받아내림 15문제 (★ 핵심)",
    subject: "math",
    points: 30,
    hard: true,
    note:
      "교재 PART 3 STEP C — 두 자리 − 두 자리 받아내림. 이번 주 가장 중요한 단계. 18/15 이상이면 Phase 1 통과 후보.",
    subtaskLabels: [
      "STEP C 15문제 풀기",
      "정답 채점 + 트래커에 정답률 기록",
    ],
  },
  {
    due: "2026-05-29",
    title: "📘 수학 보충 ④ 시험 오답 재도전 + 받아올림 6문제",
    subject: "math",
    points: 30,
    note:
      "교재 PART 4 (시험에서 틀린 문제 다시 풀기) + PART 5 받아올림 100 넘는 덧셈 앞 6문제. 시험 6문제 모두 정답이면 「오개념 교정 성공」.",
    subtaskLabels: [
      "PART 4 — 시험 오답 6문제 다시 풀기",
      "PART 5 — 받아올림 덧셈 앞 6문제",
      "주간 학습 트래커에 결과 기록",
    ],
  },
];

function buildSubtasks(labels) {
  if (!labels?.length) return null;
  return labels.map((l) => ({ id: randomUUID(), label: l, done: false }));
}

function toQuest(student_id, item) {
  return {
    id: randomUUID(),
    student_id,
    assigned_date: TODAY,
    due_date: item.due,
    title: item.title,
    subject_id: item.subject ?? null,
    target: 1,
    unit: "회",
    difficulty: item.hard ? "hard" : "normal",
    points: item.points,
    status: "pending",
    note: item.note ?? null,
    subtasks: buildSubtasks(item.subtaskLabels),
    requires_verification: true,
    verified: false,
  };
}

async function writeQuest(root, q) {
  const key = `quests/${q.student_id}/${q.id}`;
  await setDoc(doc(root, encodeKey(key)), {
    key,
    value: q,
    updatedAt: Date.now(),
  });
}

async function loadHyeinQuests(root) {
  const prefix = "quests/hyein/";
  const snap = await getDocs(
    query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
  );
  const quests = [];
  snap.forEach((d) => {
    const q = d.data()?.value;
    if (q) quests.push(q);
  });
  return quests;
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);
  console.log(`로그인: ${auth.currentUser?.uid?.slice(0, 12)}`);
  console.log(`오늘 ${TODAY} · 이번주 ${WEEK_START}~${WEEK_END}\n`);

  const root = collection(db, "families", FAMILY_ID, "kv");

  const existing = await loadHyeinQuests(root);
  const existingDueTitle = new Set(existing.map((q) => `${q.due_date}||${q.title}`));

  console.log("===== [삽입] 혜인 수학 보충학습 4세션 =====");
  let inserted = 0,
    skipped = 0;
  for (const item of HYEIN_BOCHUNG) {
    const dt = `${item.due}||${item.title}`;
    if (existingDueTitle.has(dt)) {
      console.log(`  ↷ (중복 건너뜀) ${item.due} ${item.title}`);
      skipped++;
      continue;
    }
    const q = toQuest("hyein", item);
    await writeQuest(root, q);
    existingDueTitle.add(dt);
    console.log(`  ✓ ${item.due} ${item.title} [${item.points}p]`);
    inserted++;
  }

  // 요약
  console.log(`\n===== [요약] 혜인 이번주(${WEEK_START}~${WEEK_END}) =====`);
  const refreshed = await loadHyeinQuests(root);
  const byDue = {};
  for (const q of refreshed) {
    if (q.due_date < WEEK_START || q.due_date > WEEK_END) continue;
    if (q.title?.startsWith("🧹 청소")) continue;
    (byDue[q.due_date] ??= []).push(q);
  }
  let grand = 0;
  for (const due of Object.keys(byDue).sort()) {
    const items = byDue[due];
    const sub = items.reduce((s, q) => s + (q.points || 0), 0);
    grand += sub;
    console.log(`  · ${due}: ${items.length}건 / ${sub}p`);
  }
  console.log(`  ─ 이번주 합계: ${grand}p (청소 제외)`);
  console.log(`\n삽입 ${inserted}건 · 건너뜀 ${skipped}건. 완료.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
