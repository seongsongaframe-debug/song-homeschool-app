import { LEVEL_TIERS } from "../types";
export function tierFor(points) {
    let current = LEVEL_TIERS[0];
    for (const t of LEVEL_TIERS) {
        if (points >= t.minPoints)
            current = t;
    }
    return current;
}
export function nextTier(points) {
    for (const t of LEVEL_TIERS) {
        if (points < t.minPoints)
            return t;
    }
    return null;
}
export function progressToNext(points) {
    const current = tierFor(points);
    const next = nextTier(points);
    if (!next)
        return { current, next: null, percent: 1, delta: 0 };
    const span = next.minPoints - current.minPoints;
    const done = points - current.minPoints;
    return {
        current,
        next,
        percent: span > 0 ? Math.min(1, Math.max(0, done / span)) : 1,
        delta: next.minPoints - points,
    };
}
