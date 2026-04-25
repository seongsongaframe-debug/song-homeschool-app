// 방금 배포한 눈높이 4개의 due_date 를 2026-04-27 → 2026-04-28 (실제 화요일) 로 정정.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
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
const WRONG = "2026-04-27";
const CORRECT = "2026-04-28";

const MAX_CHAR = String.fromCharCode(0xf8ff);

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);
  console.log("로그인:", auth.currentUser?.uid, "\n");

  const root = collection(db, "families", FAMILY_ID, "kv");
  let updated = 0;

  for (const sid of ["sein", "hyein"]) {
    const prefix = `quests/${sid}/`;
    const q = query(
      root,
      where("key", ">=", prefix),
      where("key", "<", prefix + MAX_CHAR)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data();
      const quest = data?.value;
      if (!quest) continue;
      if (quest.title?.startsWith("눈높이") && quest.due_date === WRONG) {
        const next = { ...quest, due_date: CORRECT };
        await setDoc(doc(root, encodeKey(data.key)), {
          key: data.key,
          value: next,
          updatedAt: Date.now(),
        });
        console.log(`  ✓ [${sid}] ${quest.title} — due_date ${WRONG} → ${CORRECT}`);
        updated += 1;
      }
    }
  }

  console.log(`\n${updated}개 업데이트 완료.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
