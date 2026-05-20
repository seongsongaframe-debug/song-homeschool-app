import type { MonsterSpecies } from "../types";

// 송홈스쿨 몬스터 도감 — 부화 후 종족별 진화 트리.
// weight 합 = 100 → 그대로 % 확률.
// questsToReach 는 부화 후 누적 퀘스트 진척 임계값.
export const MONSTER_SPECIES: MonsterSpecies[] = [
  {
    id: "sprout",
    rarity: "common",
    weight: 30,
    description: "햇살을 먹고 자라는 어린 풀.",
    stages: [
      { name: "새싹", emoji: "🌱", questsToReach: 5 },
      { name: "어린나무", emoji: "🌿", questsToReach: 15 },
      { name: "큰나무", emoji: "🌳", questsToReach: 35 },
    ],
  },
  {
    id: "chick",
    rarity: "common",
    weight: 30,
    description: "삐약삐약 따스한 솜털 친구.",
    stages: [
      { name: "병아리", emoji: "🐣", questsToReach: 5 },
      { name: "오리", emoji: "🐤", questsToReach: 15 },
      { name: "꼬꼬닭", emoji: "🐔", questsToReach: 35 },
    ],
  },
  {
    id: "butterfly",
    rarity: "common",
    weight: 20,
    description: "변태를 거쳐 하늘을 나는 곤충 친구.",
    stages: [
      { name: "애벌레", emoji: "🐛", questsToReach: 5 },
      { name: "나비", emoji: "🦋", questsToReach: 20 },
    ],
  },
  {
    id: "puppy",
    rarity: "rare",
    weight: 15,
    description: "꼬리를 흔드는 충성스러운 친구.",
    stages: [
      { name: "강아지", emoji: "🐶", questsToReach: 5 },
      { name: "어른개", emoji: "🐕", questsToReach: 20 },
      { name: "안내견", emoji: "🦮", questsToReach: 50 },
    ],
  },
  {
    id: "dragon",
    rarity: "epic",
    weight: 5,
    description: "전설 속에서 깨어난 진귀한 친구!",
    stages: [
      { name: "아기용", emoji: "🐲", questsToReach: 5 },
      { name: "용", emoji: "🐉", questsToReach: 30 },
    ],
  },
];

export function findSpecies(id: string): MonsterSpecies | undefined {
  return MONSTER_SPECIES.find((sp) => sp.id === id);
}
