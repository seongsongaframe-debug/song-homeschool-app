import { useCallback, useEffect, useState } from "react";
const KEY = "songhs::theme";
function resolve(theme) {
    if (theme === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }
    return theme;
}
function apply(effective) {
    const root = document.documentElement;
    if (effective === "dark")
        root.classList.add("dark");
    else
        root.classList.remove("dark");
}
export function useTheme() {
    const [theme, setThemeState] = useState(() => {
        const raw = localStorage.getItem(KEY);
        if (raw === "light" || raw === "dark" || raw === "system")
            return raw;
        return "system";
    });
    useEffect(() => {
        apply(resolve(theme));
    }, [theme]);
    useEffect(() => {
        if (theme !== "system")
            return;
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const listener = () => apply(resolve("system"));
        mq.addEventListener("change", listener);
        return () => mq.removeEventListener("change", listener);
    }, [theme]);
    const setTheme = useCallback((t) => {
        localStorage.setItem(KEY, t);
        setThemeState(t);
    }, []);
    const cycle = useCallback(() => {
        setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
    }, [theme, setTheme]);
    const effective = resolve(theme);
    return { theme, effective, setTheme, cycle };
}
