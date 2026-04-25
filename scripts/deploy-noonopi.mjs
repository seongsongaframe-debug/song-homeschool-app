// 눈높이 주간 숙제 배포: 매주 화요일 마감, 두 번에 나눠 절반씩.
// 세인·혜인 각각 2개씩 (1/2, 2/2).
// 사용: node scripts/deploy-noonopi.mjs [YYYY-MM-DD]
//   인자 없으면 오늘 기준 가장 가까운 화요일 자동 선택.

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
  collection,
  doc,
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

function fmtLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayISO() {
  return fmtLocal(new Date());
}

function nextTuesday(fromISO) {
  const d = new Date(fromISO + "T00:00:00");
  const day = d.getDay(); // 0=Sun, 2=Tue
  const delta = (2 - day + 7) % 7 || 7; // 오늘이 화요일이면 다음 주 화요일
  d.setDate(d.getDate() + delta);
  return fmtLocal(d); // 로컬 기준 (toISOString 은 UTC 라 하루 전이 될 수 있음)
}

const due = process.argv[2] || nextTuesday(todayISO());
const assigned = todayISO();

const STUDENTS = ["sein", "hyein"];
const PARTS = [
  { label: "(1/2)", note: "주간 분량 절반 — 토·일 권장" },
  { label: "(2/2)", note: "주간 분량 나머지 절반 — 월·화 마감 전" },
];

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);
  console.log("로그인 완료:", auth.currentUser?.uid);
  console.log(`배포일(assigned_date): ${assigned}`);
  console.log(`마감일(due_date): ${due}\n`);

  const root = collection(db, "families", FAMILY_ID, "kv");

  for (const studentId of STUDENTS) {
    console.log(`[${studentId}]`);
    for (const part of PARTS) {
      const id = randomUUID();
      const q = {
        id,
        student_id: studentId,
        assigned_date: assigned,
        due_date: due,
        title: `눈높이 ${part.label}`,
        target: 1,
        unit: "회차",
        difficulty: "normal",
        points: 10,
        status: "pending",
        note: part.note,
        requires_verification: true,
        verified: false,
      };
      const key = `quests/${studentId}/${id}`;
      await setDoc(doc(root, encodeKey(key)), {
        key,
        value: q,
        updatedAt: Date.now(),
      });
      console.log(`  ✓ ${q.title} — ${part.note} (+${q.points}p)`);
    }
    console.log();
  }
  console.log("배포 완료.");
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
