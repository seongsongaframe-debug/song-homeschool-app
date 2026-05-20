// 혜인 4/30 마감 영어 숙제 4건 등록 + 이번주 12건 1000p 재배분.
// 영어 10 × 60p + 눈높이 2 × 200p = 1000p
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
const TODAY = "2026-04-29";
const DUE_430 = "2026-04-30";
const WEEK_START = "2026-04-27";
const WEEK_END = "2026-05-03";

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

function newQuest({ title, note, subtasks }) {
  return {
    id: randomUUID(),
    student_id: "hyein",
    assigned_date: TODAY,
    due_date: DUE_430,
    title,
    subject_id: "english",
    target: 1,
    unit: "회",
    difficulty: "normal",
    points: 60,
    status: "pending",
    note,
    subtasks: subtasks?.map((label) => ({
      id: randomUUID(),
      label,
      done: false,
    })),
    requires_verification: true,
    verified: false,
  };
}

const NEW_4_30 = [
  newQuest({
    title: "4과 단어 낭독·쓰기",
    note: "36~38p",
    subtasks: ["단어 낭독 연습 3회", "단어 쓰기 2회"],
  }),
  newQuest({
    title: "4과 낭독 영상·필사",
    note: "38p",
    subtasks: ["낭독 영상", "필사 1회"],
  }),
  newQuest({
    title: "4과 본문 낭독 영상",
    note: "40p",
  }),
  newQuest({
    title: "4과 워크북",
    note: "4/30 영어",
  }),
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);

  const root = collection(db, "families", FAMILY_ID, "kv");

  // 1) 새 4/30 퀘스트 등록
  console.log(`[1] 4/30 영어 ${NEW_4_30.length}건 등록`);
  for (const q of NEW_4_30) {
    const key = `quests/hyein/${q.id}`;
    await setDoc(doc(root, encodeKey(key)), {
      key,
      value: q,
      updatedAt: Date.now(),
    });
    console.log(`  + ${q.title} (60p)`);
  }

  // 2) 이번주 전체 재배분
  console.log(`\n[2] 이번주 12건 점수 재배분`);
  const snap = await getDocs(
    query(
      root,
      where("key", ">=", `quests/hyein/`),
      where("key", "<", `quests/hyein/` + MAX_CHAR)
    )
  );

  let updated = 0;
  let total = 0;
  const items = [];
  for (const d of snap.docs) {
    const data = d.data();
    const q = data?.value;
    if (!q) continue;
    if (q.due_date < WEEK_START || q.due_date > WEEK_END) continue;

    const isNoonopi = q.title?.startsWith("눈높이");
    const newPoints = isNoonopi ? 200 : 60;

    if (q.points !== newPoints) {
      const next = { ...q, points: newPoints };
      await setDoc(doc(root, encodeKey(data.key)), {
        key: data.key,
        value: next,
        updatedAt: Date.now(),
      });
      console.log(
        `  ${q.points}p → ${newPoints}p · [${q.due_date}] ${q.title}`
      );
      updated += 1;
    }
    items.push({ ...q, points: newPoints });
    total += newPoints;
  }

  console.log(`\n  → ${updated}건 갱신, ${items.length}건 합 ${total}p`);

  // 3) 검증
  console.log(`\n[3] 검증`);
  const eng = items.filter((q) => !q.title?.startsWith("눈높이"));
  const non = items.filter((q) => q.title?.startsWith("눈높이"));
  console.log(`  영어 자율학습: ${eng.length}개 × ${eng[0]?.points}p = ${eng.reduce((s, q) => s + q.points, 0)}p`);
  console.log(`  눈높이:        ${non.length}개 × ${non[0]?.points}p = ${non.reduce((s, q) => s + q.points, 0)}p`);
  console.log(`  합계:          ${total}p ${total === 1000 ? "✓" : "✗ (목표 1000p 미달)"}`);

  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
