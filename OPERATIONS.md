# 송홈스쿨 앱 운영 매뉴얼

> 이 문서는 **앱 사용 흐름·운영 규칙** 중심. 아키텍처·설계는 [`PROJECT.md`](./PROJECT.md), 작업 이력은 [`WORKLOG.md`](./WORKLOG.md).
>
> **최종 업데이트**: 2026-05-19

---

## 1. 개요

| 항목 | 값 |
|---|---|
| 대상 | 송세인(초4), 송혜인(초2) 남매 + 보호자 |
| 라이브 URL | https://seongsongaframe-debug.github.io/song-homeschool-app/ |
| GitHub | https://github.com/seongsongaframe-debug/song-homeschool-app |
| Firebase | `song-homeschool` (Spark, Anonymous Auth + Firestore) |
| FAMILY_ID | `song` |
| 학생 ID | `sein`, `hyein` |
| 역할 | 보호자(parent) / 아이(child) — PIN 4자리 분리 |
| 주간 사이클 | **토~금** (이번주 시작 = 토요일) |
| 주간 목표 | **세인 1000p / 혜인 1000p** (보너스·청소 제외) |
| 자동 배포 트리거 | 일요일 첫 앱 로드 시 차주 자동 시드 |

---

## 2. 핵심 개념

### 2-1. 주간 사이클 (토~금)

| 요일 | 보호자 액션 | 아이 액션 |
|---|---|---|
| 토 | 차주 학원 숙제 모음 시작 | 청소·스케이트·여가 |
| 일 | `/weekly-quests` 호출 → 정산 + 차주 배포 | 청소·여가 |
| 월 | 배포된 학원 출석 출현 | 학원 다녀와서 ☐체크 |
| 화~금 | 매일 ⏳확인 대기 큐 처리 | 숙제·출석 체크오프 |

### 2-2. 1000p 룰

- 모든 정규 주간 퀘스트 합 = **1000p / 주 / 아이**
- **합계 제외**: 청소(`🧹`), 보너스(`🎁`), 보너스 단발 미션
- 분배 가중치 가이드:
  - 학원 출석 (자동): 50~60p/회
  - 자율학습 (학원 숙제 개별 항목): 30~80p
  - 눈높이 1/2·2/2: 150~200p
  - 스피킹테스트 등 큰 준비물: 100p+

### 2-3. 역할 분리 (PIN)

- **아이 모드**: 퀘스트 체크오프, 상점, 성취, 도감(몬스터)
- **보호자 모드**: PIN 4자리(SHA-256). 과제 배포, 확인, 보상 승인, 점수 지급/차감, 자동 시드 트리거
- 사이드바 하단 / 모바일 우상단의 🔐 버튼으로 진입

---

## 3. 보호자 운영 (`/manage` 화면)

### 3-1. 퀘스트 확인 대기 (📝 amber 카드)

조건: `status="done" && requires_verification && !verified`

- **✓ 확인**: verify + 포인트 ledger 적립 + 완주/스트릭 보너스 평가
- **다시**: 사유 입력 후 `status="pending"` + `rejectedReason` 세팅 → 아이에게 빨간 칩 노출

### 3-2. 최근 확인 완료 (✅)

실수로 확인 처리한 항목 **↺ 되돌리기** 가능. ledger에서 quest_complete 항목 제거 + 그 날 완주 깨졌으면 perfect/streak 보너스 회수.

### 3-3. 보상 승인 대기 (⏳)

아이가 상점에서 구매 요청한 보상이 여기로. **승인**(포인트 차감 ledger 기록) / **거부** / **수령 완료** 3단계 흐름. `Pending → Approved → Fulfilled`.

### 3-4. 보상 등록 (🎁)

- 제목·이모지·분류(treat/privilege/item/experience)·포인트
- `student_id?` — 비우면 공용, 채우면 해당 학생 전용 상점에만 노출
- `image_url?` — `public/images/rewards/` 에 푸시 후 GitHub Pages 절대 URL 사용
- `source_url?` — 외부 상품 페이지 참고

### 3-5. 직접 포인트 지급/차감 (💰)

`manual_adjust` reason. 칭찬·페널티·동생 챙김 등 즉석 보상. 음수 가능 (차감 시 confirm).

### 3-6. 혜인 주간 과제 자동 부여 (🔁)

