import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBAYelNW_yh_DUGStHWRhjrRlEmCGNGOx8",
  authDomain: "song-homeschool.firebaseapp.com",
  projectId: "song-homeschool",
  storageBucket: "song-homeschool.firebasestorage.app",
  messagingSenderId: "759452144888",
  appId: "1:759452144888:web:d68625927f36c96d93570d",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// ignoreUndefinedProperties: undefined 필드를 자동 무시. 없으면 setDoc 이 throw.
// 예: { completedAt: undefined } 같은 객체 쓰기에서 "다시 보내기" 가 조용히 실패했음.
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
});

// 가족 단위 데이터 공유. 기기별로 익명 uid 가 부여되지만 모두 같은 컬렉션에 읽고 씀.
// 추후 보안 강화 시: 가족 passphrase 또는 Google OAuth 화이트리스트로 교체.
export const FAMILY_ID = "song";

let authReadyResolve: (() => void) | null = null;
export const authReady = new Promise<void>((resolve) => {
  authReadyResolve = resolve;
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    authReadyResolve?.();
  } else {
    signInAnonymously(auth).catch((err) => {
      console.error("Firebase anonymous sign-in failed:", err);
    });
  }
});
