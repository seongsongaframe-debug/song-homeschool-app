// 혜인 5/11-5/17 마감 퀘스트 전수 출력 (assigned_date 별 그룹).
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
  collection,
  getDocs,
  query,
  where,
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
const MAX_CHAR = String.fromCharCode(0xf8ff);

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);

  const root = collection(db, "families", FAMILY_ID, "kv");
  const prefix = `quests/hyein/`;
  const snap = await getDocs(
    query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
  );
  const rows = [];
  snap.forEach((d) => {
    const q = d.data()?.value;
    if (!q) return;
    if (q.due_date < "2026-05-11" || q.due_date > "2026-05-17") return;
    if (q.title?.startsWith("🧹 청소")) return;
    rows.push({ key: d.data().key, q });
  });
  rows.sort((a, b) =>
    (a.q.due_date + a.q.assigned_date).localeCompare(
      b.q.due_date + b.q.assigned_date
    )
  );
  console.log(`총 ${rows.length}건\n`);
  for (const { key, q } of rows) {
    console.log(
      `due ${q.due_date} | assigned ${q.assigned_date} | ${q.points}p | status=${q.status} | ${q.title}`
    );
    console.log(`  key=${key}`);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
