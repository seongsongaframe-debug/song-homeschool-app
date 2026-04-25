// 1) 세인 4/20 영어학원 6건 → due 4/27 로 이동
// 2) 세인 weekly 20개로 1000p 재배분
// 3) 메탈카드봇 보상에 SSG 이미지 + 상품 페이지 URL 추가
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
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
const MAX_CHAR = String.fromCharCode(0xf8ff);

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

// 세인 신 점수 분배 (총 1000p / 20 quests)
// 매칭 키: title.includes(match)
const SEIN_SCORES = [
  // ---- 영어학원 (4/27 마감) ----
  { match: "13과 단어틀린것", points: 50, due: "2026-04-27" },
  { match: "14과 단어암기", points: 50, due: "2026-04-27" },
  { match: "13과 낭독", points: 60, due: "2026-04-27" },
  { match: "13과 워크북", points: 25, due: "2026-04-27" },
  { match: "13과 text writing", points: 40, due: "2026-04-27" },
  { match: "11과 워크북", points: 25, due: "2026-04-27" },
  // ---- 눈높이 (4/28) ----
  { match: "눈높이 (1/2)", points: 50 },
  { match: "눈높이 (2/2)", points: 50 },
  // ---- 능률보카 (4/29) ----
  { match: "24과 틀린것", points: 60 },
  { match: "25과 단어 문제", points: 50 },
  // ---- 영문학당 본문 The heart of a Monkey (4/29) ----
  { match: "본문 전체 필사", points: 60 },
  { match: "본문 낭독 연습", points: 100 },
  { match: "전체 스피킹", points: 100 },
  // ---- 영문학당 3과 (5/1) ----
  { match: "영문학당 3과 단어", points: 60 },
  { match: "영문학당 3과 낭독", points: 90 },
  { match: "영문학당 3과 36p 필사", points: 30 },
  { match: "영문학당 3과 워크북", points: 30 },
  // ---- 수학 ----
  { match: "수학 숙제 (월)", points: 20 },
  { match: "수학 숙제 (수)", points: 20 },
  { match: "수학 숙제 (목)", points: 30 },
];

// 메탈카드봇 이미지
const ROBOT_IMAGE = "https://sitem.ssgcdn.com/25/61/56/item/1000550566125_i1_1200.jpg";
const ROBOT_SOURCE = "https://www.ssg.com/item/itemView.ssg?itemId=1000550566125";

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);
  console.log("로그인:", auth.currentUser?.uid, "\n");

  const root = collection(db, "families", FAMILY_ID, "kv");

  // ---------- 세인 점수·날짜 갱신 ----------
  console.log("[1] 세인 weekly 20건 점수·날짜 재배분");
  const seinPrefix = `quests/sein/`;
  const seinSnap = await getDocs(
    query(root, where("key", ">=", seinPrefix), where("key", "<", seinPrefix + MAX_CHAR))
  );
  const matched = new Set();
  let updated = 0;
  for (const d of seinSnap.docs) {
    const data = d.data();
    const q = data?.value;
    if (!q) continue;
    for (const rule of SEIN_SCORES) {
      if (matched.has(rule.match)) continue;
      if (q.title?.includes(rule.match)) {
        const next = { ...q, points: rule.points };
        if (rule.due) next.due_date = rule.due;
        await setDoc(doc(root, encodeKey(data.key)), {
          key: data.key,
          value: next,
          updatedAt: Date.now(),
        });
        console.log(
          `  ✓ ${q.title} → ${rule.points}p${
            rule.due ? `, due ${rule.due}` : ""
          }`
        );
        matched.add(rule.match);
        updated += 1;
        break;
      }
    }
  }
  console.log(`  → ${updated}건 갱신`);

  const unmatched = SEIN_SCORES.filter((r) => !matched.has(r.match));
  if (unmatched.length > 0) {
    console.log("\n  ⚠️ 매칭 실패 항목:");
    unmatched.forEach((r) => console.log(`     - "${r.match}"`));
  }

  // ---------- 합계 검증 ----------
  console.log("\n[2] 주간 합계 검증");
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
      if (q.due_date >= "2026-04-27" && q.due_date <= "2026-05-03") {
        weekSum += q.points || 0;
        weekCount += 1;
      }
    });
    console.log(`  [${sid}] 이번 주 ${weekCount}개 × 합 ${weekSum}p`);
  }

  // ---------- 메탈카드봇 이미지 ----------
  console.log("\n[3] 메탈카드봇 보상에 이미지 추가");
  const rewardsRef = doc(root, encodeKey("config/rewards"));
  const rsnap = await getDoc(rewardsRef);
  if (rsnap.exists()) {
    const list = rsnap.data().value || [];
    const next = list.map((r) => {
      if (r.title === "메탈카드봇 플레타Z") {
        return { ...r, image_url: ROBOT_IMAGE, source_url: ROBOT_SOURCE };
      }
      return r;
    });
    await setDoc(rewardsRef, {
      key: "config/rewards",
      value: next,
      updatedAt: Date.now(),
    });
    console.log(`  ✓ image_url + source_url 갱신`);
  }

  console.log("\n완료.");
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
