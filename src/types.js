// 송홈스쿨 데이터 모델
// 모든 도메인 객체는 여기서 정의. UI는 이 타입을 따라 렌더.
export const DIFFICULTY_POINTS = {
    easy: 5,
    normal: 10,
    hard: 20,
};
export const LEVEL_TIERS = [
    { level: 1, minPoints: 0, title: "새싹", icon: "🌱" },
    { level: 2, minPoints: 100, title: "탐험가", icon: "🔍" },
    { level: 3, minPoints: 300, title: "견습생", icon: "📖" },
    { level: 4, minPoints: 600, title: "학자", icon: "🎓" },
    { level: 5, minPoints: 1000, title: "마스터", icon: "⭐" },
    { level: 6, minPoints: 1500, title: "현자", icon: "🧙" },
    { level: 7, minPoints: 2500, title: "전설", icon: "👑" },
];
