import type { MonsterInstance, MonsterSpecies } from "../types";
import { EGG_HATCH_AT } from "../types";
import { MONSTER_SPECIES, findSpecies } from "../data/monsters";

export function pickSpecies(rng: () => number): MonsterSpecies {
  const total = MONSTER_SPECIES.reduce((s, sp) => s + sp.weight, 0);
  let r = rng() * total;
  for (const sp of MONSTER_SPECIES) {
    r -= sp.weight;
    if (r < 0) return sp;
  }
  return MONSTER_SPECIES[MONSTER_SPECIES.length - 1];
}

export function makeEgg(
  studentId: string,
  id: string,
  now: () => string = () => new Date().toISOString(),
): MonsterInstance {
  return {
    id,
    student_id: studentId,
    acquiredAt: now(),
    progress: 0,
    stage: 0,
  };
}

export function applyProgress(
  inst: MonsterInstance,
  delta: number,
  now: () => string = () => new Date().toISOString(),
  rng: () => number = Math.random,
): MonsterInstance {
  if (delta <= 0) return inst;
  let next: MonsterInstance = { ...inst, progress: inst.progress + delta };

  if (!next.species_id) {
    if (next.progress < EGG_HATCH_AT) return next;
    const sp = pickSpecies(rng);
    next = { ...next, species_id: sp.id, hatchedAt: now(), stage: 1 };
    return advance(next, sp);
  }

  const sp = findSpecies(next.species_id);
  if (!sp) return next;
  return advance(next, sp);
}

function advance(inst: MonsterInstance, sp: MonsterSpecies): MonsterInstance {
  let stage = inst.stage;
  for (let i = stage; i < sp.stages.length; i++) {
    if (inst.progress >= sp.stages[i].questsToReach) stage = i + 1;
    else break;
  }
  return stage === inst.stage ? inst : { ...inst, stage };
}

export interface MonsterDisplay {
  emoji: string;
  name: string;
  isEgg: boolean;
  stageIndex: number;
  speciesId?: string;
  rarity?: MonsterSpecies["rarity"];
  next?: {
    remaining: number;
    emoji: string;
    name: string;
  };
}

export function display(inst: MonsterInstance): MonsterDisplay {
  if (!inst.species_id) {
    const remaining = Math.max(0, EGG_HATCH_AT - inst.progress);
    return {
      emoji: "🥚",
      name: "알",
      isEgg: true,
      stageIndex: 0,
      next: { remaining, emoji: "❓", name: "부화" },
    };
  }
  const sp = findSpecies(inst.species_id);
  if (!sp) {
    return { emoji: "❔", name: "알 수 없는 친구", isEgg: false, stageIndex: 0 };
  }
  const idx = Math.max(0, Math.min(inst.stage - 1, sp.stages.length - 1));
  const cur = sp.stages[idx];
  const upcoming = sp.stages[inst.stage];
  return {
    emoji: cur.emoji,
    name: cur.name,
    isEgg: false,
    stageIndex: inst.stage,
    speciesId: sp.id,
    rarity: sp.rarity,
    next: upcoming
      ? {
          remaining: Math.max(0, upcoming.questsToReach - inst.progress),
          emoji: upcoming.emoji,
          name: upcoming.name,
        }
      : undefined,
  };
}

// 결정적 PRNG (시드 기반). 테스트·시연용.
export function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
