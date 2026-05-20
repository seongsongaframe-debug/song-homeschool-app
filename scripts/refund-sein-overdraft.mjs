// 세인 5/3 보상 구매 환불 (잔고 부족 사후 정정).
// - 5/3 reward_purchase -550p 원장 엔트리 제거
// - 해당 purchase 에 환불 노트 부여
// 대상 purchase_id: 75304e94-c7ba-4e07-ac44-493572949f4d
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
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
const TARGET_PURCHASE_ID = "75304e94-c7ba-4e07-ac44-493572949f4d";
const TARGET_REWARD_ID = "87783d34-9862-454b-b3ac-a13978e00f26";
const TARGET_DATE = "2026-05-03";
const TARGET_AMOUNT = 550;

function encodeKey(k) {
  return k.replace(/\//g, "__").replace(/\s/g, "_");
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  await signInAnonymously(auth);
  console.log("로그인:", auth.currentUser?.uid, "\n");

  // 1) ledger 에서 -550 reward_purchase 엔트리 제거
  const ledgerKey = `points/sein/ledger`;
  const ledgerRef = doc(db, "families", FAMILY_ID, "kv", encodeKey(ledgerKey));
  const ledgerSnap = await getDoc(ledgerRef);
  if (!ledgerSnap.exists()) {
    console.error("세인 ledger 문서 없음. 중단.");
    process.exit(1);
  }
  const ledger = ledgerSnap.data().value || [];
  const before = ledger.length;
  const filtered = ledger.filter((e) => {
    const isTarget =
      e.date === TARGET_DATE &&
      e.reason === "reward_purchase" &&
      e.delta === -TARGET_AMOUNT &&
      e.reward_id === TARGET_REWARD_ID;
    return !isTarget;
  });
  const removed = before - filtered.length;
  if (removed === 0) {
    console.warn("⚠️ 일치하는 ledger 엔트리 없음. 이미 환불됐을 수 있음.");
  } else if (removed > 1) {
    console.error(`⚠️ ${removed}건 일치. 안전장치로 중단.`);
    process.exit(1);
  } else {
    console.log(`[1] ledger -550p 1건 제거`);
  }
  const newBalance = filtered.reduce((s, e) => s + e.delta, 0);
  await setDoc(ledgerRef, {
    key: ledgerKey,
    value: filtered,
    updatedAt: Date.now(),
  });
  console.log(`    새 잔고: ${newBalance}p\n`);

  // 2) purchase 에 환불 노트 추가 (status 는 approved 유지 — 승인 사실 보존)
  const purchaseKey = `purchases/${TARGET_PURCHASE_ID}`;
  const purchaseRef = doc(db, "families", FAMILY_ID, "kv", encodeKey(purchaseKey));
  const purchaseSnap = await getDoc(purchaseRef);
  if (!purchaseSnap.exists()) {
    console.warn("⚠️ purchase 문서 없음. 노트 스킵.");
  } else {
    const p = purchaseSnap.data().value;
    const updated = {
      ...p,
      note:
        (p.note ? p.note + " · " : "") +
        "환불 처리 (5/5) — 5/3 승인 시 잔고 부족(190p < 550p)으로 사후 정정",
    };
    await setDoc(purchaseRef, {
      key: purchaseKey,
      value: updated,
      updatedAt: Date.now(),
    });
    console.log(`[2] purchase ${TARGET_PURCHASE_ID} 노트 기재 완료`);
  }

  console.log("\n환불 완료.");
  process.exit(0);
}

main().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
