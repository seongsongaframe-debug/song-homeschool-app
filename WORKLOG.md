# 송홈스쿨관리앱 — 작업로그

## 현재 상태
- **단계**: Phase A + A.5 + B1(배포·Firebase) 완료. 실제 숙제 3건 이관 완료.
- **마지막 작업**: 2026-04-24 · due_date 필드 도입 + 배포 숙제 16건(세인 11 + 혜인 6) 오늘로 이관
- **다음 할 일**: 아이들 PWA 설치 후 실사용 피드백 수집 → Phase B2(아바타·몬스터·랭킹) 기획 보정

## 링크
- **라이브**: https://seongsongaframe-debug.github.io/song-homeschool-app/
- **리포**: https://github.com/seongsongaframe-debug/song-homeschool-app
- **Firebase**: https://console.firebase.google.com/project/song-homeschool
- **Actions**: https://github.com/seongsongaframe-debug/song-homeschool-app/actions

## 최근 작업 이력

| 날짜 | 작업 | 산출물 / 커밋 |
|------|------|--------|
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
