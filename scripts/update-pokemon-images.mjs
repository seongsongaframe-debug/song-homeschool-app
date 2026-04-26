// 솔가레오·음번 보상에 실사 이미지 URL 등록.
// 이미지는 GitHub Pages 에 호스팅 (public/images/rewards/ 푸시 후 자동 서빙).
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

const BASE = "https://seongsongaframe-debug.github.io/song-homeschool-app";

const IMAGE_MAP = {
  "포켓몬 솔가레오 피규어": `${BASE}/images/rewards/sein-solgaleo.png`,
  "포켓몬 음번 피규어": `${BASE}/images/rewards/sein-noivern.png`,
};

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
    console.log("rewards 없음");
    process.exit(0);
  }

  const list = snap.data().value || [];
  let updated = 0;
  const next = list.map((r) => {
    const url = IMAGE_MAP[r.title];
    if (url) {
      console.log(`  ✓ ${r.title} → ${url}`);
      updated += 1;
      return { ...r, image_url: url };
    }
    return r;
  });

  await setDoc(ref, {
    key: "config/rewards",
    value: next,
    updatedAt: Date.now(),
  });
  console.log(`\n${updated}건 갱신 완료`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
