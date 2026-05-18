// 주간 배포 + 지난주 정산 (2026-05-18 ~ 2026-05-24).
// 1) 지난주 정산: 세인 11건 (대기→확인), 혜인 13건 (미완→확인). 모두 verify + 포인트 ledger.
// 2) 이번주(5/18~5/24): 세인 9 수동 + 7 자동 = 16건/1000p, 혜인 11 수동 + 8 자동 = 19건/1000p
// 3) 차주(5/25~5/31) 일부: 세인 5/25 영어 4건 (월 영어학원 — 시험본 1-16과 + 새 책 1과)
// 4) autoSeedFlag(2026-05-18) 세팅. 5/25 는 자동시드 살리기 위해 플래그 미세팅.

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
const TODAY = "2026-05-18";
const NOW_ISO = new Date().toISOString();
const WEEK_START = "2026-05-18";
const WEEK_END = "2026-05-24";
const LAST_WEEK_START = "2026-05-11";
const LAST_WEEK_END = "2026-05-17";

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

const ACADEMY_SUBTASKS = [
  { label: "학원 도착, 선생님께 인사" },
  { label: "선생님 말씀 집중해서 듣기" },
  { label: "오늘 배운 것 1가지 아빠에게 메세지 보내기" },
];

// ===================================================================
// 세인 5/18~5/24 (16건/1000p)
// ===================================================================
const SEIN_THIS_WEEK = [
  // 자동 7건 (학원 출석)
  { due: "2026-05-18", title: "📗 영어학원 다녀오기", subject: "english", points: 50, academy: true },
  { due: "2026-05-19", title: "✏️ 수학 수업 다녀오기", subject: "math", points: 50, academy: true },
  { due: "2026-05-20", title: "📗 영어학원 다녀오기", subject: "english", points: 50, academy: true },
  { due: "2026-05-20", title: "✏️ 수학 수업 다녀오기", subject: "math", points: 50, academy: true },
  { due: "2026-05-21", title: "✏️ 수학 수업 다녀오기", subject: "math", points: 50, academy: true },
  { due: "2026-05-22", title: "📗 영어학원 다녀오기", subject: "english", points: 50, academy: true },
  { due: "2026-05-23", title: "⛸️ 스케이트 수업 다녀오기", subject: "arts", points: 50, academy: true },
  // 수동 9건 (수 5/20 능률보카·영문학당·스피킹, 금 5/22 영문학당 5과)
  {
    due: "2026-05-20",
    title: "능률보카 27과 틀린단어 3회 쓰기",
    subject: "english",
    points: 30,
    note: "능률보카",
  },
  {
    due: "2026-05-20",
    title: "능률보카 28과 단어 5회 + 문장 2회 + 문제풀기",
    subject: "english",
    points: 80,
    note: "능률보카",
    subtaskLabels: ["단어 5회 쓰기", "문장 2회 쓰기", "문제 풀기"],
  },
  {
    due: "2026-05-20",
    title: "The Peter and Wolf 본문 전체 필사 + 낭독영상",
    subject: "english",
    points: 90,
    note: "영문학당 — The Peter and Wolf",
    subtaskLabels: ["본문 전체 필사 1회", "낭독 영상 올리기"],
  },
  {
    due: "2026-05-20",
    title: "The Peter and Wolf 작문 전체 필사 + 낭독영상",
    subject: "english",
    points: 90,
    note: "영문학당 — The Peter and Wolf",
    subtaskLabels: ["작문 전체 필사 1회", "낭독 영상 올리기"],
  },
  {
    due: "2026-05-20",
    title: "🎤 스피킹테스트 완벽히 준비",
    subject: "english",
    points: 100,
    note: "영문학당 — 수요일 학원에서 테스트",
  },
  {
    due: "2026-05-22",
    title: "영문학당 5과 단어 3회 쓰기",
    subject: "english",
    points: 80,
    note: "영문학당 5과 — 60p, 62p, 66p",
  },
  {
    due: "2026-05-22",
    title: "영문학당 5과 낭독 5회 + 영상",
    subject: "english",
    points: 90,
    note: "영문학당 5과 — 61-D, 63-E, 66p",
    subtaskLabels: ["5회 낭독 연습", "영상 올리기 (61-D, 63-E, 66p)"],
  },
  {
    due: "2026-05-22",
    title: "영문학당 5과 62p 필사 1회",
    subject: "english",
    points: 30,
    note: "영문학당 5과",
  },
  {
    due: "2026-05-22",
    title: "영문학당 5과 워크북",
    subject: "english",
    points: 60,
    note: "영문학당 5과",
  },
];

