// 보상 등록.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
  collection,
  doc,
  getDoc,
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

const NEW_REWARD = {
  id: randomUUID(),
  title: "메탈카드봇 플레타Z",
  icon: "🤖",
  cost_points: 3000,
  kind: "item",
  description: "👧 혜인 전용 · 토이하우스 변신·합체 로봇 완구 (정가 31,730원)",
  active: true,
  student_id: "hyein", // 향후 학생 분리 기능 추가될 때 활용. 현재 UI 는 무시.
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
  const existing = snap.exists() ? snap.data().value || [] : [];

  // 같은 제목이 이미 있으면 갱신, 없으면 추가
  let next;
  const idx = existing.findIndex((r) => r.title === NEW_REWARD.title);
  if (idx >= 0) {
    next = [...existing];
    next[idx] = { ...existing[idx], ...NEW_REWARD, id: existing[idx].id };
    console.log("기존 보상 갱신");
  } else {
    next = [...existing, NEW_REWARD];
    console.log("신규 보상 추가");
  }

  await setDoc(ref, {
    key: "config/rewards",
    value: next,
    updatedAt: Date.now(),
  });

  console.log(`\n✓ ${NEW_REWARD.icon} ${NEW_REWARD.title}`);
  console.log(`  ${NEW_REWARD.cost_points}p — ${NEW_REWARD.description}`);
  console.log(`\n전체 보상 ${next.length}개 등록됨.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
