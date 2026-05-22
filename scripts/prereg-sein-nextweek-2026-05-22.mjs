// 세인 차주(5/25~5/31) 영어 숙제 선등록 — 2026-05-22(금) 수집분.
// 입력 출처: 보호자가 이번주 받아온 학원 숙제 사진/메모.
//   · 5/25(월) 영어학원 4건 → 이미 deploy-week-2026-05-18.mjs(SEIN_NEXT_WEEK_PARTIAL)로 선등록됨 → 검증만, 미삽입.
//   · 5/27(수) 능률보카 2 + 영문학당(Peter and Wolf) 2 + 라이팅/스피킹 1 = 5건 → 신규 삽입.
//   · 5/29(금) 영문학당 6과 4건 → 신규 삽입.
// 점수는 모두 0p. 차주 /weekly-quests 호출 시 1000p 분배에서 확정.
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
const TODAY = "2026-05-22";
const NEXT_WEEK_START = "2026-05-25";
const NEXT_WEEK_END = "2026-05-31";

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

// ── 5/27(수) 능률보카 + 영문학당 The Peter and Wolf + 라이팅/스피킹 (MSG2) ──
const SEIN_0527 = [
  {
    due: "2026-05-27",
    title: "능률보카 28과 틀린단어 3회 쓰기",
    subject: "english",
    points: 0,
    note: "능률보카",
  },
  {
    due: "2026-05-27",
    title: "능률보카 29과 단어 5회 + 문장 2회 + 문제풀기",
    subject: "english",
    points: 0,
    note: "능률보카",
    subtaskLabels: ["단어 5회 쓰기", "문장 2회 쓰기", "문제 풀기"],
  },
  {
    due: "2026-05-27",
    title: "The Peter and Wolf 본문 전체 필사 + 낭독영상",
    subject: "english",
    points: 0,
    note: "영문학당 — The Peter and Wolf · 최대한 완벽하게 연습",
    subtaskLabels: ["본문 전체 필사 1회", "낭독 영상 올리기"],
  },
  {
    due: "2026-05-27",
    title: "The Peter and Wolf 작문 전체 필사 + 낭독영상",
    subject: "english",
    points: 0,
    note: "영문학당 — The Peter and Wolf",
    subtaskLabels: ["작문 전체 필사 1회", "낭독 영상 올리기"],
  },
  {
    due: "2026-05-27",
    title: "🎤 라이팅·스피킹테스트 완벽히 준비",
    subject: "english",
    points: 0,
    note: "영문학당 — 수요일 학원에서 테스트",
    subtaskLabels: ["라이팅 준비", "스피킹 준비"],
  },
];

// ── 5/29(금) 영문학당 6과 (MSG1) ──
const SEIN_0529 = [
  {
    due: "2026-05-29",
    title: "영문학당 6과 단어 3회 쓰기",
    subject: "english",
    points: 0,
    note: "영문학당 6과 — 67p, 74p, 78p",
  },
  {
    due: "2026-05-29",
    title: "영문학당 6과 낭독 5회 + 영상",
    subject: "english",
    points: 0,
    note: "영문학당 6과 — 70p, 76p, 78p",
    subtaskLabels: ["5회 낭독 연습", "영상 올리기 (70p, 76p, 78p)"],
  },
  {
    due: "2026-05-29",
    title: "영문학당 6과 70p 필사 1회",
    subject: "english",
    points: 0,
    note: "영문학당 6과",
  },
  {
    due: "2026-05-29",
    title: "영문학당 6과 워크북",
    subject: "english",
    points: 0,
    note: "영문학당 6과",
  },
];

const INSERT_ITEMS = [...SEIN_0527, ...SEIN_0529];

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

async function loadSeinQuests(root) {
  const prefix = "quests/sein/";
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
  console.log(`로그인: ${auth.currentUser?.uid}`);
  console.log(`오늘 ${TODAY} · 차주 ${NEXT_WEEK_START}~${NEXT_WEEK_END}\n`);

  const root = collection(db, "families", FAMILY_ID, "kv");

  const existing = await loadSeinQuests(root);
  const existingDueTitle = new Set(existing.map((q) => `${q.due_date}||${q.title}`));

  // 1) 5/25 선등록분 검증 (이미 있어야 함)
  console.log("===== [검증] 5/25(월) 영어학원 — 기존 선등록 =====");
  const has0525 = existing.filter(
    (q) => q.due_date === "2026-05-25"
  );
  if (has0525.length === 0) {
    console.log("  ⚠ 5/25 마감 퀘스트가 하나도 없음 — SEIN_NEXT_WEEK_PARTIAL 미배포 의심!");
  } else {
    for (const q of has0525) console.log(`  ✓ (이미 있음) ${q.title} [${q.points}p]`);
  }

  // 2) 5/27·5/29 신규 삽입 (중복 가드)
  console.log("\n===== [삽입] 5/27·5/29 — 신규 선등록 (0p) =====");
  let inserted = 0, skipped = 0;
  for (const item of INSERT_ITEMS) {
    const dt = `${item.due}||${item.title}`;
    if (existingDueTitle.has(dt)) {
      console.log(`  ↷ (중복 건너뜀) ${item.due} ${item.title}`);
      skipped++;
      continue;
    }
    const q = toQuest("sein", item);
    await writeQuest(root, q);
    existingDueTitle.add(dt);
    console.log(`  ✓ ${item.due} ${item.title}`);
    inserted++;
  }

  // 3) 차주 세인 마감별 합계 보고
  console.log("\n===== [요약] 차주(5/25~5/31) 세인 영어 선등록 현황 =====");
  const refreshed = await loadSeinQuests(root);
  const byDue = {};
  for (const q of refreshed) {
    if (q.due_date < NEXT_WEEK_START || q.due_date > NEXT_WEEK_END) continue;
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
  console.log(`  ─ 차주 선등록 합계: ${grand}p (점수는 차주 /weekly-quests 1000p 분배에서 확정)`);
  console.log(`\n삽입 ${inserted}건 · 건너뜀 ${skipped}건. 완료.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
