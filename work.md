# insure-analyzer 작업 기록

## 프로젝트 기본 정보

| 항목 | 내용 |
|------|------|
| 프로젝트명 | insure-analyzer v1.0.0 |
| 도메인 | https://insure.dbzone.kr |
| GitHub | https://github.com/paks11299958-code/insure4 |
| 배포 | Vercel (master 브랜치 자동 배포) |
| DB | PostgreSQL — GCP VM (34.50.27.95), Docker 컨테이너 (n8n-docker-db-1) |
| DB명 | insure_db |

---

## 기술 스택

| 항목 | 버전 |
|------|------|
| Next.js | 14.2.3 (App Router + TypeScript) |
| React | 18 |
| Tailwind CSS | v4 (CSS-first) |
| DB | PostgreSQL + Prisma v7.7 |
| 인증 | JWT (jose v6) — HttpOnly 쿠키 |
| AI | Claude claude-sonnet-4-20250514 (Anthropic SDK) |
| 파일 업로드 | Vercel Blob |
| 이메일 | Resend API |
| 아이콘 | Lucide React |
| 폰트 | Pretendard / Noto Sans KR |

---

## DB 스키마

```
User            { id, email, password(bcrypt), username, role(USER/ADMIN), createdAt }
Analysis        { id, userId, title, gender, age, job, health, purpose,
                  budget, fileNames, result(JSON), createdAt }
UserCodefInfo   { id, userId(unique), connectedId, lastSyncAt, createdAt }
CodefToken      { id, clientId(unique), accessToken, tokenType, expiresIn,
                  issuedAt, expiresAt, refreshToken, updatedAt }
Credit4uAccount { id, ssnHash(unique/SHA-256), credit4uId, credit4uPw,
                  registeredAt, updatedAt }
```

> **주의:** Prisma로 생성된 테이블은 camelCase 대문자 유지. SQL 쿼리 시 반드시 큰따옴표 사용
> 예: `SELECT * FROM "Credit4uAccount";`

---

## 환경변수

### 로컬 (.env.local)
```
ANTHROPIC_API_KEY
DATABASE_URL=postgresql://insure_user:...@34.50.27.95:5432/insure_db
JWT_SECRET
BLOB_READ_WRITE_TOKEN
RESEND_API_KEY
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ADMIN_SETUP_KEY
CODEF_CLIENT_ID          # 데모 키
CODEF_CLIENT_SECRET      # 데모 키
CODEF_PUBLIC_KEY         # RSA 공개키 (Base64)
CODEF_SERVICE_TYPE=demo
NEXT_PUBLIC_CODEF_ENABLED=true
```

### Vercel (운영)
- 위와 동일하되 `NEXT_PUBLIC_BASE_URL=https://insure.dbzone.kr`
- 초기에 샌드박스 키가 들어가 있어서 **직접 데모 키로 교체함** (2026-05-02)

### 운영 전환 시 변경 필요
```
CODEF_SERVICE_TYPE=api          # demo → api
CODEF_CLIENT_ID                 # 운영 키로 교체
CODEF_CLIENT_SECRET             # 운영 키로 교체
CODEF_PUBLIC_KEY                # 운영 키로 교체
```

---

## 주요 페이지

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 페이지 |
| `/analyze` | 보험 분석 폼 (파일 업로드 + 내보험 가져오기) |
| `/dashboard` | 분석 내역 목록 |
| `/report/[id]` | 분석 결과 상세 리포트 |
| `/login` | 로그인 |
| `/register` | 회원가입 |
| `/forgot-password` | 비밀번호 찾기 |

---

## Codef 내보험 가져오기 — 전체 구현 내용

### 개요
코드에프(Codef) API를 통해 사용자의 보험 계약정보를 자동 조회하는 기능.
`credit4u 내보험다보여` 서비스 연동.

### API 엔드포인트
```
POST /api/codef/step1   — 1차 요청 (회원가입 또는 보험조회 시작)
POST /api/codef/step2   — 2차 요청 (SMS 인증 처리 및 완료)
```

### 인증 흐름