// ===================================================================
// 혜인 5/18~5/24 (19건/1000p)
// ===================================================================
const HYEIN_6CEL_NOTE = `65p 라이팅 — 6CEL 워크시트 (선생님 첨부 스펠링 참고):
· Hello / I am ___ . Nice to meet you. Nice to meet you, too.
· Can you fly? No, I can't. / I can't fly.
· Can you play the violin/piano/guitar? Yes, I can. / No, I can't.
· 9th instruments: piano, guitar, violin, flute, trumpet
· Can you play basketball? Sport: soccer, baseball, tennis, swimming`;

const HYEIN_THIS_WEEK = [
  // 자동 8건 (학원·눈높이·스케이트)
  { due: "2026-05-18", title: "🎹 피아노학원 다녀오기", subject: "arts", points: 60, academy: true },
  { due: "2026-05-19", title: "🎹 피아노학원 다녀오기", subject: "arts", points: 60, academy: true },
  { due: "2026-05-19", title: "눈높이 숙제 1/2", points: 150, hard: true, note: "1주일치 분량을 반반씩 분할" },
  { due: "2026-05-19", title: "눈높이 숙제 2/2", points: 150, hard: true, note: "1주일치 분량을 반반씩 분할" },
  { due: "2026-05-20", title: "🎨 미술학원 다녀오기", subject: "arts", points: 60, academy: true },
  { due: "2026-05-21", title: "🎹 피아노학원 다녀오기", subject: "arts", points: 60, academy: true },
  { due: "2026-05-22", title: "🎨 미술학원 다녀오기", subject: "arts", points: 60, academy: true },
  { due: "2026-05-23", title: "⛸️ 스케이트교습 다녀오기", subject: "arts", points: 60, academy: true },
  // 수동 11건 (5/19 화 파닉스 4·브릭스 2, 5/21 목 7과 4·라이팅 1)
  {
    due: "2026-05-19",
    title: "파닉스 5과 단어 3회 쓰기",
    subject: "english",
    points: 30,
    note: "영어학원 — 44p",
  },
  {
    due: "2026-05-19",
    title: "파닉스 5과 문장 필사",
    subject: "english",
    points: 30,
    note: "영어학원 — 49p",
  },
  {
    due: "2026-05-19",
    title: "파닉스 5과 본문 낭독 영상",
    subject: "english",
    points: 30,
    note: "영어학원 — 50p",
  },
  {
    due: "2026-05-19",
    title: "파닉스 5과 워크북",
    subject: "english",
    points: 30,
    note: "영어학원",
  },
  {
    due: "2026-05-19",
    title: "브릭스리딩30 6과 낭독 영상",
    subject: "english",
    points: 30,
    note: "영어학원",
  },
  {
    due: "2026-05-19",
    title: "브릭스리딩30 6과 워크북",
    subject: "english",
    points: 30,
    note: "영어학원",
  },
  {
    due: "2026-05-21",
    title: "7과 단어 낭독 연습 3회 + 단어 쓰기 2회",
    subject: "english",
    points: 30,
    note: "영어학원 — 66-68p",
    subtaskLabels: ["단어 낭독 연습 3회", "단어 쓰기 2회"],
  },
  {
    due: "2026-05-21",
    title: "7과 낭독 영상 + 필사 1회",
    subject: "english",
    points: 30,
    note: "영어학원 — 68p",
    subtaskLabels: ["낭독 영상 올리기", "필사 1회"],
  },
  {
    due: "2026-05-21",
    title: "7과 본문 낭독 영상",
    subject: "english",
    points: 20,
    note: "영어학원 — 70p",
  },
  {
    due: "2026-05-21",
    title: "7과 워크북",
    subject: "english",
    points: 30,
    note: "영어학원",
  },
  {
    due: "2026-05-21",
    title: "65p 라이팅 낭독 영상",
    subject: "english",
    points: 30,
    note: HYEIN_6CEL_NOTE,
  },
];

