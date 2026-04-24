# 송홈스쿨관리앱 — 프로젝트 작업 문서

> 이 문서 하나로 작업을 재개할 수 있도록 정리됨. 새 세션에서 Claude에게 `D:\gdrive_esc\GTI\Ghez-School\song-homeschool-app\PROJECT.md` 를 읽어달라고 하면 컨텍스트가 그대로 복원됨.

**최종 업데이트**: 2026-04-24
**현재 상태**: Phase A + A.5 + B1(배포·Firebase) 완료. Phase B2-게임화(아바타·몬스터·랭킹) 대기

**라이브 URL**: https://seongsongaframe-debug.github.io/song-homeschool-app/
**GitHub 리포**: https://github.com/seongsongaframe-debug/song-homeschool-app
**Firebase 프로젝트**: `song-homeschool` (Spark 무료 티어, asia-northeast3)

> **일상 작업 로그는 `WORKLOG.md` 참조.** 이 파일은 아키텍처·설계 레퍼런스 (변경 빈도 낮음).

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| **프로젝트명** | 송홈스쿨관리앱 |
| **대상 아이** | 송세인(초4), 송혜인(초2) — **남매** |
| **사용자** | 세인, 혜인, 보호자 |
| **플랫폼** | 웹 + 태블릿 (PWA) |
| **데이터 저장** | v1: localStorage / v2: Google Drive (어댑터 교체) |
| **프로젝트 폴더** | `D:\gdrive_esc\GTI\Ghez-School\song-homeschool-app\` |
| **작업 메모리** | `C:\Users\a\.claude\projects\D--gdrive-esc-GTI\memory\project_homeschool_app.md` |

**Why**: 보호자가 두 남매의 홈스쿨링을 체계적으로 관리하면서, 소위 '대치키즈' 수준의 학습 성취도를 벤치마크로 삼아 가정에서 적용할 수 있는 커리큘럼을 운영하기 위함.

---

## 2. 의사결정 로그

### 2-1. 커리큘럼 설계 (2026-04-23)

| # | 결정 | 사유 |
|---|---|---|
| 1 | 수학: **현행 심화 먼저** (디딤돌 최상위 정답률 80%+ 달성 후 선행) | 대치 평균(5-2까지 선행) 맹목 추종 X. 완성도 우선. |
| 2 | 영어: **AR 지수 기준** 레벨업 관리 | 자유 독서량만 기록은 X. 정량적 진전 트래킹. |
| 3 | 체험·리서치: **독립 메뉴**로 분리 | 일지 통합 X. 프로젝트성 활동(주제→가설→자료→결론) 별도 관리. |
| 4 | 보호자 리포트: **일일 요약** | 주간·월간 X. 매일 마크다운 자동 생성. |

### 2-2. 게임화 (2026-04-23)

| # | 결정 | 사유 |
|---|---|---|
| 1 | 보호자 모드: **PIN 4자리 잠금** | 아이가 보호자 모드 못 열게. SHA-256 해시. |
| 2 | 포인트: **5/10/20p + 스트릭(연속×2p, 최대 20p) + 완주 30p** | 난이도와 일관성 모두 보상. |
| 3 | 보상 구매: **보호자 승인 후 차감** | 부정 방지. Pending → Approved 시점에 ledger 음수 기록. |
| 4 | "오늘" 화면: **퀘스트 보드로 완전 대체** | 교재 진도는 커리큘럼 메뉴로 이동. |
| 5 | Phase 분할: **A(이번)·B(다음)** | A 동작 검증 후 B 진행. |
| 6 | 포켓몬 IP: **이모지 기반 몬스터 도감으로 대체** | 저작권 회피. |

### 2-3. 기술 스택

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Routing**: react-router-dom v6
- **PWA**: manifest.webmanifest (서비스워커는 미설정, 향후 추가)
- **저장소 추상화**: `StorageAdapter` 인터페이스 (v1 LocalStorageAdapter)
- **다크모드**: Tailwind `darkMode: "class"` + 시스템 자동감지

---

## 3. 아키텍처

### 3-1. 폴더 구조

```
song-homeschool-app/
├── PROJECT.md                  ← 이 파일 (작업 재개 가이드)
├── README.md                   ← 사용자/개발자 문서
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── index.html                  ← FOUC 방지 인라인 테마 스크립트 포함
├── public/
│   ├── manifest.webmanifest
│   └── icon.svg
└── src/
    ├── main.tsx                ← 엔트리
    ├── App.tsx                 ← 라우팅 + 역할별(보호자/아이) 네비
    ├── types.ts                ← 도메인 타입 (확장 시 여기 수정)
    ├── index.css               ← Tailwind + 컴포넌트 클래스(.card .btn .input)
    │
    ├── components/             ← 재사용 UI
    │   ├── StudentTabs.tsx     ← 세인/혜인 전환 탭
    │   ├── ProgressBar.tsx
    │   ├── MaterialCard.tsx    ← 4가지 진도 타입 카드 (linear/daily_reps/mastery/free)
    │   ├── ThemeToggle.tsx     ← 라이트/다크/시스템 순환
    │   ├── PinPad.tsx          ← 4자리 PIN 키패드 (모달)
    │   ├── AchievementRing.tsx ← 원형 진척률 (퀘스트 보드)
    │   └── PointBurst.tsx      ← +Np 플로팅 애니메이션 (전역 이벤트)
    │
    ├── data/
    │   ├── seed.ts             ← 학생·과목·교재·배정 시드 (확장 포인트)
    │   ├── bootstrap.ts        ← 최초 1회 시드 적용
    │   └── badges.ts           ← 배지 정의 (스트릭/완주/포인트/과목/독서)
    │
    ├── lib/
    │   ├── dates.ts            ← todayISO, fmtKDate, shiftDate
    │   ├── pin.ts              ← SHA-256 PIN 해시/검증
    │   ├── levels.ts           ← 레벨 티어 계산
    │   └── badges.ts           ← gatherStats, evaluateBadges, getEarnedBadges
    │
    ├── pages/
    │   ├── QuestBoard.tsx      ← [아이] 오늘 퀘스트 tick off
    │   ├── ParentQuests.tsx    ← [보호자] 오늘 과제 일괄 입력·배포
    │   ├── Curriculum.tsx      ← 교재 진도·배정 관리
    │   ├── Reading.tsx         ← AR 트래커 (독서 입력·추이·추천 레벨)
    │   ├── Projects.tsx        ← 체험·리서치 프로젝트 (리서치 템플릿 포함)
    │   ├── Report.tsx          ← 일일 요약 (마크다운 자동 생성·복사·저장)
    │   ├── Shop.tsx            ← [아이] 보상 상점·구매 요청
    │   ├── Manage.tsx          ← [보호자] 승인 큐·보상 등록·PIN·초기화
    │   └── Achievements.tsx    ← [아이] 레벨·배지·포인트 내역
    │
    ├── storage/
    │   ├── StorageAdapter.ts   ← 인터페이스 (read/write/list/remove)
    │   ├── LocalStorageAdapter.ts
    │   └── index.ts            ← KEYS 상수 (모든 저장 키 한 곳에)
    │
    └── store/
        ├── DataContext.tsx     ← students/subjects/materials/assignments 전역
        ├── AuthContext.tsx     ← role(parent/child), activeChildId, PIN
        ├── useProgress.ts      ← 교재별 진도 훅
        ├── useDailyLog.ts      ← 일일 학습 로그 훅
        ├── useTheme.ts         ← 테마 상태
        ├── useQuests.ts        ← 퀘스트 CRUD
        ├── usePoints.ts        ← 포인트 ledger + calcStreakBonus, computeStreak
        └── useRewards.ts       ← 보상·구매 CRUD
