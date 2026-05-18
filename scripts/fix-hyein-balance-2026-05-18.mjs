// 혜인 65p 라이팅 30p → 50p로 +20p (1000p 맞추기).
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

  let updated = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const q = data?.value;
    if (!q) continue;
    if (q.due_date !== "2026-05-21") continue;
    if (q.title !== "65p 라이팅 낭독 영상") continue;
    const next = { ...q, points: 50 };
    await setDoc(doc(root, encodeKey(data.key)), {
      key: data.key,
      value: next,
      updatedAt: Date.now(),
    });
    console.log(`  ✓ ${q.title}: ${q.points}p → 50p`);
    updated++;
  }
  console.log(`\n${updated}건 갱신`);

  // 검증
  let total = 0, count = 0;
  snap.forEach((d) => {
    const q = d.data()?.value;
    if (!q) return;
    if (q.due_date < "2026-05-18" || q.due_date > "2026-05-24") return;
    if (q.title?.startsWith("🧹 청소")) return;
    if (q.title?.includes("🎁 보너스")) return;
    // 갱신된 값 반영
    const pts = (q.due_date === "2026-05-21" && q.title === "65p 라이팅 낭독 영상")
      ? 50 : (q.points || 0);
    total += pts;
    count += 1;
  });
  const ok = total === 1000 ? "✓" : "✗";
  console.log(`\n${ok} [hyein] ${count}건 / ${total}p (목표 1000p)`);

  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
