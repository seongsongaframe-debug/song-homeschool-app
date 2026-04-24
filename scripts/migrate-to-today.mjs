// 기존에 date 필드로만 배포한 퀘스트를 오늘 날짜로 옮기고, 원 날짜는 due_date 로 이동.
// 사용 예시: node scripts/migrate-to-today.mjs
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

const BATCHES = [
  { student_id: "sein", oldDate: "2026-04-20" },
  { student_id: "hyein", oldDate: "2026-04-21" },
  { student_id: "sein", oldDate: "2026-04-22" },
];

function encodeKey(key) {
  return key.replace(/\//g, "__").replace(/\s/g, "_");
}

const MAX_CHAR = String.fromCharCode(0xf8ff);

async function listByPrefix(root, prefix) {
  const q = query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR));
  const snap = await getDocs(q);
  const items = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data?.key && data?.value) items.push({ key: data.key, value: data.value });
  });
  return items;
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  await signInAnonymously(auth);
  console.log("로그인 완료:", auth.currentUser?.uid, "\n");

  const root = collection(db, "families", FAMILY_ID, "kv");

  for (const { student_id, oldDate } of BATCHES) {
    const prefix = `quests/${student_id}/${oldDate}/`;
    const items = await listByPrefix(root, prefix);
    console.log(`[${student_id}] ${oldDate} → ${TODAY} — ${items.length}개`);

    for (const { key, value: q } of items) {
      const newKey = `quests/${student_id}/${TODAY}/${q.id}`;
      const newQuest = { ...q, date: TODAY, due_date: oldDate };

      // 새 위치에 쓰기
      await setDoc(doc(root, encodeKey(newKey)), {
        key: newKey,
        value: newQuest,
        updatedAt: Date.now(),
      });

      // 기존 위치 삭제
      await deleteDoc(doc(root, encodeKey(key)));

      console.log(`  ✓ ${q.title} (마감: ${oldDate.slice(5)})`);
    }
    console.log();
  }

  console.log("이관 완료. 오늘(", TODAY, ") 퀘스트 보드에 모두 표시됩니다.");
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
