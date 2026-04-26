import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
import { storage, KEYS } from "../storage";
import { hashPin, verifyPin } from "../lib/pin";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [state, setState] = useState({
        role: "child",
        pinSet: false,
    });
    const [ready, setReady] = useState(false);
    useEffect(() => {
        (async () => {
            const stored = await storage.read(KEYS.authState);
            const hash = await storage.read(KEYS.pinHash);
            setState({
                role: stored?.role === "parent" ? "parent" : "child",
                activeChildId: stored?.activeChildId,
                pinSet: !!hash,
            });
            setReady(true);
        })();
    }, []);
    const persist = useCallback(async (next) => {
        setState(next);
        await storage.write(KEYS.authState, next);
    }, []);
    const value = useMemo(() => ({
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
            const hash = await storage.read(KEYS.pinHash);
            if (!hash) {
                await persist({ ...state, role: "parent" });
                return true;
            }
            const ok = await verifyPin(pin, hash);
            if (ok)
                await persist({ ...state, role: "parent" });
            return ok;
        },
        exitParent: async () => {
            await persist({ ...state, role: "child" });
        },
    }), [state, ready, persist]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
