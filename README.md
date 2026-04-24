# 송홈스쿨 (Song Homeschool)

송세인(초4)·송혜인(초2) 자매를 위한 홈스쿨 관리 웹/태블릿 앱.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 산출물 확인
```

태블릿에서 같은 Wi-Fi로 접속: dev 서버 시작 시 표시되는 `Network` 주소 사용.

## 메뉴

1. **오늘** — 아이별 오늘 학습 카드 (과목별 진도 입력)
2. **커리큘럼** — 활성 교재·진도 + 새 교재 배정
3. **영어 독서** — AR 지수 기반 누적·추이 트래커
4. **체험·프로젝트** — 체험·리서치·창작 프로젝트 (리서치 템플릿 포함)
5. **일일 요약** — 두 아이 학습 자동 요약 (마크다운 저장·복사)

## 확장: 과목·교재 추가

코드 수정 없이 데이터만 바꾸면 됩니다.

### 과목 추가
`src/data/seed.ts` → `seedSubjects` 에 객체 1개 추가하면 UI에 자동 등장.

```ts
{ id: "coding", name: "코딩", icon: "💻", color: "#9b59b6", order: 7 }
```

### 교재 추가
`seedMaterials` 에 객체 추가. 진도 방식은 4가지:

| progress_type | 용도 | 필수 필드 |
|---|---|---|
| `linear` | 단원·페이지형 (디딤돌 등) | `structure.units[]` |
| `daily_reps` | 매일 반복 (연산·한자) | `daily_target`, `unit` |
| `mastery` | 정답률 기반 (심화 평가) | `threshold` |
| `free` | 자유 입력 (독서·관찰) | `custom_fields[]` |

`unlocks: ["next_material_id"]` 로 80% 도달 시 다음 교재 자동 활성화.

### 새 아이 추가
`seedStudents` 에 추가 + `seedAssignments` 에 배정. 모든 화면에 탭으로 자동 노출.

> 시드는 최초 1회만 적용됩니다. 변경 후 반영하려면 브라우저에서 `localStorage.clear()` 또는 추후 추가될 "리셋" 버튼.

## 데이터 저장

v1: **localStorage** (브라우저 로컬). `src/storage/StorageAdapter.ts` 인터페이스만 구현하면 다른 백엔드로 교체 가능.

v2 예정: **Google Drive API** 어댑터 (구글 계정 로그인 → 드라이브 폴더에 JSON 저장 → 가족 공유).

## 기술 스택

- React 18 + TypeScript + Vite
- Tailwind CSS
- React Router v6
- PWA (manifest)

## 폴더 구조

```
src/
├── App.tsx                 # 라우팅 + 레이아웃
├── main.tsx                # 엔트리
├── types.ts                # 도메인 타입 (확장 시 여기 수정)
├── components/             # 재사용 UI
│   ├── MaterialCard.tsx    # 진도 타입별 카드 (핵심)
│   ├── ProgressBar.tsx
│   └── StudentTabs.tsx
├── data/
│   ├── seed.ts             # 기본 커리큘럼 (확장 포인트)
│   └── bootstrap.ts        # 최초 시드 적용
├── lib/
│   └── dates.ts
├── pages/
│   ├── Today.tsx
│   ├── Curriculum.tsx
│   ├── Reading.tsx
│   ├── Projects.tsx
│   └── Report.tsx
├── storage/
│   ├── StorageAdapter.ts   # 인터페이스
│   ├── LocalStorageAdapter.ts
│   └── index.ts            # 키 규약
└── store/
    ├── DataContext.tsx     # 전역 데이터 컨텍스트
    ├── useProgress.ts      # 교재별 진도 훅
    └── useDailyLog.ts      # 일일 로그 훅
```