수동 트리거 버튼. 일요일 자동 시드 누락 시 사용. 평일이면 이번 주 / 토·일이면 차주.

### 3-7. PIN 관리 / 위험 구역

- PIN 4자리 설정/해제 (SHA-256 해시)
- 전체 데이터 초기화 (모든 quest/ledger/purchases 삭제 + 시드 다시)

### 3-8. 일일요약 (`/report`)

날짜별 두 아이 합산 마크다운. 복사·저장 가능. 보호자에게만 노출.

### 3-9. 과제 배포 (`/today` → ParentQuests)

- 마감일별 그룹화 편집
- 학원 숙제 텍스트 붙여넣기 → `homework-parser.ts` 자동 파싱
- 템플릿 저장·재적용
- 교재에서 바로 추가 (커리큘럼 연동)

---

## 4. 아이 사용 (`/today` → QuestBoard)

### 4-1. 상단 위젯

- **AchievementRing**: 이번 주(토~금) 진척률 (done/total)
- **레벨·티어**: 누적 포인트 기반 7단계 (새싹→탐험가→견습생→학자→마스터→현자→전설)
- **스트릭**: 연속 perfect day 일수
- **포인트 카드**: 오늘 +Np / 어제 +Np / ⏳ 확인 대기 합

### 4-2. 퀘스트 카드 4가지 상태

| 상태 | 표시 | 의미 |
|---|---|---|
| 미완료 (오늘 마감) | 🔥 오늘 마감 칩 | 체크오프 가능 |
| 미완료 (지난 마감) | ⚠️ 지남 칩 | 체크 가능, overdue 표시 |
| 완료 후 확인 대기 | ⏳ 보호자 확인 대기 칩 | 보호자 verify 후 포인트 지급 |
| 반려 | 빨간 "다시 해주세요" + 사유 | 재시도 후 다시 체크 |

### 4-3. 체크오프 방식

- **세부 항목 없는 quest**: 메인 ✓ 버튼 클릭
- **세부 항목(subtasks) 있는 quest**: 각 세부 항목 체크 → 모두 done 시 자동 완료
- **text_response_prompt 있는 quest**: 입력 필요 ("오늘 어디 청소했어?" 등). 비어있으면 체크 안 됨

### 4-4. 청소 (🧹) 특수 룰

매일 자동 생성·만료. "오늘 안 하면 사라져요!" 30p. 다음날 자동 청소 후 새로 생김. 합계 제외.

### 4-5. 보너스 (🎁) 특수 룰

주간 1000p 외 별도. 형제 도와주기 등 일회성 미션. 합계 제외.

### 4-6. 상점 (`/shop`)

본인 전용 + 공용 보상만 노출. 구매 요청 → 보호자 승인 대기. 승인 시 포인트 차감 + 수령 대기.

### 4-7. 성취 (`/achievements`)

- 현재 레벨·다음 티어까지 진척바
- 획득한 배지 (11종+: 스트릭·완주의 날·누적 포인트·과목별 퀘스트·독서)
- 포인트 내역 (ledger 전체)

### 4-8. 도감 (`/dex`)

몬스터 도감 (Phase B). 알 부화·진화. 퀘스트 완료 시 활성 몬스터에 진척 +1.

---

## 5. 자동화 시스템 (`src/lib/auto-quests.ts`)

### 5-1. 일요일 자동 시드 (`maybeAutoSeedAll`)

- 일요일(`getDay()===0`) 앱 첫 로드 시 발동
- 각 학생의 주간 패턴(`HYEIN_WEEKLY`/`SEIN_WEEKLY`)에 따라 차주 7~8건 자동 생성
- 중복 방지: `_autoseed/{sid}/{weekStart}` 플래그 + `weekHasAnyQuest` 체크

### 5-2. 학생별 주간 패턴

**혜인 (`HYEIN_WEEKLY`)**: 피아노 월·화·목 + 미술 수·금 + 스케이트 토 + 눈높이 1/2·2/2 화

**세인 (`SEIN_WEEKLY`)**: 영어학원 월·수·금 + 수학 화·수·목 + 스케이트 토

### 5-3. 일일 청소 (`runDailyCleaningSync`)

