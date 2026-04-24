import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { storage, KEYS } from "../storage";
import { hashPin, verifyPin } from "../lib/pin";
import type { AppRole, AuthState } from "../types";

interface AuthContextValue {
  role: AppRole;
  activeChildId?: string;
  pinSet: boolean;
  ready: boolean;
  setChild: (id: string) => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  clearPin: () => Promise<void>;
  enterParent: (pin: string) => Promise<boolean>;
  exitParent: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    role: "child",
    pinSet: false,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await storage.read<AuthState>(KEYS.authState);
      const hash = await storage.read<string>(KEYS.pinHash);
      setState({
        role: stored?.role === "parent" ? "parent" : "child",
        activeChildId: stored?.activeChildId,
        pinSet: !!hash,
      });
      setReady(true);
    })();
  }, []);

  const persist = useCallback(async (next: AuthState) => {
    setState(next);
    await storage.write(KEYS.authState, next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      ready,
      setChild: async (id) => {
        await persist({ ...state, activeChildId: id });
      },
      setPin: async (pin) => {
        const h = await hashPin(pin);
        await storage.write(KEYS.pinHash, h);
        setState((s) => ({ ...s, pinSet: true }));
      },
      clearPin: async () => {
        await storage.remove(KEYS.pinHash);
        await persist({ role: "child", activeChildId: state.activeChildId, pinSet: false });
      },
      enterParent: async (pin) => {
        const hash = await storage.read<string>(KEYS.pinHash);
        if (!hash) {
          await persist({ ...state, role: "parent" });
          return true;
        }
        const ok = await verifyPin(pin, hash);
        if (ok) await persist({ ...state, role: "parent" });
        return ok;
      },
      exitParent: async () => {
        await persist({ ...state, role: "child" });
      },
    }),
    [state, ready, persist]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
