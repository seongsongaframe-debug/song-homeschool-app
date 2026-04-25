# 송홈스쿨관리앱 — 작업로그

## 현재 상태
- **단계**: 세인 20건 + 혜인 8건 = 각 1000p. 양쪽 모두 미래 마감만 (overdue 없음).
- **마지막 작업**: 2026-04-25 · 혜인 수학 3건 삭제 + 4/21 overdue 6건 → 4/28로 이동 + 점수 재배분.
- **다음 할 일**: 매주 토요일 — 눈높이 + 학원 숙제 재배포 (`deploy-noonopi.mjs` + 학원별 텍스트 붙여넣기).

## 📌 핵심 관리 정보 (Reference)

### 접속·관리 URL
| 용도 | URL |
|---|---|
| 🎯 **앱 라이브** | https://seongsongaframe-debug.github.io/song-homeschool-app/ |
| 📦 GitHub 리포 | https://github.com/seongsongaframe-debug/song-homeschool-app |
| 🔄 배포 현황 (Actions) | https://github.com/seongsongaframe-debug/song-homeschool-app/actions |
| 🔥 Firebase 콘솔 | https://console.firebase.google.com/project/song-homeschool |
| 🗂️ Firestore 데이터 | https://console.firebase.google.com/project/song-homeschool/firestore |
| 🛡️ Firestore 규칙 | https://console.firebase.google.com/project/song-homeschool/firestore/rules |
| 🔐 Authentication | https://console.firebase.google.com/project/song-homeschool/authentication/providers |
| ⚙️ GitHub Pages 설정 | https://github.com/seongsongaframe-debug/song-homeschool-app/settings/pages |

### 로컬 경로
| 용도 | 경로 |
|---|---|
| 프로젝트 루트 | `D:\gdrive_esc\GTI\Ghez-School\song-homeschool-app\` |
| 소스 | `D:\gdrive_esc\GTI\Ghez-School\song-homeschool-app\src\` |
| 스크립트 | `D:\gdrive_esc\GTI\Ghez-School\song-homeschool-app\scripts\` |
| 작업 재개 문서 | `D:\gdrive_esc\GTI\Ghez-School\song-homeschool-app\PROJECT.md` |
| 작업 로그 (이 파일) | `D:\gdrive_esc\GTI\Ghez-School\song-homeschool-app\WORKLOG.md` |
| Claude 메모리 | `C:\Users\a\.claude\projects\D--gdrive-esc-GTI\memory\project_homeschool_app.md` |

### 계정·환경
| 항목 | 값 |
|---|---|
| GitHub 사용자 | `seongsongaframe-debug` |
| git 작성자 | `seongsong-debug` <`seongsong.aframe@gmail.com`> |
| Firebase 프로젝트 ID | `song-homeschool` |
| Firebase 요금제 | Spark (무료) |
| Firestore 리전 | `asia-northeast3` (서울) |
| Firebase 인증 | Anonymous (익명 로그인) |
| 앱 내 가족 ID | `song` (Firestore `families/song/kv` 하위) |
| PWA 설치 가능 | Yes — 태블릿 홈화면 추가 |
| 기본 진입 모드 | 아이 모드 (PIN 입력 시 보호자 전환) |

### Firestore 데이터 구조
```
families/
  └── song/
        └── kv/
              ├── config__students        # 학생 목록
              ├── config__subjects        # 과목 목록
              ├── config__materials       # 교재 목록
              ├── config__assignments     # 배정
              ├── config__rewards         # 보상 목록
              ├── auth__pinHash           # PIN SHA-256 해시
              ├── quests__{sid}__{date}__{qid}   # 개별 퀘스트
              ├── quest_templates__{sid}  # 보호자 저장 템플릿
              ├── points__{sid}__ledger   # 포인트 원장
              ├── purchases__{pid}        # 보상 구매 요청
              ├── badges_earned__{sid}    # 획득 배지
              └── reports__{date}         # 일일 요약 저장본
```

### Firestore 보안 규칙 (권장)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /families/{familyId}/kv/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```
⚠️ 테스트 모드로 생성된 상태면 2026-05-24경 만료. 위 규칙으로 교체 필요.