```

### 3-2. 데이터 모델 (types.ts)

#### 커리큘럼
- `Student`, `Subject`, `Material`(4 progress types), `Assignment`, `Progress`
- `DailyLog`, `ReadingEntry`, `Project`, `DailyReport`

#### 게임화 (Phase A 추가)
- `Quest`, `QuestTemplate`, `PointEntry`, `Reward`, `Purchase`
- `Badge`, `BadgeEarned`, `BadgeCondition`
- `LevelTier` + `LEVEL_TIERS` 상수
- `DIFFICULTY_POINTS = { easy: 5, normal: 10, hard: 20 }`
- `AppRole = "parent" | "child"`, `AuthState`

### 3-3. 진도 타입 4가지 (Material.progress_type)

| type | 용도 | 예시 |
|---|---|---|
| `linear` | 단원·페이지형 | 디딤돌 최상위 4-1 (단원 6개, 각 12항목) |
| `daily_reps` | 매일 반복 | 쎈연산 4학년 (하루 2쪽), 한자 8급 (하루 5자) |
| `mastery` | 정답률 기반 | 평가지 점수 기록 → 평균 80% 시 `unlocks` 발동 |
| `free` | 자유 입력 | AR 독서, 사회·과학 독서 (custom_fields 동적 폼) |

### 3-4. 80% 잠금 해제 로직

`Material.unlocks: ["next_material_id"]` 가 있고:
- linear: 진척률 ≥ 80% → "다음 단계 활성화" 버튼 노출
- mastery: `masteryAvg(attempts) ≥ threshold` → 자동 활성화 (Phase A에서 보강됨)

활성화 시 `assignments[studentId]` 에 자동 추가됨.

### 3-5. 포인트 로직 (usePoints.ts)

- 모든 포인트 변동은 `PointEntry` 로 ledger 에 추가됨 (불변 기록)
- balance = ledger.reduce(delta 합산)
- reason 종류: `quest_complete | streak_bonus | perfect_day | reward_purchase | manual_adjust`
- 퀘스트 체크 해제 시 `undoQuestAndBonuses` 가:
  1. 해당 quest_id 의 ledger 항목 제거
  2. 그 결과 그 날이 더 이상 완주 상태가 아니면 → 같은 날 `perfect_day`/`streak_bonus` 도 함께 회수

### 3-6. 저장 키 규약 (storage/index.ts KEYS)

```
config/students, config/subjects, config/materials, config/assignments
config/rewards, config/badges
auth/pinHash, auth/state
progress/{studentId}/{materialId}
logs/{date}/{studentId}
reading/{studentId}
projects/{studentId}/{projectId}
quests/{studentId}/{date}/{questId}
quest_templates/{studentId}
points/{studentId}/ledger
purchases/{purchaseId}
badges_earned/{studentId}
reports/{date}
```

모든 키는 LocalStorageAdapter 가 `songhs::` 네임스페이스 prefix 자동 추가.

---

## 4. 빌드된 화면 (Phase A 완료)

### 보호자 모드 메뉴
1. **📝 과제 배포** (`/today` → ParentQuests) — 일괄 입력, 교재에서 바로 추가, 템플릿 저장
2. **🗂️ 커리큘럼** — 교재 배정·비활성화, 80% 잠금 해제 표시
3. **🔧 관리** (`/manage`) — PIN 설정, 승인 큐, 보상 등록, 데이터 초기화
4. **📋 일일요약** — 두 아이 합산 마크다운 자동 생성·복사·저장
5. **📚 독서** — AR 트래커 (보호자도 입력 가능)
6. **🔬 프로젝트** — 체험·리서치 프로젝트

### 아이 모드 메뉴
1. **🎯 오늘** (`/today` → QuestBoard) — 성취 링·레벨·스트릭·포인트, 퀘스트 tick off
2. **🏆 성취** (`/achievements`) — 레벨, 배지(11종), 포인트 내역
3. **🏪 상점** — 보상 구매 요청 (보호자 승인 대기)
4. **📚 독서** — AR 입력
5. **🔬 프로젝트** — 본인 프로젝트

### 역할 전환
- 사이드바 하단 / 모바일 헤더 우상단 버튼
- PIN 미설정 시 그냥 진입 (관리에서 PIN 설정 유도)
- PIN 설정 시 PinPad 모달

### 다크모드
- 사이드바 하단 / 모바일 헤더 우상단의 ThemeToggle
- ☀️ → 🌙 → 🖥️ → 순환
- localStorage 저장, FOUC 방지 인라인 스크립트

---

## 5. 시드 데이터 (data/seed.ts)

### 학생
- **세인** (sein, 초4, 파랑 #3b82f6, 👧)
- **혜인** (hyein, 초2, 핑크 #ec4899, 🧒)

> 남매 반영 시 세인/혜인 이모지·색상은 앱 내에서 추후 편집 UI 추가 예정. 현재는 seed 기본값.

### 과목 (6개)
국어 / 수학 / 영어 / 한자 / 사회·과학 / 예체능

### 교재 (12개)
- 수학: 디딤돌 최상위 4-1, 쎈연산 4, 디딤돌 기본 5-1(선행), 디딤돌 초등수학 2-1, 쎈연산 2
- 국어: 뿌리깊은 독해력 4단계/2단계, 책 요약(매일 1건)
- 영어: 영어 원서 다독(AR), Grammar in Use Junior
- 한자: 7급(세인) / 8급(혜인) — 하루 5자
- 사회·과학: 교과 연계 독서
- 예체능: 악기 연습 (하루 20분)

### 배정
세인 9개 / 혜인 8개 자동 배정

### 기본 보상 5개 (Manage 화면 "기본 보상 추가" 버튼)
- 아이스크림 1개 (50p), 닌텐도 30분 (100p), 보드게임 1판 (30p), 외식 메뉴 선택권 (300p), 책 1권 구매 (200p)

### 배지 11종 (data/badges.ts)
- 스트릭: 3일/7일/30일
- 완주의 날: 10회
- 누적 포인트: 500p / 1000p
- 과목별 퀘스트: 수학/국어/영어 각 50회
- 독서: 10권 / 50권

---

## 6. 개발·실행

```bash
cd D:\gdrive_esc\GTI\Ghez-School\song-homeschool-app
npm install      # 최초 1회
npm run dev      # http://localhost:5173 (태블릿: Network 주소)
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 산출물 확인
npx tsc --noEmit # 타입체크
```

### 데이터 리셋
브라우저 DevTools 콘솔에서 `localStorage.clear()` 후 새로고침
또는 Manage 화면의 "전체 데이터 초기화" 버튼

### Tailwind 설정 변경 시
HMR 안 됨 → dev 서버 재시작 필요 (`Ctrl+C` 후 `npm run dev`)

---

## 7. Gemini CLI (테스트·리뷰용)

### 설치 상태
- 설치됨: `npm i -g @google/gemini-cli`
- 인증됨: `C:\Users\a\.gemini\settings.json` (OAuth `oauth-personal`)
- 사용법: `gemini -p "프롬프트"` (비대화형) / `gemini` (대화형)
- 자동 승인: `-y` 플래그 (`--approval-mode yolo` 와 동일)

### Phase A 리뷰 통과 사항
- 보호자 승인 후 포인트 차감 (PASS)
- 완주 보너스 중복 지급 방지 (PASS)
- PIN SHA-256 해시 (PASS)
- 역할 전환 상태 누수 없음 (PASS)
- 배지 평가 무한루프 없음 (PASS)
- **수정 적용**: 퀘스트 체크 해제 시 완주/스트릭 보너스 회수, 스트릭 표시 UX(어제까지 유지)

---

## 8. Phase B (다음 작업) — 미진행

| 기능 | 개요 |
|---|---|
| **아바타 꾸미기** | 얼굴/머리/옷/모자 파츠 조합. 포인트로 언락. 아바타가 퀘스트 보드 상단에 표시. |
| **몬스터 도감** | 이모지 기반 (포켓몬 IP 회피). 알 구매(50p) → 부화 → 먹이로 진화 (🐣→🦊→🐉). 도감 채우기. |
| **남매 랭킹** | 주간 포인트, 퀘스트 완료 수, 스트릭 비교. 친선 경쟁 보드. |

### Phase B 진행 시 작업 순서 제안
1. 아바타 파츠 SVG/이모지 라이브러리 정하기
2. `Avatar` 타입 + storage 키 추가 (`config/avatar/{studentId}`)
3. 아바타 에디터 페이지 (`/avatar`) — 보호자/아이 모두 접근
4. 퀘스트 보드 상단에 아바타 카드 표시
5. 몬스터 데이터셋 (이모지 + 진화 트리 정의)
6. 알 구매 → 알람 큐 → 부화 → 도감 페이지
7. 랭킹 페이지: 주간/누적 비교 보드 + 칭찬 메시지

---

## 9. 향후 과제 (Phase B 이후)

- **Google Drive 어댑터**: `StorageAdapter` 인터페이스 그대로 구현. 가족 공유 폴더로 다중 기기 동기화.
- **사진 업로드**: 프로젝트에 사진 첨부 (Drive 연동 후)
- **학생 프로필 편집 UI**: 이모지·색상·성별·학년 자유 변경 (현재는 seed.ts 직접 수정)
- **학습 시간 트래커**: 퀘스트별 타이머 (시작·일시정지·종료)
- **부모 알림**: 새 구매 요청 시 시각/소리 알림
- **백업/내보내기**: JSON 일괄 내보내기·불러오기

---

## 10. 작업 재개 방법

새 Claude 세션에서:

```
D:\gdrive_esc\GTI\Ghez-School\song-homeschool-app\PROJECT.md 를 읽고 작업 재개해줘.
[원하는 작업 명시: 예) Phase B 아바타부터 시작 / 특정 버그 수정 / 새 기능 추가]
```

이 한 줄이면 컨텍스트 복원됨. 메모리 파일 (`memory/project_homeschool_app.md`) 은 Claude가 자동 로드하므로 별도 지시 불필요.

---

## 11. 참고 리소스 (1부 리서치 출처)

- 한경 [대치동 이야기 ②](https://www.hankyung.com/article/202404178358i)
- 한경 [대치동 이야기 ⑫](https://www.hankyung.com/article/202406287355i)
- 글로리아쌤 [대치동 아이들은 이렇게 공부합니다](https://product.kyobobook.co.kr/detail/S000214157498)
- [디딤돌 초등 교재](https://www.didimdol.co.kr/books/bookinfo.asp?SGroup=2)
- [AR 리딩 레벨 가이드](https://hongbly0401.com/entry/%EC%98%81%EC%96%B4-%EB%A6%AC%EB%94%A9-%EB%A0%88%EB%B2%A8-%EC%A7%80%EC%88%98-AR-SR-%EB%A0%89%EC%82%AC%EC%9D%BC-CEFR-%EC%A7%80%EC%88%98-%EB%9C%BB-ORT-%EB%8B%A8%EA%B3%84%EB%B3%84-AR-%EC%A7%80%EC%88%98-%EB%B9%84%EA%B5%90)
- [서울교육청 학년별 권장도서](https://childlib.sen.go.kr/childlib/board/index.do?menu_idx=158&manage_idx=1332)
- [국립중앙박물관 교육플랫폼 모두](https://modu.museum.go.kr/)