- 매일 첫 로드 시 양쪽 아이에게 청소 1건 부여
- `_cleaning/{sid}/{date}` 플래그로 1일 1회만
- "오늘 어디 청소했어?" `text_response_prompt` 필수
- 청소는 합계 제외 (`title.startsWith("🧹 청소")`)

### 5-4. 학원 출석 공통 subtasks (`ACADEMY_SUBTASKS`)

1. 학원 도착, 선생님께 인사
2. 선생님 말씀 집중해서 듣기
3. 오늘 배운 것 1가지 아빠에게 메세지 보내기

---

## 6. 주간 배포 워크플로우 — `/weekly-quests` 스킬

### 6-1. 호출

- 슬래시: `/weekly-quests` (차주) / `/weekly-quests YYYY-MM-DD` (특정 주)
- 자연어: "주간 과제 배포", "차주 과제 세팅"

### 6-2. 4 Phase

1. **Phase 1 정산** — 지난주 ✓확인·⏳대기·↺반려·○미완 분류 후 보호자 결정 (일괄 확인 / 회수 / 부분 인정)
2. **Phase 2 학원 숙제 수집** — 보호자가 학원별 텍스트 붙여넣기. Claude가 파싱
3. **Phase 3 자동 부여 + 1000p 분배** — 자동 패턴 + 수동 통합. autoSeedFlag 세팅
4. **Phase 4 주간 프로젝트** (선택) — 체험·리서치 1건 등록
5. **Phase 5 검증·보고** — 양쪽 1000p 합 확인

### 6-3. 산출물

- `scripts/deploy-week-{YYYY-MM-DD}.mjs` — 1회성 배포 스크립트 (커밋)
- `scripts/diag-week-{YYYY-MM-DD}.mjs` — 임시 진단 (커밋 X)
- 콘솔 보고 (Phase 5 형식)

### 6-4. 알려진 함정

1. **자동 시드 중복**: 일요일 시드 후 deploy 시 7건 정도 중복 발생. 직후 dedup 진단 필수
2. **점수 불일치**: `auto-quests.ts` 패턴 (100p/200p) vs deploy 스크립트 (60p/150p). cleanup 시 `assigned_date≠TODAY` 우선 삭제
3. **system 날짜 stale**: system-reminder 날짜와 실제 날짜 불일치 가능. 스샷 timestamp / 사용자 헤더 날짜로 cross-check
4. **헤더 = 받은 날, 마감 = +7일**: 학원 숙제 텍스트의 "5.18 월" = 그날 받은 숙제

---

## 7. 보상 시스템

### 7-1. 포인트 ledger (`points/{sid}/ledger`)

모든 포인트 변동은 불변 항목으로 append. balance = ledger.reduce(delta 합산).

| reason | 의미 |
|---|---|
| quest_complete | 퀘스트 verify 시 +N |
| streak_bonus | 연속 perfect day 보너스 |
| perfect_day | 그날 마감 quest 모두 done +30 |
| reward_purchase | 보상 승인 시 -N |
| manual_adjust | 보호자 직접 ±N |

### 7-2. 보상 종류 (`Reward.kind`)

`treat` (간식) / `privilege` (특권) / `item` (아이템) / `experience` (경험)

### 7-3. 구매 흐름

`Pending` → 보호자 승인 → `Approved` (포인트 차감 ledger) → 수령 → `Fulfilled`

또는 `Pending` → 거부 → `Rejected` (포인트 변동 없음).

### 7-4. 기본 보상 5종 (Manage "기본 보상 추가" 버튼)

아이스크림(50p), 닌텐도30분(100p), 보드게임1판(30p), 외식 메뉴 선택권(300p), 책 1권(200p)

---

## 8. 게임화

### 8-1. 레벨 (LEVEL_TIERS, `src/types.ts`)

| Lv | 누적 | 칭호 |
|---|---|---|
| 1 | 0+ | 🌱 새싹 |
| 2 | 100+ | 🔍 탐험가 |
| 3 | 300+ | 📖 견습생 |
| 4 | 600+ | 🎓 학자 |
| 5 | 1000+ | ⭐ 마스터 |
| 6 | 1500+ | 🧙 현자 |
| 7 | 2500+ | 👑 전설 |

### 8-2. 배지 11+종 (`data/badges.ts`)