### 자주 쓰는 스크립트
| 스크립트 | 용도 |
|---|---|
| `scripts/deploy-homework.mjs` | 텍스트 붙여넣기 방식으로 퀘스트 자동 배포 (파서 기반) |
| `scripts/deploy-homework-batch.mjs` | 수동 구성 배포 (여러 아이·날짜 한번에) |
| `scripts/migrate-to-today.mjs` | 과거 배포 퀘스트를 오늘로 이관 + due_date 설정 |
| `scripts/fix-sein-merged.mjs` | 특정 이상 퀘스트 분리 (일회성) |

실행: `cd D:\gdrive_esc\GTI\Ghez-School\song-homeschool-app && node scripts/<파일>.mjs`

---

## 최근 작업 이력

| 날짜 | 작업 | 산출물 / 커밋 |
|------|------|--------|
| 2026-04-25 | **혜인 weekly 정리** — 혜인 수학 3건 삭제 (혜인은 수학 숙제 없음). 4/21 마감으로 overdue 였던 6건(파닉스 4 + 브릭스리딩 2) → 4/28로 이동. 1000p 재배분: 파닉스 4 × 100p + 브릭스리딩 2 × 100p + 눈높이 2 × 200p = 1000p. | `scripts/fix-hyein-week.mjs` |
| 2026-04-25 | **체크박스 UX + 보상 이미지 + 4/27 마감일 정정** — (a) QuestCard 좌측 큰 원형이 미완료 시 빈 ✓ 체크박스로 보이게 (subject 아이콘은 메타 라인으로 이동) → 서브태스크 없는 카드도 명확히 클릭 가능. (b) `Reward.image_url` / `source_url` 필드 추가, Shop 카드에 실제 상품 이미지 표시, Manage 편집기에 두 입력 추가. SSG 메탈카드봇 이미지 적용. (c) 세인 영어학원 6건 due_date 4/20→4/27 이동(20일은 발급일이고 실제 마감은 그 다음 주 같은 요일). (d) 영어학원 추가로 세인 weekly 14→20건이 되어 1000p 재배분 (영어학원 250 + 눈높이 100 + 능률보카 110 + 영문학당 본문 260 + 영문학당 3과 210 + 수학 70 = 1000). | `src/types.ts` · `src/pages/{QuestBoard,Shop,Manage}.tsx` · `scripts/rebalance-week.mjs` |
| 2026-04-25 | **학생별 보상 + 메탈카드봇 등록** — `Reward.student_id?` 필드 추가, Shop 학생 한정 필터, Manage 보상 편집기에 "대상 학생" 셀렉트(공용/세인 전용/혜인 전용). 메탈카드봇 플레타Z (토이하우스, 정가 31,730원) 혜인 전용 3000p 등록. | `src/types.ts` · `src/pages/{Shop,Manage}.tsx` · `scripts/add-reward.mjs` |
| 2026-04-25 | **주간 1000p 배포 체계** — 세인 14개·혜인 5개로 각 1000p 정확 분배. 세인: 영어학원 4/29 이관·5건 점수 갱신, 영문학당 3과 5/1 마감 4건 신규, 눈높이 50p, 수학(월·수·목) 30/40/50p. 혜인: 눈높이 200p, 수학 200p×3. 검증 출력으로 각 1000p 합 확인. | `scripts/deploy-week-1000p.mjs` |
| 2026-04-25 | **눈높이 주간 숙제 배포** — 매주 화요일 마감, 분량 절반씩 1/2 + 2/2 두 항목. 세인·혜인 각 2개 (총 4개) 배포. 다음 마감일 자동 계산(`nextTuesday`). 초기 실행 시 UTC 변환 버그로 due_date 가 월요일(04-27)로 잘못 들어가 `fix-noonopi-due.mjs` 로 04-28 정정. 다음 주부턴 동일 스크립트 재실행만 하면 다음 화요일 자동 산출. | `scripts/deploy-noonopi.mjs` · `scripts/fix-noonopi-due.mjs` |
| 2026-04-25 | **Quest 모델 v2 (배포일 ≠ 마감일, 마감 전까지 계속 노출)** — 기존 `Quest.date` 제거, `assigned_date`(배포일) + `due_date`(마감일) 두 필드로 분리. Storage 경로도 `quests/{sid}/{qid}` 로 평탄화. 새 헬퍼 `quest-eval.ts` 의 `classifyQuests` 로 4-버킷(overdue/dueToday/upcoming/done) 분류. QuestBoard·ParentQuests·Manage 모두 새 모델로 마이그레이션. 기존 데이터는 `migrate-quests.ts` 가 첫 로드 시 자동 변환. Perfect day 평가도 due_date 기준으로 변경. 홈 PC ↔ 사무실 PC 분리 배포 구조 메모리에 기록. | `src/types.ts` · `src/storage/index.ts` · `src/store/{DataContext,useQuests}.ts` · `src/lib/{migrate-quests,quest-eval,homework-parser}.ts` · `src/pages/{QuestBoard,ParentQuests,Manage}.tsx` |
| 2026-04-24 | **학생 이모지 성별 반영** — 세인(남) 👧→👦, 혜인(여) 🧒→👧. seed.ts 수정 + Firestore `config/students` 즉시 업데이트. | `scripts/update-student-emojis.mjs` · `src/data/seed.ts` |
| 2026-04-24 | **Firestore undefined 필드 거부 수정 + 아이 취소 UI** — `rejectQuest`/`verifyQuest` 가 `{completedAt: undefined}` 같은 객체를 쓰면 Firestore 가 throw 해서 '다시 보내기' 가 조용히 실패하던 문제. `initializeFirestore(app, { ignoreUndefinedProperties: true })` 로 전역 해결. 추가로 아이 화면 완료 카드에 "↺ 취소" 버튼 명시화, 보호자 검증 후엔 🔒 락 아이콘 + 취소 불가. | `src/firebase.ts` · `src/pages/QuestBoard.tsx` |
| 2026-04-24 | **하드 리프레시 빈 화면 수정** — `/manage` 등 하위 경로에서 Ctrl+Shift+R 누르면 빈 화면. 404 → `?p=/xxx` 리다이렉트 복원 시 `history.replaceState` 가 basename 없는 절대경로로 덮어써 React Router 매칭 실패. `window.location.pathname` 에서 basename 을 추출해 앞에 붙이도록 수정. | `17d4c7c` · `index.html` |
| 2026-04-24 | **다시 거부 버그 수정** — 보호자 관리의 "다시" 버튼이 `window.prompt()` 사용 → PWA·일부 브라우저에서 차단되어 거부 처리 안 되던 문제. 커스텀 모달(textarea + 취소/다시 보내기 버튼)로 교체. | `5eff7d3` · `src/pages/Manage.tsx` |
| 2026-04-24 | **due_date 분리** — `date`(오늘 표시용) ≠ `due_date`(학원 마감일) 로 필드 분리. QuestCard·Manage·ParentQuests에 마감일 배지 추가. 붙여넣기 파서의 파싱된 날짜는 자동으로 due_date에 매핑. | `5d5c298` · `src/types.ts` · `src/pages/{QuestBoard,ParentQuests,Manage}.tsx` |
| 2026-04-24 | **숙제 배포 3건** — 세인 4/20(영어학원 5개), 혜인 4/21(파닉스 4 + 브릭스리딩 2), 세인 4/22(능률보카 2 + 영문학당 3). 총 16건. 모두 보호자 확인 후 포인트 지급 모드. | `scripts/deploy-homework.mjs`, `scripts/deploy-homework-batch.mjs` |
| 2026-04-24 | **오늘로 이관** — 위 3건을 모두 오늘(4/24) 날짜로 옮기고 원 날짜를 due_date로 저장. 파서 버그로 합쳐진 `text writing/11과 워크북` 수동 분리. | `scripts/migrate-to-today.mjs`, `scripts/fix-sein-merged.mjs` |
| 2026-04-24 | **Phase B1 배포** — Firebase(Anonymous Auth + Firestore) + GitHub Pages. `FirebaseAdapter` 작성, base path 조정, `404.html` SPA 리다이렉트. GitHub Actions 자동 배포 워크플로우. | `.github/workflows/deploy.yml` · `src/firebase.ts` · `src/storage/FirebaseAdapter.ts` |
| 2026-04-24 | **Phase A.5 숙제 모듈** — 학원 숙제 붙여넣기 파서, 서브태스크 tick off, 보호자 검증 큐. `requires_verification` 플래그 → 아이 tick 시 포인트 보류, 보호자 "확인 ✓" 시 지급. "다시" 시 사유 입력 + 보너스 회수. | `src/lib/homework-parser.ts` · `src/pages/{ParentQuests,QuestBoard,Manage}.tsx` |
| 2026-04-23 | **Phase A 게임화** — PIN 4자리(SHA-256), 역할 기반 네비(보호자/아이), 퀘스트 일괄 배포·템플릿, 포인트 ledger(난이도 5/10/20 + 스트릭 + 완주 30), 배지 11종, 레벨 7단계, 보상 상점(보호자 승인 후 차감). | Phase A 초기 커밋 (배포 전 로컬) |
| 2026-04-23 | **다크모드** — Tailwind `darkMode: "class"`, `useTheme`(라이트/다크/시스템 순환), FOUC 방지 인라인 스크립트. | `src/store/useTheme.ts` · `src/components/ThemeToggle.tsx` |
| 2026-04-23 | **앱 v1 초기 빌드** — 5개 메뉴(오늘/커리큘럼/영어독서/프로젝트/일일요약), 4가지 진도 타입(linear/daily_reps/mastery/free), 80% 잠금 해제, AR 트래커, 리서치 템플릿. Gemini 리뷰 PASS. | Vite + React + TS + Tailwind |
| 2026-04-23 | **커리큘럼 리서치** — 대치키즈 초2·초4 학습 내용·방법 조사 → 세인·혜인 적용안 설계. 현행심화 우선·AR기반·체험 독립 메뉴·일일요약으로 결정. | 대화 로그 |

