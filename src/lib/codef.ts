/**
 * src/lib/codef.ts
 * 코드에프(CODEF) API 클라이언트 모듈
 *
 * 환경변수 (.env.local):
 *   CODEF_CLIENT_ID      - 코드에프 클라이언트 ID
 *   CODEF_CLIENT_SECRET  - 코드에프 클라이언트 시크릿
 *   CODEF_PUBLIC_KEY     - RSA 공개키 (Base64, 코드에프 대시보드에서 발급)
 *   CODEF_API_BASE       - (선택) 기본값: https://sandbox.codef.io
 */
import crypto from 'crypto'

// 샌드박스 / 운영 전환은 환경변수로 제어
const API_BASE = process.env.CODEF_API_BASE ?? 'https://sandbox.codef.io'
const TOKEN_URL = 'https://oauth.codef.io/oauth/token'

export interface CodefResult {
  code: string
  message: string
  extraMessage?: string
}

export interface CodefResponse {
  result: CodefResult
  data: Record<string, unknown>
}

/** ── 1. OAuth2 액세스 토큰 발급 ── */
export async function getCodefToken(): Promise<string> {
  const clientId     = process.env.CODEF_CLIENT_ID
  const clientSecret = process.env.CODEF_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('CODEF_CLIENT_ID / CODEF_CLIENT_SECRET 환경변수가 설정되지 않았습니다.')
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=read',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Codef 토큰 발급 실패: ${res.status} - ${err}`)
  }

  const json = await res.json()
  return json.access_token as string
}

/** ── 2. RSA PKCS1 v1.5 암호화 (주민번호·비밀번호 암호화에 사용) ── */
export function rsaEncrypt(plainText: string): string {
  const pubKeyBase64 = process.env.CODEF_PUBLIC_KEY
  if (!pubKeyBase64) {
    throw new Error('CODEF_PUBLIC_KEY 환경변수가 설정되지 않았습니다.')
  }

  // Base64 → PEM 형식 변환
  const body = pubKeyBase64.replace(/\s/g, '').match(/.{1,64}/g)!.join('\n')
  const pem  = `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`

  const encrypted = crypto.publicEncrypt(
    { key: pem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(plainText, 'utf8'),
  )
  return encrypted.toString('base64')
}

/** ── 3. Codef API 공통 호출 ── */
export async function callCodefApi(
  token: string,
  path: string,
  body: Record<string, unknown>,
): Promise<CodefResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()

  // Codef는 URL-encoded JSON을 반환하는 경우가 있음
  try {
    return JSON.parse(decodeURIComponent(text)) as CodefResponse
  } catch {
    return JSON.parse(text) as CodefResponse
  }
}

/** ── 4. 내보험다보여 조회 ── */
export async function fetchInsuranceList(
  token: string,
  params: {
    userName:    string
    identity:    string   // RSA 암호화된 주민등록번호 (앞6+뒤7)
    connectedId?: string  // 재방문 시 DB에서 가져온 ID
  },
): Promise<CodefResponse> {
  const body: Record<string, unknown> = {
    organization: '0000',    // 전체 보험사 통합 조회
    loginType:    '0',       // 0: 공동인증서 (샌드박스 기본값)
    userName:     params.userName,
    identity:     params.identity,
  }

  if (params.connectedId) {
    body.connectedId = params.connectedId
  }

  // ⚠️ 엔드포인트는 코드에프 계정의 API 신청 현황에 따라 달라질 수 있습니다.
  // 샌드박스 내보험다보여 경로: /v1/kr/insurance/public/p/myins/list
  return callCodefApi(token, '/v1/kr/insurance/public/p/myins/list', body)
}

/** ── 5. 재인증이 필요한 에러 코드 목록 ── */
export const REAUTH_CODES = new Set([
  'CF-03002', // Connected ID 만료
  'CF-03003', // 인증 정보 불일치
  'CF-04004', // 세션 만료
])

/** ── 6. 보험 데이터 → 텍스트 포맷 ── */
export function formatInsuranceData(data: Record<string, unknown>, userName: string): string {
  const list = (data?.resList ?? []) as Record<string, string>[]

  const header = [
    `[내보험다보여 조회 결과]`,
    `조회일시: ${new Date().toLocaleString('ko-KR')}`,
    `피보험자: ${userName}`,
    `총 ${list.length}건 조회`,
    '',
  ].join('\n')

  if (list.length === 0) {
    return header + '조회된 보험 내역이 없습니다.\n'
  }

  const body = list.map((item, i) => [
    `=== 보험 ${i + 1} ===`,
    `보험사    : ${item.resCompanyNm      ?? '-'}`,
    `상품명    : ${item.resProductNm      ?? '-'}`,
    `증권번호  : ${item.resPolicyNo       ?? '-'}`,
    `보험종류  : ${item.resInsType        ?? '-'}`,
    `월납보험료: ${item.resMonthlyPremium
        ? `₩${Number(item.resMonthlyPremium).toLocaleString()}`
        : '-'}`,
    `보험기간  : ${item.resStartDate ?? '-'} ~ ${item.resEndDate ?? '-'}`,
    `납입상태  : ${item.resPaymentStatus  ?? '-'}`,
    `주요보장  : ${item.resCoverageInfo   ?? '-'}`,
    '',
  ].join('\n')).join('\n')

  return header + body
}