// ===================================================================
// 세인 5/25~5/31 일부 (4건, 5/18 월 받은 영어학원 — 마감 5/25 월)
// ===================================================================
const SEIN_NEXT_WEEK_PARTIAL = [
  {
    due: "2026-05-25",
    title: "1-16과 전체 필사 1회",
    subject: "english",
    points: 0, // 차주 분배 시 확정
    note: "영어학원 — 5/18 시험 본 1-16과 누적, 단어/뜻 필수",
  },
  {
    due: "2026-05-25",
    title: "새 책 (프린트물) 1과 단어 암기 4회쓰기 + 문장·뜻 필사 1회",
    subject: "english",
    points: 0,
    note: "영어학원 — 새 책 1과 (프린트물)",
    subtaskLabels: ["단어 암기 4회 쓰기", "문장 영어 + 뜻 필사 1회"],
  },
  {
    due: "2026-05-25",
    title: "8·9·13과 낭독 5회 연습 + 영상",
    subject: "english",
    points: 0,
    note: "영어학원",
    subtaskLabels: ["8과 낭독 5회", "9과 낭독 5회", "13과 낭독 5회", "영상 올리기"],
  },
  {
    due: "2026-05-25",
    title: "그래머 13과 워크북",
    subject: "english",
    points: 0,
    note: "그래머",
  },
];

function buildSubtasks(labels) {
  if (!labels?.length) return null;
  return labels.map((l) => ({ id: randomUUID(), label: l, done: false }));
}