## 열린 이슈

### 1. 아이 화면 — 날짜 탐색 부재
- 현재 QuestBoard는 오늘 날짜(todayISO)로 고정. 아이가 내일·어제 퀘스트를 직접 볼 방법 없음.
- 대안: ◀/▶ 버튼 / 주간 뷰 / 예정 섹션 중 택 필요.
- 우선순위: **중**

### 2. 숙제 파서 — 섹션 헤더 다음 줄 처리
- `그래머 / 11과 워크북 풀기` 처럼 섹션 헤더 직후 번호 없는 줄이 오면 직전 퀘스트 제목에 이어붙여짐.
- 수정안: `lastWasSection` 플래그 도입 → section 이후 첫 content 라인은 새 퀘스트로.
- 위치: `src/lib/homework-parser.ts` · `scripts/deploy-homework.mjs` 동일 로직
- 우선순위: **중** (현재는 수동 분리로 우회)

### 3. 보안 — 가족 외 접근 차단
- 현재 URL 알면 누구나 익명 로그인 → 가족 데이터 접근 가능 (Firestore 규칙이 `request.auth != null` 만 체크).
- 대안 A: 앱 진입 시 가족 passphrase 검증 후 저장 경로 분기
- 대안 B: Google OAuth 화이트리스트
- 우선순위: **중** (URL이 외부 공유되지 않으면 실질 노출 낮음)

