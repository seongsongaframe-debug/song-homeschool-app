import { LEVEL_TIERS, type LevelTier } from "../types";

export function tierFor(points: number): LevelTier {
  let current = LEVEL_TIERS[0];
  for (const t of LEVEL_TIERS) {
    if (points >= t.minPoints) current = t;
  }
  return current;
}

export function nextTier(points: number): LevelTier | null {
  for (const t of LEVEL_TIERS) {
    if (points < t.minPoints) return t;
  }
  return null;
}

export function progressToNext(points: number): {
  current: LevelTier;
  next: LevelTier | null;
  percent: number;
  delta: number;
} {
  const current = tierFor(points);
  const next = nextTier(points);
  if (!next) return { current, next: null, percent: 1, delta: 0 };
  const span = next.minPoints - current.minPoints;
  const done = points - current.minPoints;
  return {
    current,
    next,
    percent: span > 0 ? Math.min(1, Math.max(0, done / span)) : 1,
    delta: next.minPoints - points,
  };
}