```
[사용자 입력] 이름 + 주민번호 + 전화번호 + 통신사
      ↓
[step1] DB에서 credit4u 계정 조회
      ↓
  계정 없음 → credit4u 회원가입 1차 요청
  계정 있음 → 보험계약조회 1차 요청
      ↓
  CF-03002 응답 (2차 인증 필요)
  → jobIndex, threadIndex, jti, twoWayTimestamp 반환
      ↓
[프론트] SMS 입력창 표시 (step1 로딩 중에 미리 표시)
      ↓
[사용자] SMS 인증번호 입력
      ↓
[step2] SMS코드 + 1차 파라미터 전체 포함하여 2차 요청
      ↓
  성공(0000) → DB 저장 → 보험 목록 반환
```

### 핵심 파일

| 파일 | 역할 |
|------|------|
| `src/lib/codef.ts` | Codef SDK 래퍼. registerCredit4u, fetchInsuranceList 등 |
| `src/app/api/codef/step1/route.ts` | 1차 요청 처리 |
| `src/app/api/codef/step2/route.ts` | 2차 요청 처리 (MAX_LOOPS=10 루프) |
| `src/app/analyze/CodefImportButton.tsx` | 프론트엔드 UI 컴포넌트 |

### DB 캐시 전략
- `Credit4uAccount` 테이블: SSN SHA-256 해시 → credit4u ID/PW 저장
- 동일 주민번호로 재시도 시 DB에서 계정 조회 → 재가입 없이 바로 보험조회
- **저장 시점**: SMS 2차 인증 완전 성공 후에만 저장 (실패 시 저장 안 함)
- 유령계정 방지: "회원가입 필요" 에러 수신 시 DB 자동 삭제 후 재시도 유도

### credit4u 계정 자동 생성 규칙
- **ID**: `c4u` + 랜덤 hex 8자 = 11자 (예: `c4u3a7f2b1c`)
- **PW**: 대문자+소문자+숫자+특수문자 포함, 12자리 랜덤

---

## CF-01004 오류 해결 과정 (핵심 기록)

### 증상
SMS 인증번호를 올바르게 입력해도 즉시 CF-01004 반환.
CF-01004 = "응답 대기시간을 초과하였습니다"

### 원인 추적 과정

**1차 의심: 타이밍 문제**
- twoWayTimestamp를 UTC로 전달해서 KST와 시간 차이가 나는 것 아닌지 의심
- 로그 추가해서 확인 → KST 변환 문제 아님

**2차 의심: 데모 환경 SMS 미발송**
- reqSMSAuthNo: "" 확인 → SMS가 실제로 안 오는 것 의심
- 코드에프 기술지원 문의

**3차: 코드에프 기술지원 1차 답변**
- "데모 환경 정상 동작 중, 트랜잭션 ID 공유 요청"

**4차: 코드에프 기술지원 2차 답변 (진짜 원인)**
> "2차 요청 시 1차 요청 입력부가 누락되어 추가인증이 정상적으로 처리되지 않았습니다"

### 수정 과정 (삽질 포함)

#### 1차 수정 — 불완전 (step2/route.ts)
step2에서 `identity`, `birthDate`를 `rsaEncrypt`/`computeBirthDate`로 생성해서
`registerCredit4u`, `fetchInsuranceList` 함수에 인자로 전달.

→ **여전히 CF-01004 발생.** 이유: 함수에 값을 넘겼지만
`codef.ts` 내부에서 2차 요청 body 빌드 시 그 값을 포함하지 않음.

#### 2차 수정 — 진짜 수정 (codef.ts)

**문제 코드 (수정 전):**
```typescript
// 2차 요청 시 1차 파라미터 전혀 없음
requestParams = {
  organization: '0001',
  is2Way: true,
  twoWayInfo: { jobIndex, threadIndex, jti, twoWayTimestamp },
  smsAuthNo,
  // id, password, identity, birthDate 등 전부 누락!
}
```

