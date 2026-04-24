// sein 4.20 배포에서 파서 버그로 합쳐진 "13과 text writing풀기 11과 워크북 풀기" 를 두 개로 분리.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
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
const TODAY = "2026-04-24";
const DUE = "2026-04-20";

function encodeKey(key) {
  return key.replace(/\//g, "__").replace(/\s/g, "_");
}
const MAX_CHAR = String.fromCharCode(0xf8ff);

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  await signInAnonymously(auth);
  const root = collection(db, "families", FAMILY_ID, "kv");

  // 합쳐진 퀘스트 찾아서 삭제
  const prefix = `quests/sein/${TODAY}/`;
  const snap = await getDocs(
    query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
  );
  let merged = null;
  snap.forEach((d) => {
    const data = d.data();
    if (data?.value?.title === "13과 text writing풀기 11과 워크북 풀기") {
      merged = { key: data.key, value: data.value };
    }
  });

  if (merged) {
    await deleteDoc(doc(root, encodeKey(merged.key)));
    console.log("합쳐진 퀘스트 삭제됨");
  } else {
    console.log("이미 처리되어 합쳐진 퀘스트가 없음 — 분리본만 생성");
  }

  // 두 개로 분리해서 다시 쓰기
  const splits = [
    {
      title: "13과 text writing 풀기",
      target: 1,
      unit: "건",
      note: "따라읽으면서 쓰기",
      difficulty: "normal",
      points: 10,
    },
    {
      title: "11과 워크북 풀기",
      target: 1,
      unit: "건",
      note: "그래머",
      difficulty: "normal",
      points: 10,
    },
  ];

  for (const s of splits) {
    const id = randomUUID();
    const q = {
      id,
      student_id: "sein",
      date: TODAY,
      due_date: DUE,
      title: s.title,
      target: s.target,
      unit: s.unit,
      difficulty: s.difficulty,
      points: s.points,
      status: "pending",
      note: s.note,
      subtasks: null,
      requires_verification: true,
      verified: false,
    };
    const key = `quests/sein/${TODAY}/${id}`;
    await setDoc(doc(root, encodeKey(key)), {
      key,
      value: q,
      updatedAt: Date.now(),
    });
    console.log(`  ✓ ${s.title} (${s.note})`);
  }

  console.log("\n완료.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
