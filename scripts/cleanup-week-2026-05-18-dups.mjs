// 이번주(5/18~5/24) 자동 시드 중복 정리.
// assigned_date=2026-05-16 인 자동 시드분이 5/18 deploy 와 충돌. assigned=5/18 유지, assigned=5/16 삭제.
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
const WEEK_START = "2026-05-18";
const WEEK_END = "2026-05-24";

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);

  const root = collection(db, "families", FAMILY_ID, "kv");

  for (const sid of ["sein", "hyein"]) {
    const prefix = `quests/${sid}/`;
    const snap = await getDocs(
      query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
    );

    // 동일 due_date + title 그룹화
    const byKey = new Map();
    for (const d of snap.docs) {
      const data = d.data();
      const q = data?.value;
      if (!q) continue;
      if (q.due_date < WEEK_START || q.due_date > WEEK_END) continue;
      if (q.title?.startsWith("🧹 청소")) continue;
      const k = `${q.due_date}|${q.title}`;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push({ docKey: data.key, q });
    }

    let deleted = 0;
    for (const [k, list] of byKey) {
      if (list.length <= 1) continue;
      // 5/16 assigned (옛 자동 시드) 우선 삭제
      const toDelete = list.filter(({ q }) => q.assigned_date !== "2026-05-18");
      // 5/16 외에도 중복이면 가장 오래된 것 제외 나머지 삭제
      if (toDelete.length === list.length) {
        toDelete.pop(); // 하나는 살림
      }
      for (const { docKey, q } of toDelete) {
        await deleteDoc(doc(root, encodeKey(docKey)));
        console.log(`  ✗ [${sid}] ${q.due_date} ${q.title} (${q.points}p, assigned ${q.assigned_date})`);
        deleted++;
      }
    }
    console.log(`[${sid}] ${deleted}건 삭제\n`);
  }

  // 검증
  console.log("===== 검증 =====");
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

  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
