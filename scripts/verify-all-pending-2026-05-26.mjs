// 보호자 확인 대기 큐(quests with status="done" && requires_verification && !verified)에 쌓인
// 모든 항목을 단건 verifyQuest 와 동일 규약으로 일괄 확인 처리.
//
// 단건 로직 (src/pages/Manage.tsx verifyQuest):
//   1) quest 문서를 { verified: true, verifiedAt: ISO, rejectedReason: undefined } 로 갱신
//   2) 포인트 ledger 에 quest_complete entry 추가 (이미 있으면 skip)
//      delta = q.points, date = "오늘"(확인일), reason = "quest_complete", quest_id, note = q.title
//
// 본 스크립트는 학생별로 ledger 를 한 번만 읽고 한 번만 쓰는 식으로 묶어 효율화.
// 단건과 동일하게 perfect_day / streak_bonus 평가는 하지 않음 (UI 측 정책 일치).

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
const MAX_CHAR = String.fromCharCode(0xf8ff);
const TODAY = "2026-05-26";

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);
  console.log(`로그인: ${auth.currentUser?.uid?.slice(0, 12)}`);

  const root = collection(db, "families", FAMILY_ID, "kv");

  // 1) 학생 목록 로드
  const studentsDoc = await getDocs(
    query(root, where("key", "==", "config/students"))
  );
  let students = [];
  studentsDoc.forEach((d) => {
    const v = d.data()?.value;
    if (Array.isArray(v)) students = v;
  });
  if (students.length === 0) {
    // hard fallback
    students = [
      { id: "sein", name: "세인", emoji: "👦" },
      { id: "hyein", name: "혜인", emoji: "👧" },
    ];
  }
  console.log(`학생: ${students.map((s) => s.id).join(", ")}\n`);

  let grandVerified = 0,
    grandPoints = 0;

  for (const s of students) {
    const sid = s.id;
    // 2) 학생 quest 전체 로드
    const prefix = `quests/${sid}/`;
    const qSnap = await getDocs(
      query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
    );
    const pending = [];
    qSnap.forEach((d) => {
      const q = d.data()?.value;
      if (!q) return;
      if (q.status === "done" && q.requires_verification && !q.verified) {
        pending.push(q);
      }
    });

    if (pending.length === 0) {
      console.log(`[${sid}] 확인 대기 0건 — skip`);
      continue;
    }

    // 마감일 오래된 순 (UI 와는 반대로, 처리 로그 가독성 위해)
    pending.sort((a, b) => a.due_date.localeCompare(b.due_date));

    // 3) ledger 한 번 로드
    const ledgerKey = `points/${sid}/ledger`;
    const ledgerSnap = await getDocs(
      query(root, where("key", "==", ledgerKey))
    );
    let ledger = [];
    ledgerSnap.forEach((d) => {
      const v = d.data()?.value;
      if (Array.isArray(v)) ledger = v;
    });
    const existingQuestIds = new Set(
      ledger
        .filter((e) => e.reason === "quest_complete" && e.quest_id)
        .map((e) => e.quest_id)
    );

    console.log(`[${sid}] 확인 대기 ${pending.length}건 처리 시작 (기존 ledger ${ledger.length} entries)`);

    let count = 0,
      pts = 0;
    for (const q of pending) {
      // quest 업데이트
      const next = {
        ...q,
        verified: true,
        verifiedAt: new Date().toISOString(),
        rejectedReason: undefined,
      };
      const qKey = `quests/${sid}/${q.id}`;
      await setDoc(doc(root, encodeKey(qKey)), {
        key: qKey,
        value: next,
        updatedAt: Date.now(),
      });

      // ledger append (idempotent)
      if (!existingQuestIds.has(q.id)) {
        ledger.push({
          id: randomUUID(),
          student_id: sid,
          date: TODAY,
          delta: q.points || 0,
          reason: "quest_complete",
          quest_id: q.id,
          note: q.title,
        });
        existingQuestIds.add(q.id);
        pts += q.points || 0;
      }

      count++;
      console.log(
        `  ✓ ${q.due_date} ${q.title} (+${q.points || 0}p)`
      );
    }

    // 4) ledger 한 번 저장
    await setDoc(doc(root, encodeKey(ledgerKey)), {
      key: ledgerKey,
      value: ledger,
      updatedAt: Date.now(),
    });

    grandVerified += count;
    grandPoints += pts;
    console.log(`[${sid}] 완료: ${count}건 확인 / +${pts}p ledger 적립\n`);
  }

  console.log(`===== 총계 =====`);
  console.log(`  확인 처리: ${grandVerified}건`);
  console.log(`  ledger 신규 적립: +${grandPoints}p (이미 적립된 항목은 skip)`);
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
