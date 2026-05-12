/**
 * src/lib/codef.ts
 * 코드에프(CODEF) API 클라이언트 — easycodef-node SDK 기반
 *
 * 환경변수 (.env.local):
 *   CODEF_CLIENT_ID      - 코드에프 클라이언트 ID (데모용)
 *   CODEF_CLIENT_SECRET  - 코드에프 클라이언트 시크릿 (데모용)
 *   CODEF_PUBLIC_KEY     - RSA 공개키 (Base64)
 *   CODEF_SERVICE_TYPE   - (선택) "demo"(기본) | "api" | "sandbox"
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { EasyCodef, EasyCodefConstant, EasyCodefUtil } = require('easycodef-node')

import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// ── 서비스 타입 결정 ─────────────────────────────────────────
const SERVICE_TYPE_MAP: Record<string, number> = {
  api:     EasyCodefConstant.SERVICE_TYPE_API,
  demo:    EasyCodefConstant.SERVICE_TYPE_DEMO,
  sandbox: EasyCodefConstant.SERVICE_TYPE_SANDBOX,
}
const SERVICE_TYPE: number =
  SERVICE_TYPE_MAP[process.env.CODEF_SERVICE_TYPE ?? 'demo'] ??
  EasyCodefConstant.SERVICE_TYPE_DEMO

const EXPIRE_BUFFER_MS = 5 * 60 * 1000
const API_PATH = '/v1/kr/insurance/0001/credit4u/contract-info'

// ── 타입 정의 ──────────────────────────────────────────────────

export interface CodefResult {
  code:          string
  message:       string
  extraMessage?: string
  transactionId?: string
}

export interface CodefResponse {
  result: CodefResult
  data:   Record<string, unknown>
}

export interface TwoWayInfo {
  jobIndex:        number
  threadIndex:     number
  jti:             string
  twoWayTimestamp: number
}

export interface TwoWayAuthData extends TwoWayInfo {
  smsAuthNo?:  string
  secureNo?:   string
  simpleAuth?: string
}

// ── EasyCodef 인스턴스 생성 (DB 캐시 토큰 주입) ───────────────

async function createCodef(): Promise<typeof EasyCodef.prototype> {
  const clientId     = process.env.CODEF_CLIENT_ID     ?? ''
  const clientSecret = process.env.CODEF_CLIENT_SECRET ?? ''
  const publicKey    = process.env.CODEF_PUBLIC_KEY    ?? ''

  if (!clientId || !clientSecret) {
    throw new Error('CODEF_CLIENT_ID / CODEF_CLIENT_SECRET 환경변수가 설정되지 않았습니다.')
  }

  const codef = new EasyCodef()
  codef.setPublicKey(publicKey)

  if (SERVICE_TYPE === EasyCodefConstant.SERVICE_TYPE_API) {
    codef.setClientInfo(clientId, clientSecret)
  } else {
    codef.setClientInfoForDemo(clientId, clientSecret)
  }

  // DB에서 캐시된 토큰 확인 후 인스턴스에 주입 (Vercel 서버리스 대응)
  const cached = await prisma.codefToken.findUnique({ where: { clientId } })
  if (cached) {
    const stillValid = cached.expiresAt.getTime() - Date.now() > EXPIRE_BUFFER_MS
    if (stillValid) {
      codef.setAccessToken(SERVICE_TYPE, cached.accessToken)
    }
  }

  return codef
}

// ── 토큰 DB 저장 ──────────────────────────────────────────────

async function saveToken(codef: typeof EasyCodef.prototype): Promise<void> {
  const clientId    = process.env.CODEF_CLIENT_ID ?? ''
  const accessToken = codef.getAccessToken(SERVICE_TYPE) as string | undefined
  if (!accessToken) return

  const expiresIn = 7 * 24 * 60 * 60  // 코드에프 토큰 유효기간 7일
  const issuedAt  = new Date()
  const expiresAt = new Date(issuedAt.getTime() + expiresIn * 1000)

  await prisma.codefToken.upsert({
    where:  { clientId },
    create: { clientId, accessToken, tokenType: 'Bearer', expiresIn, issuedAt, expiresAt },
    update: { accessToken, issuedAt, expiresAt },
  })
}

// ── RSA 암호화 (SDK EasyCodefUtil 사용) ───────────────────────

export function rsaEncrypt(plainText: string): string {
  const publicKey = process.env.CODEF_PUBLIC_KEY ?? ''
  if (!publicKey) throw new Error('CODEF_PUBLIC_KEY 환경변수가 설정되지 않았습니다.')
  return EasyCodefUtil.encryptRSA(publicKey, plainText) as string
}

// ── 생년월일 변환 ─────────────────────────────────────────────

export function computeBirthDate(ssnFront: string, ssnBackFirst: string): string {
  const century = ['3', '4', '7', '8'].includes(ssnBackFirst) ? '20' : '19'
  return `${century}${ssnFront}`
}

// ── SSN 해시 (원문 저장 금지 — DB 조회 키로만 사용) ───────────

export function hashSsn(ssnFront: string, ssnBack: string): string {
  return crypto.createHash('sha256').update(`${ssnFront}${ssnBack}`).digest('hex')
}

// ── credit4u 계정 자동 생성용 ID/PW 생성 ─────────────────────

export function generateCredit4uId(): string {
  // 영문 소문자+숫자 — credit4u 허용 범위 6~12자, prefix "c4u" 포함 (총 11자)
  return 'c4u' + crypto.randomBytes(4).toString('hex')
}

export function generateCredit4uPw(): string {
  // credit4u 비밀번호: 대문자·소문자·숫자·특수문자 포함, 12자
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower   = 'abcdefghijklmnopqrstuvwxyz'
  const digits  = '0123456789'
  const special = '!@#$%'
  const all     = upper + lower + digits + special

  const pick = (chars: string) => chars[crypto.randomInt(chars.length)]

  // 각 유형 최소 1개 보장
  const required = [pick(upper), pick(lower), pick(digits), pick(special)]
  const rest     = Array.from({ length: 8 }, () => pick(all))

  // Fisher-Yates 셔플
  const combined = [...required, ...rest]
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[combined[i], combined[j]] = [combined[j], combined[i]]
  }
  return combined.join('')
}

// ── credit4u 회원가입 ─────────────────────────────────────────

export async function registerCredit4u(params: {
  id:         string   // 사용자가 사용할 credit4u ID
  password:   string   // 평문 비밀번호 (RSA 암호화 후 전송)
  identity:   string   // RSA 암호화된 주민등록번호
  userName:   string
  phoneNo:    string   // 휴대폰 번호
  telecom:    string   // 통신사 코드 (0:SKT, 1:KT, 2:LGU+, ...)
  birthDate:  string   // YYYYMMDD
  email?:     string   // credit4u 등록용 이메일 (미입력 시 자동 생성)
  twoWayData?: TwoWayAuthData
}): Promise<CodefResponse> {
  const codef = await createCodef()

  let requestParams: Record<string, unknown>

  const email = params.email ?? `${params.id}@naver.com`
  if (params.twoWayData) {
    const { jobIndex, threadIndex, jti, twoWayTimestamp, smsAuthNo, secureNo, simpleAuth } = params.twoWayData
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
      simpleAuth:    simpleAuth ?? '0',
      ...(smsAuthNo ? { smsAuthNo } : {}),
      ...(secureNo  ? { secureNo  } : {}),
    }
  } else {
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
    }
  }

  const raw = await codef.requestProduct(
    '/v1/kr/insurance/0001/credit4u/register',
    SERVICE_TYPE,
    requestParams,
  )
  const result: CodefResponse = typeof raw === 'string' ? JSON.parse(raw) : raw
  await saveToken(codef)
  return result
}

// ── 보험 계약정보 조회 ─────────────────────────────────────────

export async function fetchInsuranceList(params: {
  userName:    string
  identity:    string   // RSA 암호화된 주민등록번호
  birthDate:   string   // YYYYMMDD
  id:          string   // credit4u 포털 ID
  password:    string   // credit4u 포털 비밀번호 (평문, RSA 암호화 후 전송)
  twoWayData?: TwoWayAuthData
}): Promise<CodefResponse> {
  const codef = await createCodef()

  let requestParams: Record<string, unknown>

  if (params.twoWayData) {
    const { jobIndex, threadIndex, jti, twoWayTimestamp, smsAuthNo, secureNo, simpleAuth } = params.twoWayData
    requestParams = {
      organization:  '0001',
      id:            params.id,
      password:      rsaEncrypt(params.password),
      type:          '0',
      userName:      params.userName,
      identity:      params.identity,
      birthDate:     params.birthDate,
      identityEncYn: 'Y',
      is2Way:        true,
      twoWayInfo:    { jobIndex, threadIndex, jti, twoWayTimestamp },
      simpleAuth:    simpleAuth ?? '0',
      ...(smsAuthNo ? { smsAuthNo } : {}),
      ...(secureNo  ? { secureNo  } : {}),
    }
  } else {
    requestParams = {
      organization:  '0001',
      id:            params.id,
      password:      rsaEncrypt(params.password),
      type:          '0',
      userName:      params.userName,
      identity:      params.identity,
      birthDate:     params.birthDate,
      identityEncYn: 'Y',
    }
  }

  const raw = await codef.requestProduct(API_PATH, SERVICE_TYPE, requestParams)
  const result: CodefResponse = typeof raw === 'string' ? JSON.parse(raw) : raw

  // 토큰이 새로 발급됐으면 DB에 저장
  await saveToken(codef)

  return result
}

// ── 추가인증 필요 코드 ────────────────────────────────────────

export const TWO_WAY_CODE = 'CF-03002'

// ── 보험 데이터 → 텍스트 포맷 ─────────────────────────────────

export function formatInsuranceData(data: Record<string, unknown>, userName: string): string {
  const lines: string[] = [
    '[코드에프 보험 계약정보 조회 결과]',
    `조회일시: ${new Date().toLocaleString('ko-KR')}`,
    `피보험자: ${userName}`,
    '',
  ]

  // 실손보험 계약내역
  const actualLoss = (data.resActualLossContractList ?? []) as Record<string, unknown>[]
  if (actualLoss.length > 0) {
    lines.push('=== 실손보험 계약내역 ===')
    actualLoss.forEach((item, i) => {
      lines.push(
        `[${i + 1}] ${item.resInsuranceName ?? '-'} / ${item.resCompanyNm ?? '-'}`,
        `  증권번호: ${item.resPolicyNumber ?? '-'}`,
        `  계약상태: ${item.resContractStatus ?? '-'}`,
        `  보험료:   ${item.resPremium ?? '-'}`,
        `  기간:     ${item.commStartDate ?? '-'} ~ ${item.commEndDate ?? '-'}`,
        '',
      )
    })
  }

  // 정액보험 계약내역
  const flatRate = (data.resFlatRateContractList ?? []) as Record<string, unknown>[]
  if (flatRate.length > 0) {
    lines.push('=== 정액보험 계약내역 ===')
    flatRate.forEach((item, i) => {
      lines.push(
        `[${i + 1}] ${item.resInsuranceName ?? '-'} / ${item.resCompanyNm ?? '-'}`,
        `  증권번호: ${item.resPolicyNumber ?? '-'}`,
        `  계약상태: ${item.resContractStatus ?? '-'}`,
        `  보험료:   ${item.resPremium ?? '-'}`,
        `  기간:     ${item.commStartDate ?? '-'} ~ ${item.commEndDate ?? '-'}`,
        '',
      )
      const coverages = (item.resCoverageLists ?? []) as Record<string, unknown>[]
      if (coverages.length > 0) {
        lines.push('  [보장내역]')
        coverages.forEach(c => {
          lines.push(`    - ${c.resCoverageName ?? '-'}: ${c.resCoverageAmount ?? '-'} (${c.resCoverageStatus ?? '-'})`)
        })
        lines.push('')
      }
    })
  }

  // 저축보험 계약내역
  const savings = (data.resSavingsContractList ?? []) as Record<string, unknown>[]
  if (savings.length > 0) {
    lines.push('=== 저축보험 계약내역 ===')
    savings.forEach((item, i) => {
      lines.push(
        `[${i + 1}] ${item.resInsuranceName ?? '-'} / ${item.resCompanyNm ?? '-'}`,
        `  증권번호: ${item.resPolicyNumber ?? '-'}`,
        `  계약상태: ${item.resContractStatus ?? '-'}`,
        `  보험료:   ${item.resPremium ?? '-'}`,
        `  기간:     ${item.commStartDate ?? '-'} ~ ${item.commEndDate ?? '-'}`,
        '',
      )
    })
  }

  // 자동차보험
  const car = (data.resCarContractList ?? []) as Record<string, unknown>[]
  if (car.length > 0) {
    lines.push('=== 자동차보험 계약내역 ===')
    car.forEach((item, i) => {
      lines.push(
        `[${i + 1}] ${item.resInsuranceName ?? '-'} / ${item.resCompanyNm ?? '-'}`,
        `  차량명:   ${item.commCarName ?? '-'}`,
        `  계약상태: ${item.resContractStatus ?? '-'}`,
        `  기간:     ${item.commStartDate ?? '-'} ~ ${item.commEndDate ?? '-'}`,
        '',
      )
    })
  }

  if (lines.length <= 4) {
    lines.push('조회된 보험 계약내역이 없습니다.')
  }

  return lines.join('\n')
}
