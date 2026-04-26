// 세인 전용 보상 3건 등록 (포켓몬 피규어)
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

const NEW_REWARDS = [
  {
    title: "포켓몬 개굴닌자 피규어",
    icon: "🐸",
    cost_points: 550,
    kind: "item",
    description: "👦 세인 전용 · 포켓몬 피규어",
    active: true,
    student_id: "sein",
    source_url:
      "https://smartstore.naver.com/sd2gb2/products/5677448929",
  },
  {
    title: "포켓몬 솔가레오 피규어",
    icon: "🦁",
    cost_points: 1600,
    kind: "item",
    description: "👦 세인 전용 · 전설 포켓몬 피규어",
    active: true,
    student_id: "sein",
    source_url:
      "https://smartstore.naver.com/adpiamall/products/12010527526",
  },
  {
    title: "포켓몬 음번 피규어",
    icon: "💧",
    cost_points: 1800,
    kind: "item",
    description: "👦 세인 전용 · 포켓몬 피규어",
    active: true,
    student_id: "sein",
    source_url:
      "https://smartstore.naver.com/chinadeal/products/10508903174",
  },
];

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

  let next = [...existing];
  for (const r of NEW_REWARDS) {
    const idx = next.findIndex((x) => x.title === r.title);
    const obj = { id: idx >= 0 ? next[idx].id : randomUUID(), ...r };
    if (idx >= 0) {
      next[idx] = { ...next[idx], ...obj };
      console.log(`갱신: ${r.icon} ${r.title} — ${r.cost_points}p`);
    } else {
      next.push(obj);
      console.log(`추가: ${r.icon} ${r.title} — ${r.cost_points}p`);
    }
  }

  await setDoc(ref, {
    key: "config/rewards",
    value: next,
    updatedAt: Date.now(),
  });
  console.log(`\n전체 보상 ${next.length}개`);
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