**수정 후:**
```typescript
// 2차 요청에 1차 파라미터 전체 포함
requestParams = {
  organization:  '0001',
  id:            params.id,
  password:      rsaEncrypt(params.password),
  identity:      params.identity,
  identityEncYn: 'Y',
  userName:      params.userName,
  phoneNo:       params.phoneNo,
  telecom:       params.telecom,
  birthDate:     params.birthDate,
  email,
  authMethod:    '0',
  is2Way:        true,
  twoWayInfo:    { jobIndex, threadIndex, jti, twoWayTimestamp },
  simpleAuth:    '0',
  smsAuthNo,
}
```

`registerCredit4u`와 `fetchInsuranceList` 두 함수 모두 동일하게 적용.

### 결과
CF-01004 해결. SMS 인증 통과 후 새로운 응답 수신.

---

## 현재 남은 문제 (2026-05-13 기준)

### "이미 가입된 주민등록번호" 오류

**원인:**
CF-01004 테스트 과정에서 1차 등록 요청은 credit4u 서버에 전달됐지만
SMS 인증 실패로 DB 저장이 안 됨 → credit4u 서버에만 계정 존재, 우리 DB에는 없음.

다음 시도 시: DB에 계정 없음 → 신규 등록 시도 → credit4u "이미 등록된 주민번호" 오류.

**해결 방법:**
코드에프 기술지원에 데모 환경에서 해당 주민번호 credit4u 계정 삭제 요청.
또는 다른 주민번호로 테스트.

**관련 코드에프 지원 연락처:** https://developer.codef.io

---

## Vercel 빌드 오류 해결 이력

| 오류 | 원인 | 해결 |
|------|------|------|
| `Can't resolve '@/generated/prisma/client'` | build 스크립트에 `prisma generate` 없음 | `package.json` build를 `"prisma generate && next build"`로 변경 |
| `Block-scoped variable 'identity' used before its declaration` | step2에 `identity` 중복 선언 | 중복 선언 제거 |
| `Type 'unknown' is not assignable to type 'number'` | `regResult.data` 필드가 unknown 타입 | `as { jobIndex: number; ... }` 캐스팅 추가 |
| node_modules 130MB 파일 GitHub 거절 | 과거 커밋에 node_modules 포함됨 | `git filter-branch`로 히스토리 재작성 |
| GitHub Push Protection (API 키 노출) | .env.local이 과거 커밋에 포함됨 | `git filter-branch`로 .env.local 히스토리 제거 |

---

## step1/step2 분리 아키텍처 채택 이유

금융권 표준 패턴. 기존 단일 `/api/codef/import` 엔드포인트를 분리한 이유:
1. Codef 2차 인증이 4~5회 연속 호출 필요 → 분리 시 디버깅 용이
2. step1 로딩 중에 SMS 입력창 미리 표시 → 사용자 입력 준비 시간 확보
3. Vercel 서버리스 함수 타임아웃 대응

---

## 로컬 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# Prisma 클라이언트 재생성 (schema.prisma 변경 후)
npx prisma generate

# DB 마이그레이션
npx prisma db push

# Prisma Studio (DB 조회 GUI)
npx prisma studio
```

---

## GCP VM DB 접속 방법

PostgreSQL이 Docker 컨테이너 안에서 실행 중.

```bash
# GCP VM SSH 접속 후
docker exec -it n8n-docker-db-1 psql -U insure_user -d insure_db

# Credit4uAccount 조회
SELECT * FROM "Credit4uAccount";

# 유령 계정 전체 삭제
DELETE FROM "Credit4uAccount";
```

---

## 디자인 시스템 (Supanova)

- **Double-Bezel 카드**: 3중 중첩 div (그라디언트 border 래퍼 → 내부 배경 → 콘텐츠)
- **스프링 애니메이션**: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- **테마**: White/Light (`#F9FAFB` 배경, `#111827` 텍스트)
- **버튼**: `#111827` (블랙)
- **위험도 색상**: 높음 `#EF4444` / 중간 `#F59E0B` / 낮음 `#22C55E`
- **로고**: `public/logo2.png` (GNB: 32×32, 인증페이지: 56×56, 푸터: 28×28)

---

## 관련 프로젝트

- **golf-analyzer**: `C:\Users\Park\golf\golf-main`
  - insure-analyzer 복사본, DB는 `golf_db` (별도)
  - GCP VM에 golf_db, golf_user 생성 완료