### 4. Firestore 규칙 테스트 모드
- 프로젝트 초기에 "테스트 모드"로 생성됨 → 30일 후(약 2026-05-24) 자동 거부.
- 권장 규칙 제안함: `allow read, write: if request.auth != null;` — 아직 게시 안 됐을 수 있음.
- 위치: Firebase 콘솔 → Firestore → 규칙
- 우선순위: **높음** (시한 있음)

### 5. Phase B2 — 게임화 레이어 대기
- 아바타 꾸미기 (얼굴/머리/옷/모자 파츠 조합 + 포인트 언락)
- 몬스터 도감 (이모지 기반, 포켓몬 IP 대체. 알 구매 → 부화 → 진화)
- 남매 랭킹 (주간 포인트·퀘스트 완료수·스트릭 경쟁 보드)
- 우선순위: **낮음** (실사용 피드백 후 착수)

### 6. 학생 프로필 편집 UI
- 현재 `seed.ts` 직접 수정으로만 세인/혜인 이모지·색상 변경 가능.
- 앱에서 편집 가능하도록 관리 화면에 추가 필요.
- 우선순위: **낮음**

## 로깅 규칙
- 작업 1건 완료 시 **최근 작업 이력** 표에 한 줄 추가
- 문제·결정 유보 발생 시 **열린 이슈** 에 기록
- **현재 상태 / 마지막 작업 / 다음 할 일** 3줄을 매번 최신화
- 상세 설계·아키텍처는 `PROJECT.md` 참조