function toQuest(student_id, item) {
  const id = randomUUID();
  const isAcademy = item.academy === true;
  const subtasks = isAcademy
    ? ACADEMY_SUBTASKS.map((st) => ({
        id: randomUUID(),
        label: st.label,
        done: false,
      }))
    : buildSubtasks(item.subtaskLabels);
  return {
    id,
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
    subtasks,
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

async function setAutoSeedFlag(root, sid, weekStart) {
  const key = `_autoseed/${sid}/${weekStart}`;
  await setDoc(doc(root, encodeKey(key)), {
    key,
    value: true,
    updatedAt: Date.now(),
  });
}

async function settleLastWeek(root) {
  console.log("===== [Phase 1] 지난주 정산 (5/11~5/17) =====\n");
  let seinSettled = 0, seinPts = 0;
  let hyeinSettled = 0, hyeinPts = 0;

  for (const sid of ["sein", "hyein"]) {
    const prefix = `quests/${sid}/`;
    const snap = await getDocs(
      query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
    );

    const ledgerKey = `points/${sid}/ledger`;
    const ledgerDoc = await getDocs(
      query(root, where("key", "==", ledgerKey))
    );
    let ledger = [];
    ledgerDoc.forEach((d) => {
      const v = d.data()?.value;
      if (Array.isArray(v)) ledger = v;
    });
    const existingQuestIds = new Set(
      ledger
        .filter((e) => e.reason === "quest_complete")
        .map((e) => e.quest_id)
    );

    const updates = [];
    const newLedgerEntries = [];

    for (const d of snap.docs) {
      const data = d.data();
      const q = data?.value;
      if (!q) continue;
      if (q.due_date < LAST_WEEK_START || q.due_date > LAST_WEEK_END) continue;
      if (q.title?.startsWith("🧹 청소")) continue;
      if (q.verified) continue;

      // 세인: ⏳ 대기 (done + rv + !verified) / 혜인: ○ 미완 (pending)
      const isAwaiting = q.status === "done" && q.requires_verification && !q.verified;
      const isIncomplete = q.status === "pending";
      if (!isAwaiting && !isIncomplete) continue;

      const next = {
        ...q,
        status: "done",
        completedAt: q.completedAt ?? q.due_date + "T18:00:00.000Z",
        verified: true,
        verifiedAt: NOW_ISO,
        rejectedReason: undefined,
      };
      updates.push({ key: data.key, value: next });

      if (!existingQuestIds.has(q.id)) {
        newLedgerEntries.push({
          id: randomUUID(),
          student_id: sid,
          date: q.due_date,
          delta: q.points || 0,
          reason: "quest_complete",
          quest_id: q.id,
          note: q.title,
        });
      }

      if (sid === "sein") { seinSettled++; seinPts += q.points || 0; }
      else { hyeinSettled++; hyeinPts += q.points || 0; }
    }

    for (const u of updates) {
      await setDoc(doc(root, encodeKey(u.key)), {
        key: u.key,
        value: u.value,
        updatedAt: Date.now(),
      });
    }

    if (newLedgerEntries.length > 0) {
      const updatedLedger = [...ledger, ...newLedgerEntries];
      await setDoc(doc(root, encodeKey(ledgerKey)), {
        key: ledgerKey,
        value: updatedLedger,
        updatedAt: Date.now(),
      });
    }
  }

  console.log(`  세인 정산: ${seinSettled}건 / +${seinPts}p`);
  console.log(`  혜인 정산: ${hyeinSettled}건 / +${hyeinPts}p\n`);
}

async function deployThisWeek(root) {
  console.log("===== [Phase 2~3] 이번주 (5/18~5/24) 배포 =====\n");
  console.log(`[세인] ${SEIN_THIS_WEEK.length}건`);
  for (const item of SEIN_THIS_WEEK) {
    const q = toQuest("sein", item);
    await writeQuest(root, q);
    console.log(`  ✓ ${item.due} ${item.title} (${item.points}p)`);
  }
  console.log(`\n[혜인] ${HYEIN_THIS_WEEK.length}건`);
  for (const item of HYEIN_THIS_WEEK) {
    const q = toQuest("hyein", item);
    await writeQuest(root, q);
    console.log(`  ✓ ${item.due} ${item.title} (${item.points}p)`);
  }
}

async function deployNextWeekPartial(root) {
  console.log(`\n===== [차주 일부] 세인 5/25 마감 4건 (점수 미정 0p) =====`);
  for (const item of SEIN_NEXT_WEEK_PARTIAL) {
    const q = toQuest("sein", item);
    await writeQuest(root, q);
    console.log(`  ✓ ${item.due} ${item.title}`);
  }
  console.log("  (차주 /weekly-quests 호출 시 1000p 분배에서 확정)");
}

async function verifyWeekTotals(root) {
  console.log(`\n===== [Phase 5] 검증 =====`);
  for (const sid of ["sein", "hyein"]) {
    const prefix = `quests/${sid}/`;
    const snap = await getDocs(
      query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
    );
    let total = 0, count = 0;
    snap.forEach((d) => {
      const q = d.data()?.value;
      if (!q) return;
      if (q.due_date < WEEK_START || q.due_date > WEEK_END) return;
      if (q.title?.startsWith("🧹 청소")) return;
      if (q.title?.includes("🎁 보너스")) return;
      total += q.points || 0;
      count += 1;
    });
    const ok = total === 1000 ? "✓" : "✗";
    console.log(`  ${ok} [${sid}] ${count}건 / ${total}p (목표 1000p)`);
  }
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);
  console.log(`로그인: ${auth.currentUser?.uid}`);
  console.log(`오늘 ${TODAY} · 이번주 ${WEEK_START}~${WEEK_END}\n`);

  const root = collection(db, "families", FAMILY_ID, "kv");

  await settleLastWeek(root);
  await deployThisWeek(root);
  await deployNextWeekPartial(root);

  console.log(`\n===== [autoSeedFlag] =====`);
  for (const sid of ["sein", "hyein"]) {
    await setAutoSeedFlag(root, sid, WEEK_START);
    console.log(`  ✓ _autoseed/${sid}/${WEEK_START}`);
  }
  console.log(`  (5/25 주차는 미세팅 — 차주 일요일 자동 시드 살아있음)`);

  await verifyWeekTotals(root);

  console.log("\n완료.");
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
