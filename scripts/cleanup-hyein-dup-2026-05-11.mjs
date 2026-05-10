// 혜인 5/11-5/17 중복 자동 시드 7건 삭제 (120p 피아노/미술 4건 + 200p 눈높이 2건 + 120p 피아노 1건).
// 새로 부여한 60p/150p 버전은 유지.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
  collection,
  doc,
  deleteDoc,
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

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

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

  // 5/11-5/17 범위 + status=pending 인 것 중,
  // 피아노/미술 120p OR 눈높이 200p 만 삭제 (이전 auto-seed 버전).
  const toDelete = [];
  snap.forEach((d) => {
    const data = d.data();
    const q = data?.value;
    if (!q) return;
    if (q.due_date < "2026-05-11" || q.due_date > "2026-05-17") return;
    if (q.status !== "pending") return;
    const isAcademyOld =
      (q.title?.includes("피아노학원") ||
        q.title?.includes("미술학원")) &&
      q.points === 120;
    const isNoonopiOld =
      q.title?.startsWith("눈높이") && q.points === 200;
    if (isAcademyOld || isNoonopiOld) {
      toDelete.push({ key: data.key, q });
    }
  });

  console.log(`삭제 예정 ${toDelete.length}건:`);
  for (const { key, q } of toDelete) {
    console.log(`  · ${q.due_date} | ${q.title} (${q.points}p)`);
  }
  console.log();

  for (const { key } of toDelete) {
    await deleteDoc(doc(root, encodeKey(key)));
  }
  console.log(`삭제 완료 (${toDelete.length}건).`);

  // 검증
  const snap2 = await getDocs(
    query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
  );
  let total = 0,
    count = 0;
  snap2.forEach((d) => {
    const q = d.data()?.value;
    if (!q) return;
    if (q.due_date < "2026-05-11" || q.due_date > "2026-05-17") return;
    if (q.title?.startsWith("🧹 청소")) return;
    total += q.points || 0;
    count += 1;
  });
  console.log(`\n[hyein] 5/11-5/17: ${count}건 / ${total}p (목표 800p)`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