- 스트릭 3일/7일/30일
- 완주의 날 10회
- 누적 500p / 1000p
- 과목별 (수학/국어/영어 각 50회)
- 독서 10권 / 50권

### 8-3. 스트릭·완주 보너스

- **Perfect day**: 오늘 마감 quest 모두 done → +30p
- **Streak**: N일 연속 perfect → calcStreakBonus(N) (연속×2p, 최대 20p)

### 8-4. 몬스터 도감 (Phase B, `/dex`)

알 구매 (50p) → 부화 → 진화 (🐣→🦊→🐉). 퀘스트 완료 시 활성 몬스터에 진척 +1. 도감 채우기.

---

## 9. 데이터 모델 (요점)

전체는 `src/types.ts` 참조. 핵심:

```
config/students, subjects, materials, assignments, rewards, badges
auth/pinHash, state
quests/{sid}/{qid}              ← 평탄화 (날짜 디렉토리 없음)
points/{sid}/ledger             ← append-only
purchases/{pid}
badges_earned/{sid}
reports/{date}
reading/{sid}, projects/{sid}/{pid}
monsters/{sid}                  ← Phase B
_autoseed/{sid}/{weekStart}     ← 주간 시드 플래그
_cleaning/{sid}/{date}          ← 일일 청소 플래그
```

**Quest 모델 v2 (2026-04-25 이후)**: `date` 제거 → `assigned_date` + `due_date` 분리.

---

## 10. 트러블슈팅

### 10-1. "확인 대기 4건"인데 Manage 큐에 안 보임

원인: 한 번 ↺반려됐다가 재완료된 quest의 `rejectedReason` 잔류.

해결 (이미 패치됨, 2026-04-26): Manage 큐 필터에서 `!rejectedReason` 제거 + QuestBoard.completeQuest에서 `rejectedReason: undefined` 세팅.

### 10-2. 자동 시드 중복

deploy 직후 `diag-{sid}-this-week-detail.mjs` 실행 → 동일 due_date+title 그룹화. `assigned_date≠TODAY`인 항목(주말 자동 시드분) 삭제.

### 10-3. 1000p 합 안 맞음

검산 출력에서 N0p 단위 오차. 한두 항목 미세조정 (예: 라이팅 30→50p). 분배 표에서 직접 더해 검증.

### 10-4. 라이브 반영 안 됨

코드 변경 → push → GitHub Actions 빌드 (~2분). 그래도 안 보이면 Ctrl+Shift+R 강력 새로고침.

### 10-5. 데이터 손실 우려 (전체 초기화)

`Manage → 위험 구역 → 전체 데이터 초기화` 클릭 전 반드시 진단 스크립트로 백업/스냅샷 확보. ledger·purchases 복구 불가.

### 10-6. 청소 quest 안 보임

`runDailyCleaningSync()` 가 매일 첫 로드 시 동작. 안 보이면 `_cleaning/{sid}/{today}` 플래그가 이미 있는지 확인. 수동 삭제 후 재로드.

---

## 11. 스크립트 인벤토리 (`scripts/`)

### 11-1. 주간 배포

- `deploy-week-{YYYY-MM-DD}.mjs` — 해당 주차 1회성 배포 (수동 + 자동 + autoSeedFlag)
- 가장 최신: `deploy-week-2026-05-18.mjs`

### 11-2. 정리·수정

- `cleanup-week-{YYYY-MM-DD}-dups.mjs` — 자동 시드 중복 제거
- `fix-{학생}-{원인}-{날짜}.mjs` — 점수·날짜·필드 보정
- `rebalance-week.mjs` — 매칭 룰 기반 점수 재배분

### 11-3. 진단 (보통 untracked)

- `diag-{학생}-week-{YYYY-MM-DD}.mjs` — 주간 합·상태 분류
- `diag-{학생}-pending-verify.mjs` — 확인 대기 후보
- `diag-{학생}-ledger.mjs` — ledger 덤프

### 11-4. 보상·기타

- `add-reward.mjs`, `add-sein-rewards.mjs`, `update-pokemon-images.mjs`
- `migrate-to-today.mjs`, `update-student-emojis.mjs`

