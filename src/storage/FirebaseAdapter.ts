import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db, FAMILY_ID, authReady } from "../firebase";
import type { StorageAdapter } from "./StorageAdapter";

// Firestore 문서 ID는 "/" 를 경로 구분자로 해석하므로 인코딩.
// key 는 필드로도 저장해서 prefix 쿼리에 사용.
function encodeKey(key: string): string {
  return key.replace(/\//g, "__").replace(/\s/g, "_");
}

const ROOT = () => collection(db, "families", FAMILY_ID, "kv");

// 유니코드 BMP 최상위 문자. prefix 쿼리 상한으로 사용.
const MAX_CHAR = String.fromCharCode(0xf8ff);

export class FirebaseAdapter implements StorageAdapter {
  async read<T>(key: string): Promise<T | null> {
    await authReady;
    const ref = doc(ROOT(), encodeKey(key));
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return (data?.value ?? null) as T | null;
  }

  async write<T>(key: string, value: T): Promise<void> {
    await authReady;
    const ref = doc(ROOT(), encodeKey(key));
    await setDoc(ref, {
      key,
      value,
      updatedAt: Date.now(),
    });
  }

  async list(prefix: string): Promise<string[]> {
    await authReady;
    const q = query(
      ROOT(),
      where("key", ">=", prefix),
      where("key", "<", prefix + MAX_CHAR)
    );
    const snap = await getDocs(q);
    const out: string[] = [];
    snap.forEach((d) => {
      const k = d.data().key as string | undefined;
      if (k) out.push(k);
    });
    return out;
  }

  async remove(key: string): Promise<void> {
    await authReady;
    const ref = doc(ROOT(), encodeKey(key));
    await deleteDoc(ref);
  }
}
