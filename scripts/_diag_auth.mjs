// 실제 앱이 쓰는 동일 config 로 익명 로그인 + Firestore read/write 테스트
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { initializeFirestore, collection, doc, getDoc, setDoc, getDocs, query, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBAYelNW_yh_DUGStHWRhjrRlEmCGNGOx8",
  authDomain: "song-homeschool.firebaseapp.com",
  projectId: "song-homeschool",
  storageBucket: "song-homeschool.firebasestorage.app",
  messagingSenderId: "759452144888",
  appId: "1:759452144888:web:d68625927f36c96d93570d",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

async function step(name, fn) {
  try { const r = await fn(); console.log("  ✓", name, r ?? ""); return true; }
  catch (e) { console.log("  ✗", name, "—", e.code || "", "-", e.message); return false; }
}

console.log("[1] signInAnonymously");
await step("anon sign-in", async () => {
  const c = await signInAnonymously(auth); return "uid="+c.user.uid.slice(0,10);
});

console.log("[2] read families/song/kv");
await step("read query(limit 1)", async () => {
  const root = collection(db, "families", "song", "kv");
  const snap = await getDocs(query(root, limit(1))); return "docs="+snap.size;
});

console.log("[3] write families/song/kv/_diag_probe (probe)");
await step("write probe", async () => {
  const ref = doc(db, "families", "song", "kv", "_diag_probe");
  await setDoc(ref, { key: "_diag_probe", value: { ts: Date.now() }, updatedAt: Date.now() });
  return "OK";
});

console.log("[4] read families/song/kv/_diag_probe (확인)");
await step("read probe", async () => {
  const ref = doc(db, "families", "song", "kv", "_diag_probe");
  const s = await getDoc(ref); return s.exists() ? "exists" : "missing";
});

process.exit(0);