모든 스크립트 패턴:
```js
import { initializeApp } from "firebase/app";
import { signInAnonymously, getAuth } from "firebase/auth";
import { initializeFirestore, collection, doc, setDoc/getDocs, query, where } from "firebase/firestore";

const FAMILY_ID = "song";
const MAX_CHAR = String.fromCharCode(0xf8ff);
function encodeKey(k) { return k.replace(/\//g, "__").replace(/\s/g, "_"); }

// Firestore 경로: families/{FAMILY_ID}/kv/{encodedKey}
// 문서 구조: { key, value, updatedAt }
```

---

## 12. 인프라·배포

### 12-1. 빌드·실행

```bash
cd D:\gdrive_esc\GTI\Ghez-School\song-homeschool-app
npm install      # 최초 1회
npm run dev      # localhost:5173 (태블릿: Network 주소)
npm run build    # 프로덕션
npx tsc --noEmit # 타입체크
```

### 12-2. 배포

- `main` 푸시 → GitHub Actions 자동 빌드 → Pages 배포 (~2분)
- 워크플로우: `.github/workflows/deploy.yml`
- 자동 푸시 규칙: 메모리 `feedback_auto_push.md` — 빌드 통과 시 확인 없이 push

### 12-3. Firebase

- 프로젝트: `song-homeschool` (Spark 무료)
- Region: `asia-northeast3`
- Auth: Anonymous
- 컬렉션 구조: `families/{FAMILY_ID}/kv/{encodedKey}`
- Firestore 보안 룰: 가족 단위 접근

### 12-4. 환경변수

- `VITE_USE_LOCAL=1` → LocalStorage 어댑터 (오프라인 개발용)
- 기본 → FirebaseAdapter

### 12-5. 홈/사무실 PC 분리

- 양쪽 모두 `D:\gdrive_esc\` Google Drive 동기화 폴더 공유
- 어느 쪽에서 push 해도 동일 라이브 URL 배포
- 동시 편집 금지 (Drive sync 충돌). PC 교체 전 sync 완료 확인

---

## 13. 진화 포인트·TODO

### 13-1. 미해결

- **홈런 자동 부여**: 사용자 요청에 포함됐으나 스케줄 미확정. 다음 `/weekly-quests` 호출 시 확인 후 `auto-quests.ts` 패턴 추가
- **세인 5/25 마감 4건 0p**: 차주 호출 시 1000p 분배에서 점수 확정
- **auto-quests.ts vs deploy 스크립트 점수 불일치**: 자동 시드(100p/200p) vs 수동 deploy(60p/150p). 통일 필요

### 13-2. 기능 후보

- 사진 업로드 (프로젝트 첨부)
- 학생 프로필 편집 UI (현재 seed.ts 직접 수정)
- 학습 시간 트래커 (퀘스트별 타이머)
- 부모 알림 (새 구매 요청 시 알림음)
- 백업/내보내기 (JSON 일괄)
- Quest에 image_url 필드 (학원 워크시트 첨부)
- Google Drive 어댑터 (가족 외 공유)

### 13-3. 운영 자동화

- 일요일 저녁 자동 `/weekly-quests` 트리거 (현재 수동)
- 매주 일요일 일일요약 자동 슬랙/카톡 전송
- 보상 승인 알림

---

## 14. 빠른 참조 — 자주 쓰는 명령

| 작업 | 방법 |
|---|---|
| 주간 배포 | `/weekly-quests` |
| 빌드 검증 | `npm run build` (자동 push) |
| 데이터 진단 | `node scripts/diag-{학생}-week-{날짜}.mjs` |
| 보상 추가 | Manage → 🎁 + 보상 등록 / `scripts/add-reward.mjs` |
| 점수 즉시 지급 | Manage → 💰 직접 지급 |
| 자동 시드 수동 트리거 | Manage → 🔁 지금 채우기 |
| PIN 변경 | Manage → 🔐 해제 후 재설정 |
| 데이터 백업 | Firestore 콘솔 또는 진단 스크립트로 덤프 |

---

## 15. 관련 문서

- [`PROJECT.md`](./PROJECT.md) — 아키텍처·설계 결정·기술 스택 (stable)
- [`WORKLOG.md`](./WORKLOG.md) — 일자별 작업 이력
- [`README.md`](./README.md) — 사용자/개발자 진입점
- 스킬: `~/.claude/skills/weekly-quests/SKILL.md`
- 메모리: `~/.claude/projects/D--gdrive-esc-GTI/memory/project_homeschool_app.md`
