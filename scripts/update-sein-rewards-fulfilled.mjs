// 솔가레오·음번은 세인이 이미 획득한 보상 → 상점에서 비활성화 + "획득 완료" 표기
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
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

// 이미 획득한 두 상품
const ALREADY_OWNED_TITLES = ["포켓몬 솔가레오 피규어", "포켓몬 음번 피규어"];

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);
  console.log("로그인:", auth.currentUser?.uid);

  const root = collection(db, "families", FAMILY_ID, "kv");
  const ref = doc(root, encodeKey("config/rewards"));
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    console.log("rewards 데이터 없음");
    process.exit(0);
  }
  const list = snap.data().value || [];
  let updated = 0;
  const next = list.map((r) => {
    if (ALREADY_OWNED_TITLES.includes(r.title)) {
      const desc = (r.description || "")
        .replace(/✅ 이미 획득함\s*·?\s*/g, "")
        .replace(/^· /, "")
        .trim();
      const newDesc = desc
        ? `✅ 이미 획득함 · ${desc}`
        : "✅ 이미 획득함";
      console.log(`  ✓ ${r.title}: active=false, "${newDesc}"`);
      updated += 1;
      return { ...r, active: false, description: newDesc };
    }
    return r;
  });
  await setDoc(ref, {
    key: "config/rewards",
    value: next,
    updatedAt: Date.now(),
  });
  console.log(`\n${updated}건 갱신`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
