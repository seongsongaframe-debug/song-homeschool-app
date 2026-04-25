// 이번 주 숙제 배포 + 포인트 재배분 (총 1000p / 주 / 아이).
// 1) 기존 4/22-due 영어 숙제 5건 → due 4/29 로 이관 + 포인트 갱신
// 2) 5/1-due 영문학당 3과 4건 신규 배포
// 3) 눈높이 (1/2, 2/2) 4건 포인트 갱신
// 4) 수학 숙제 월·수·목 — 세인·혜인 각 3건씩 신규 배포

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

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}
const MAX_CHAR = String.fromCharCode(0xf8ff);
const TODAY = "2026-04-25";

// ---------- 세인 4/29 마감 (기존 4/22 → 이관) ----------
// title prefix 로 매칭. due_date 와 points 만 갱신.
const SEIN_4_29_UPDATES = [
  { match: "24과 틀린것", due_date: "2026-04-29", points: 80 },
  { match: "25과 단어 문제", due_date: "2026-04-29", points: 60 },
  { match: "본문 전체 필사", due_date: "2026-04-29", points: 100 },
  { match: "본문 낭독 연습", due_date: "2026-04-29", points: 120 },
  { match: "전체 스피킹 총괄", due_date: "2026-04-29", points: 120 },
];

// ---------- 세인 5/1 마감 (신규) ----------
const SEIN_5_1_NEW = [
  {
    title: "영문학당 3과 단어 3회 쓰기",
    note: "34p, 36p, 40p",
    target: 3,
    unit: "회",
    points: 80,
  },
  {
    title: "영문학당 3과 낭독 5회 + 영상",
    note: "35-D, 37-E, 40p",
    target: 5,
    unit: "회",
    points: 120,
    subtaskLabels: ["5회 낭독", "영상 올리기"],
  },
  {
    title: "영문학당 3과 36p 필사",
    target: 1,
    unit: "회",
    points: 50,
  },
  {
    title: "영문학당 3과 워크북",
    target: 1,
    unit: "건",
    points: 50,
  },
];

// ---------- 눈높이 포인트 갱신 ----------
const NOONOPI_POINTS = {
  sein: 50,
  hyein: 200,
};

// ---------- 수학 숙제 (신규) ----------
// 매주 월·수·목 마감.
const MATH_DUE = ["2026-04-27", "2026-04-29", "2026-04-30"];
const SEIN_MATH_POINTS = [30, 40, 50]; // 합계 120
const HYEIN_MATH_POINTS = [200, 200, 200]; // 합계 600

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);
  console.log("로그인:", auth.currentUser?.uid, "\n");

  const root = collection(db, "families", FAMILY_ID, "kv");

  // --- 1) 세인 4/29 이관 ---
  console.log("[1] 세인 4/29 마감 — 기존 5건 due_date·포인트 갱신");
  const seinPrefix = `quests/sein/`;
  const seinSnap = await getDocs(
    query(root, where("key", ">=", seinPrefix), where("key", "<", seinPrefix + MAX_CHAR))
  );
  let updated_4_29 = 0;
  for (const d of seinSnap.docs) {
    const data = d.data();
    const q = data?.value;
    if (!q) continue;
    for (const u of SEIN_4_29_UPDATES) {
      if (q.title?.includes(u.match)) {
        const next = { ...q, due_date: u.due_date, points: u.points };
        await setDoc(doc(root, encodeKey(data.key)), {
          key: data.key,
          value: next,
          updatedAt: Date.now(),
        });
        console.log(`  ✓ ${q.title} → ${u.due_date}, ${u.points}p`);
        updated_4_29 += 1;
        break;
      }
    }
  }
  console.log(`  → ${updated_4_29}건 갱신\n`);

  // --- 2) 세인 5/1 신규 ---
  console.log("[2] 세인 5/1 마감 — 신규 4건");
  for (const item of SEIN_5_1_NEW) {
    const id = randomUUID();
    const q = {
      id,
      student_id: "sein",
      assigned_date: TODAY,
      due_date: "2026-05-01",
      title: item.title,
      target: item.target,
      unit: item.unit,
      difficulty: "normal",
      points: item.points,
      status: "pending",
      note: item.note,
      subtasks: item.subtaskLabels?.length
        ? [
            { id: randomUUID(), label: item.title, done: false },
            ...item.subtaskLabels.map((l) => ({
              id: randomUUID(),
              label: l,
              done: false,
            })),
          ]
        : null,
      requires_verification: true,
      verified: false,
    };
    const key = `quests/sein/${id}`;
    await setDoc(doc(root, encodeKey(key)), {
      key,
      value: q,
      updatedAt: Date.now(),
    });
    console.log(`  ✓ ${item.title} (${item.points}p)`);
  }
  console.log();

  // --- 3) 눈높이 포인트 갱신 ---
  console.log("[3] 눈높이 4건 포인트 갱신");
  for (const sid of ["sein", "hyein"]) {
    const prefix = `quests/${sid}/`;
    const snap = await getDocs(
      query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
    );
    for (const d of snap.docs) {
      const data = d.data();
      const q = data?.value;
      if (!q) continue;
      if (q.title?.startsWith("눈높이")) {
        const newPts = NOONOPI_POINTS[sid];
        const next = { ...q, points: newPts };
        await setDoc(doc(root, encodeKey(data.key)), {
          key: data.key,
          value: next,
          updatedAt: Date.now(),
        });
        console.log(`  ✓ [${sid}] ${q.title} → ${newPts}p`);
      }
    }
  }
  console.log();

  // --- 4) 수학 숙제 신규 ---
  console.log("[4] 수학 숙제 — 월·수·목 매주");
  for (const sid of ["sein", "hyein"]) {
    const points = sid === "sein" ? SEIN_MATH_POINTS : HYEIN_MATH_POINTS;
    for (let i = 0; i < MATH_DUE.length; i++) {
      const due = MATH_DUE[i];
      const dayLabel = ["월", "수", "목"][i];
      const id = randomUUID();
      const q = {
        id,
        student_id: sid,
        assigned_date: TODAY,
        due_date: due,
        title: `수학 숙제 (${dayLabel})`,
        subject_id: "math",
        target: 1,
        unit: "회차",
        difficulty: "normal",
        points: points[i],
        status: "pending",
        note: `매주 ${dayLabel}요일 마감`,
        requires_verification: true,
        verified: false,
      };
      const key = `quests/${sid}/${id}`;
      await setDoc(doc(root, encodeKey(key)), {
        key,
        value: q,
        updatedAt: Date.now(),
      });
      console.log(`  ✓ [${sid}] 수학 ${dayLabel} (${due}) — ${points[i]}p`);
    }
  }
  console.log();

  // --- 합계 검증 ---
  console.log("===== 주간 합계 검증 =====");
  for (const sid of ["sein", "hyein"]) {
    const prefix = `quests/${sid}/`;
    const snap = await getDocs(
      query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
    );
    let weekSum = 0;
    let weekCount = 0;
    snap.forEach((d) => {
      const q = d.data()?.value;
      if (!q) return;
      // 4/27 ~ 5/3 마감인 것만 "이번 주" 합계
      if (q.due_date >= "2026-04-27" && q.due_date <= "2026-05-03") {
        weekSum += q.points || 0;
        weekCount += 1;
      }
    });
    console.log(`  [${sid}] 이번 주 ${weekCount}개 × 합계 ${weekSum}p`);
  }
  console.log("\n배포 완료.");
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
