// 마감일이 오늘(2026-05-19) 이전인 모든 미완료/미확인 quest 일괄 done+verified 처리.
// 청소·보너스 제외. ledger 적립 (중복 방지: 이미 quest_complete entry 있으면 스킵).
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
const TODAY = "2026-05-19";
const NOW_ISO = new Date().toISOString();

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);

  const root = collection(db, "families", FAMILY_ID, "kv");

  for (const sid of ["sein", "hyein"]) {
    const prefix = `quests/${sid}/`;
    const snap = await getDocs(
      query(root, where("key", ">=", prefix), where("key", "<", prefix + MAX_CHAR))
    );

    // ledger 읽기
    const ledgerKey = `points/${sid}/ledger`;
    const ledgerDoc = await getDocs(
      query(root, where("key", "==", ledgerKey))
    );
    let ledger = [];
    ledgerDoc.forEach((d) => {
      const v = d.data()?.value;
      if (Array.isArray(v)) ledger = v;
    });
    const existingQuestIds = new Set(
      ledger
        .filter((e) => e.reason === "quest_complete")
        .map((e) => e.quest_id)
    );

    const updates = [];
    const newLedger = [];
    let totalPts = 0;

    for (const d of snap.docs) {
      const data = d.data();
      const q = data?.value;
      if (!q) continue;
      if (q.due_date >= TODAY) continue; // 오늘 이후는 건너뜀
      if (q.verified) continue; // 이미 확인된 것은 건너뜀
      if (q.title?.startsWith("🧹 청소")) continue; // 청소는 일일 자동이라 제외
      if (q.title?.includes("🎁 보너스")) continue; // 보너스는 건너뜀

      // done + verified 로 마킹
      const next = {
        ...q,
        status: "done",
        completedAt: q.completedAt ?? q.due_date + "T18:00:00.000Z",
        verified: true,
        verifiedAt: NOW_ISO,
        rejectedReason: undefined,
      };
      updates.push({ key: data.key, value: next });

      // ledger 적립 (중복 방지)
      if (!existingQuestIds.has(q.id)) {
        newLedger.push({
          id: randomUUID(),
          student_id: sid,
          date: q.due_date,
          delta: q.points || 0,
          reason: "quest_complete",
          quest_id: q.id,
          note: q.title,
        });
        totalPts += q.points || 0;
      }
    }

    for (const u of updates) {
      await setDoc(doc(root, encodeKey(u.key)), {
        key: u.key,
        value: u.value,
        updatedAt: Date.now(),
      });
    }

    if (newLedger.length > 0) {
      const updatedLedger = [...ledger, ...newLedger];
      await setDoc(doc(root, encodeKey(ledgerKey)), {
        key: ledgerKey,
        value: updatedLedger,
        updatedAt: Date.now(),
      });
    }

    console.log(`[${sid}] 정산 ${updates.length}건 / 신규 ledger ${newLedger.length}건 / +${totalPts}p`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
