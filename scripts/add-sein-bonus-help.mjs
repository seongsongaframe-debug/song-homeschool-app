// 세인 보너스 퀘스트: 혜인 4/30 영어 숙제 도와주기 (+150p, 보호자 확인 필수)
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
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
const TODAY = "2026-04-29";
const DUE = "2026-04-30";

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

const QUEST = {
  id: randomUUID(),
  student_id: "sein",
  assigned_date: TODAY,
  due_date: DUE,
  title: "🎁 보너스: 혜인이 영어 숙제 도와주기",
  subject_id: "english",
  target: 1,
  unit: "회",
  difficulty: "hard",
  points: 150,
  status: "pending",
  note: "150p 보너스 — 혜인 옆에서 도와주고 보호자 확인 후 지급",
  subtasks: [
    { id: randomUUID(), label: "혜인이 옆에 앉아 함께 시작", done: false },
    { id: randomUUID(), label: "어려운 부분 설명해주기", done: false },
    { id: randomUUID(), label: "다 끝났는지 확인하고 보호자에게 알리기", done: false },
  ],
  requires_verification: true,
  verified: false,
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);

  const root = collection(db, "families", FAMILY_ID, "kv");
  const key = `quests/sein/${QUEST.id}`;
  await setDoc(doc(root, encodeKey(key)), {
    key,
    value: QUEST,
    updatedAt: Date.now(),
  });

  console.log(`✓ 세인 보너스 퀘스트 등록`);
  console.log(`  제목: ${QUEST.title}`);
  console.log(`  마감: ${QUEST.due_date} (목)`);
  console.log(`  포인트: +${QUEST.points}p`);
  console.log(`  세부: ${QUEST.subtasks.length}개 항목`);
  console.log(`  보호자 확인 필요: ${QUEST.requires_verification}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
