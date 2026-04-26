export const seedStudents = [
    {
        id: "sein",
        name: "송세인",
        grade: 4,
        birthYear: 2017,
        color: "#3b82f6",
        emoji: "👦",
    },
    {
        id: "hyein",
        name: "송혜인",
        grade: 2,
        birthYear: 2019,
        color: "#ec4899",
        emoji: "👧",
    },
];
export const seedSubjects = [
    { id: "korean", name: "국어", icon: "📖", color: "#ef4444", order: 1 },
    { id: "math", name: "수학", icon: "🔢", color: "#3b82f6", order: 2 },
    { id: "english", name: "영어", icon: "🅰️", color: "#10b981", order: 3 },
    { id: "hanja", name: "한자", icon: "漢", color: "#8b5cf6", order: 4 },
    {
        id: "society_science",
        name: "사회·과학",
        icon: "🔬",
        color: "#f59e0b",
        order: 5,
    },
    { id: "arts", name: "예체능", icon: "🎨", color: "#ec4899", order: 6 },
];
export const seedMaterials = [
    // ---------- 수학 - 세인(초4) ----------
    {
        id: "didimdol_choisangwi_4_1",
        name: "디딤돌 최상위 수학 4-1",
        subject_id: "math",
        grade: 4,
        progress_type: "linear",
        structure: {
            units: [
                { id: "u1", name: "1. 큰 수", items: 12 },
                { id: "u2", name: "2. 각도", items: 12 },
                { id: "u3", name: "3. 곱셈과 나눗셈", items: 14 },
                { id: "u4", name: "4. 평면도형의 이동", items: 10 },
                { id: "u5", name: "5. 막대그래프", items: 8 },
                { id: "u6", name: "6. 규칙 찾기", items: 10 },
            ],
        },
        description: "현행 심화. 정답률 80% 이상 도달 시 5학년 선행 활성화.",
        unlocks: ["didimdol_basic_5_1"],
    },
    {
        id: "ssen_yeonsan_4",
        name: "쎈연산 4학년",
        subject_id: "math",
        grade: 4,
        progress_type: "daily_reps",
        daily_target: 2,
        unit: "쪽",
    },
    {
        id: "didimdol_basic_5_1",
        name: "디딤돌 기본 수학 5-1 (선행)",
        subject_id: "math",
        grade: 5,
        progress_type: "linear",
        structure: {
            units: [
                { id: "u1", name: "1. 자연수의 혼합 계산", items: 10 },
                { id: "u2", name: "2. 약수와 배수", items: 12 },
                { id: "u3", name: "3. 규칙과 대응", items: 8 },
                { id: "u4", name: "4. 약분과 통분", items: 10 },
                { id: "u5", name: "5. 분수의 덧셈과 뺄셈", items: 12 },
                { id: "u6", name: "6. 다각형의 둘레와 넓이", items: 10 },
            ],
        },
        description: "현행 심화 80% 도달 후 활성화되는 선행 교재.",
    },
    // ---------- 수학 - 혜인(초2) ----------
    {
        id: "didimdol_chowon_2_1",
        name: "디딤돌 초등수학 2-1 응용",
        subject_id: "math",
        grade: 2,
        progress_type: "linear",
        structure: {
            units: [
                { id: "u1", name: "1. 세 자리 수", items: 10 },
                { id: "u2", name: "2. 여러 가지 도형", items: 8 },
                { id: "u3", name: "3. 덧셈과 뺄셈", items: 14 },
                { id: "u4", name: "4. 길이 재기", items: 8 },
                { id: "u5", name: "5. 분류하기", items: 6 },
                { id: "u6", name: "6. 곱셈", items: 10 },
            ],
        },
    },
    {
        id: "ssen_yeonsan_2",
        name: "쎈연산 2학년",
        subject_id: "math",
        grade: 2,
        progress_type: "daily_reps",
        daily_target: 2,
        unit: "쪽",
    },
    // ---------- 국어 ----------
    {
        id: "doksae_4",
        name: "뿌리깊은 초등국어 독해력 4단계",
        subject_id: "korean",
        grade: 4,
        progress_type: "linear",
        structure: {
            units: [{ id: "all", name: "전체", items: 80 }],
        },
    },
    {
        id: "doksae_2",
        name: "뿌리깊은 초등국어 독해력 2단계",
        subject_id: "korean",
        grade: 2,
        progress_type: "linear",
        structure: { units: [{ id: "all", name: "전체", items: 60 }] },
    },
    {
        id: "korean_summary",
        name: "책 읽고 한 줄 요약",
        subject_id: "korean",
        progress_type: "daily_reps",
        daily_target: 1,
        unit: "건",
        description: "대치식 핵심 습관: 매일 1권 이상 요약.",
    },
    // ---------- 영어 ----------
    {
        id: "ar_reading",
        name: "영어 원서 다독 (AR)",
        subject_id: "english",
        progress_type: "free",
        description: "AR 지수 기준 누적 독서 관리. 별도 독서 메뉴에서 입력하면 자동 카운트.",
        custom_fields: [
            { key: "title", label: "책 제목", type: "string", required: true },
            {
                key: "ar_level",
                label: "AR 지수",
                type: "number",
                required: true,
                min: 0,
                max: 13,
                step: 0.1,
            },
            { key: "rating", label: "별점(1-5)", type: "number", min: 1, max: 5 },
        ],
    },
    {
        id: "grammar_in_use_jr",
        name: "Grammar in Use Junior",
        subject_id: "english",
        grade: 4,
        progress_type: "linear",
        structure: { units: [{ id: "all", name: "전체 Unit", items: 50 }] },
    },
    // ---------- 한자 ----------
    {
        id: "hanja_8",
        name: "한자능력검정 8급",
        subject_id: "hanja",
        grade: 2,
        progress_type: "daily_reps",
        daily_target: 5,
        unit: "자",
    },
    {
        id: "hanja_7",
        name: "한자능력검정 7급",
        subject_id: "hanja",
        grade: 4,
        progress_type: "daily_reps",
        daily_target: 5,
        unit: "자",
    },
    // ---------- 사회·과학 ----------
    {
        id: "ss_reading",
        name: "교과 연계 독서 (사회·과학)",
        subject_id: "society_science",
        progress_type: "free",
        custom_fields: [
            { key: "title", label: "책/주제", type: "string", required: true },
            {
                key: "field",
                label: "분야",
                type: "select",
                options: ["사회", "한국사", "과학", "경제", "지리"],
                required: true,
            },
        ],
    },
    // ---------- 예체능 ----------
    {
        id: "instrument_practice",
        name: "악기 연습",
        subject_id: "arts",
        progress_type: "daily_reps",
        daily_target: 20,
        unit: "분",
    },
];
export const seedAssignments = {
    sein: [
        { material_id: "didimdol_choisangwi_4_1", started: today(), active: true, priority: 2 },
        { material_id: "ssen_yeonsan_4", started: today(), active: true, priority: 1 },
        { material_id: "doksae_4", started: today(), active: true, priority: 1 },
        { material_id: "korean_summary", started: today(), active: true, priority: 1 },
        { material_id: "ar_reading", started: today(), active: true, priority: 1 },
        { material_id: "grammar_in_use_jr", started: today(), active: true, priority: 1 },
        { material_id: "hanja_7", started: today(), active: true, priority: 0 },
        { material_id: "ss_reading", started: today(), active: true, priority: 0 },
        { material_id: "instrument_practice", started: today(), active: true, priority: 0 },
    ],
    hyein: [
        { material_id: "didimdol_chowon_2_1", started: today(), active: true, priority: 2 },
        { material_id: "ssen_yeonsan_2", started: today(), active: true, priority: 1 },
        { material_id: "doksae_2", started: today(), active: true, priority: 1 },
        { material_id: "korean_summary", started: today(), active: true, priority: 1 },
        { material_id: "ar_reading", started: today(), active: true, priority: 1 },
        { material_id: "hanja_8", started: today(), active: true, priority: 0 },
        { material_id: "ss_reading", started: today(), active: true, priority: 0 },
        { material_id: "instrument_practice", started: today(), active: true, priority: 0 },
    ],
};
function today() {
    return new Date().toISOString().slice(0, 10);
}
