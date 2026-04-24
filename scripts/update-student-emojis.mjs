// 이미 Firestore 에 저장된 학생 프로필의 이모지를 갱신.
// 세인: 남자(👦), 혜인: 여자(👧)
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { initializeFirestore, collection, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBAYelNW_yh_DUGStHWRhjrRlEmCGNGOx8",
  authDomain: "song-homeschool.firebaseapp.com",
  projectId: "song-homeschool",
  storageBucket: "song-homeschool.firebasestorage.app",
  messagingSenderId: "759452144888",
  appId: "1:759452144888:web:d68625927f36c96d93570d",
};
const FAMILY_ID = "song";

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);
  console.log("로그인 완료:", auth.currentUser?.uid);

  const root = collection(db, "families", FAMILY_ID, "kv");
  const key = "config/students";
  const ref = doc(root, encodeKey(key));
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    console.log("학생 데이터 없음 — 앱 최초 실행 전일 수 있음.");
    process.exit(0);
  }

  const data = snap.data();
  const students = data.value;
  const updated = students.map((s) => {
    if (s.id === "sein") return { ...s, emoji: "👦" };
    if (s.id === "hyein") return { ...s, emoji: "👧" };
    return s;
  });

  await setDoc(ref, { key, value: updated, updatedAt: Date.now() });
  console.log("\n업데이트 완료:");
  updated.forEach((s) =>
    console.log(`  ${s.emoji} ${s.name} (${s.grade}학년)`)
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
