// 수동 구성 배포 스크립트. 파서가 섹션/부제/괄호 조합을 완벽히 못 잡는 경우용.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
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

const BATCHES = [
  {
    student_id: "sein",
    date: "2026-04-22",
    quests: [
      { title: "24과 틀린것 4회쓰기", target: 4, unit: "회", note: "능률보카" },
      { title: "25과 단어 문제 풀기", target: 1, unit: "건", note: "능률보카" },
      {
        title: "본문 전체 필사",
        target: 2,
        unit: "회",
        note: "영문학당 — The heart of a Monkey",
      },
      {
        title: "본문 낭독 연습",
        target: 5,
        unit: "회",
        note: "영문학당 — The heart of a Monkey",
        subtasks: ["5회 낭독", "영상 올리기"],
      },
      {
        title: "전체 스피킹 총괄 테스트 준비",
        target: 1,
        unit: "건",
        note: "영문학당 — 다음 주 테스트 대비",
        difficulty: "hard",
      },
    ],
  },
  {
    student_id: "hyein",
    date: "2026-04-21",
    quests: [
      {
        title: "4과 단어 3회 쓰기",
        target: 3,
        unit: "회",
        note: "파닉스 (31p)",
      },
      { title: "4과 문장 필사", target: 1, unit: "건", note: "파닉스 (35p)" },
      {
        title: "4과 본문 낭독 영상",
        target: 1,
        unit: "건",
        note: "파닉스 (36p)",
      },
      { title: "4과 워크북", target: 1, unit: "건", note: "파닉스" },
      { title: "4과 낭독 영상", target: 1, unit: "건", note: "브릭스리딩30" },
      {
        title: "4과 워크북",
        target: 1,
        unit: "건",
        note: "브릭스리딩30 · 책 뒤에 있음",
      },
    ],
  },
];

const DIFFICULTY_POINTS = { easy: 5, normal: 10, hard: 20 };

function encodeKey(key) {
  return key.replace(/\//g, "__").replace(/\s/g, "_");
}

function toQuest(student_id, date, spec) {
  const difficulty = spec.difficulty ?? "normal";
  const id = randomUUID();
  const subtasks = spec.subtasks?.length
    ? [
        { id: randomUUID(), label: spec.title, done: false },
        ...spec.subtasks.map((l) => ({
          id: randomUUID(),
          label: l,
          done: false,
        })),
      ]
    : null;
  return {
    id,
    student_id,
    date,
    title: spec.title,
    target: spec.target,
    unit: spec.unit,
    difficulty,
    points: spec.points ?? DIFFICULTY_POINTS[difficulty],
    status: "pending",
    note: spec.note ?? null,
    subtasks,
    requires_verification: true,
    verified: false,
  };
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  console.log("로그인 중…");
  await signInAnonymously(auth);
  console.log("로그인 완료:", auth.currentUser?.uid, "\n");

  const root = collection(db, "families", FAMILY_ID, "kv");
  for (const batch of BATCHES) {
    console.log(`[${batch.student_id}] ${batch.date} — ${batch.quests.length}개`);
    for (const spec of batch.quests) {
      const q = toQuest(batch.student_id, batch.date, spec);
      const key = `quests/${batch.student_id}/${batch.date}/${q.id}`;
      const ref = doc(root, encodeKey(key));
      await setDoc(ref, { key, value: q, updatedAt: Date.now() });
      console.log(
        `  ✓ ${q.title} — ${q.target}${q.unit}${q.note ? ` · ${q.note}` : ""}${
          q.subtasks ? ` [${q.subtasks.length} 세부]` : ""
        } (+${q.points}p)`
      );
    }
    console.log();
  }
  console.log("배포 완료.");
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
