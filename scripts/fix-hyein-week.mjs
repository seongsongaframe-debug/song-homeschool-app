// 혜인:
// 1) 수학 숙제 3건 삭제 (혜인은 수학 숙제 없음)
// 2) 어제 이전 마감 (overdue) 퀘스트 due_date → 2026-04-28
// 3) weekly 합계 1000p 재배분 (파닉스 4 × 100p + 브릭스리딩 2 × 100p + 눈높이 2 × 200p)
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
  collection,
  doc,
  setDoc,
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
const TODAY = "2026-04-25";
const NEW_DUE = "2026-04-28";
const MAX_CHAR = String.fromCharCode(0xf8ff);

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

// 점수 매핑 (혜인 weekly 1000p)
const HYEIN_SCORES = [
  // 파닉스 4건 × 100p
  { match: "4과 단어 3회 쓰기", points: 100 },
  { match: "4과 문장 필사", points: 100 },
  { match: "4과 본문 낭독 영상", points: 100 },
  { match: "4과 워크북", points: 100 }, // 파닉스
  // 브릭스리딩30 2건 × 100p
  { match: "4과 낭독 영상", points: 100 },
  // 4과 워크북 (브릭스리딩) — 위와 동명. 두 번째 매칭은 노트로 구분
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);
  console.log("로그인:", auth.currentUser?.uid, "\n");

  const root = collection(db, "families", FAMILY_ID, "kv");
  const prefix = `quests/hyein/`;
  const snap = await getDocs(
    query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
  );

  let mathDeleted = 0;
  let dueShifted = 0;
  let pointsUpdated = 0;
  const phonicsItems = [];
  const bricksItems = [];

  // --- 1) 수학 삭제 + 2) overdue → 4/28 이동 ---
  console.log("[1] 혜인 수학 삭제 + overdue 이동");
  for (const d of snap.docs) {
    const data = d.data();
    const q = data?.value;
    if (!q) continue;

    if (q.title?.startsWith("수학 숙제")) {
      await deleteDoc(doc(root, encodeKey(data.key)));
      console.log(`  ✗ 삭제: ${q.title} (${q.due_date})`);
      mathDeleted += 1;
      continue;
    }

    if (q.due_date < TODAY) {
      const next = { ...q, due_date: NEW_DUE };
      await setDoc(doc(root, encodeKey(data.key)), {
        key: data.key,
        value: next,
        updatedAt: Date.now(),
      });
      console.log(`  → ${q.title}: ${q.due_date} → ${NEW_DUE}`);
      dueShifted += 1;
    }

    // 분류
    if (q.note?.includes("파닉스")) phonicsItems.push(data);
    else if (q.note?.includes("브릭스")) bricksItems.push(data);
  }

  console.log(`\n  → 수학 삭제 ${mathDeleted}건, due_date 이동 ${dueShifted}건`);

  // --- 3) 점수 재배분: 파닉스 4×100, 브릭스리딩 2×100, 눈높이 2×200 ---
  console.log("\n[2] 점수 재배분");

  // 다시 조회 (수학 삭제 후)
  const snap2 = await getDocs(
    query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
  );
  for (const d of snap2.docs) {
    const data = d.data();
    const q = data?.value;
    if (!q) continue;

    let newPoints = null;
    let group = "";
    if (q.note?.includes("파닉스")) {
      newPoints = 100;
      group = "파닉스";
    } else if (q.note?.includes("브릭스")) {
      newPoints = 100;
      group = "브릭스리딩";
    } else if (q.title?.startsWith("눈높이")) {
      newPoints = 200;
      group = "눈높이";
    }

    if (newPoints !== null && q.points !== newPoints) {
      const next = { ...q, points: newPoints };
      await setDoc(doc(root, encodeKey(data.key)), {
        key: data.key,
        value: next,
        updatedAt: Date.now(),
      });
      console.log(`  ✓ [${group}] ${q.title} → ${newPoints}p`);
      pointsUpdated += 1;
    }
  }

  console.log(`\n  → ${pointsUpdated}건 점수 갱신`);

  // --- 합계 검증 ---
  console.log("\n[3] 주간 합계 검증");
  for (const sid of ["sein", "hyein"]) {
    const p = `quests/${sid}/`;
    const s = await getDocs(
      query(root, where("key", ">=", p), where("key", "<", p + MAX_CHAR))
    );
    let weekSum = 0;
    let weekCount = 0;
    s.forEach((d) => {
      const q = d.data()?.value;
      if (!q) return;
      if (q.due_date >= "2026-04-27" && q.due_date <= "2026-05-03") {
        weekSum += q.points || 0;
        weekCount += 1;
      }
    });
    console.log(`  [${sid}] 이번 주 ${weekCount}개 × 합 ${weekSum}p`);
  }

  console.log("\n완료.");
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
