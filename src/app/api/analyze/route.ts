import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS_PER_HOUR = parseInt(process.env.RATE_LIMIT_PER_HOUR || '20')

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 3600_000 }); return true }
  if (entry.count >= MAX_REQUESTS_PER_HOUR) return false
  entry.count++
  return true
}

// ── 1단계: 항목 추출용 스키마 ─────────────────────────────
const EXTRACT_SCHEMA = `{
  "policies": [
    {
      "company": "보험사명",
      "product": "상품명",
      "premium": "월보험료(원 단위 숫자, 없으면 0)",
      "items": [
        { "name": "보장항목명(문서 원문 그대로)", "amount": "가입금액(원 단위 숫자)" }
      ]
    }
  ]
}`

// ── 2단계: 중복 분석 결과 스키마 ──────────────────────────
const RESULT_SCHEMA = `{
  "summary": {
    "totalPolicies": 숫자,
    "duplicateCount": 숫자,
    "estimatedMonthlySavings": "월 X~Y만원",
    "riskLevel": "높음|중간|낮음"
  },
  "duplicates": [
    {
      "item": "항목명(짧게)",
      "policies": "보험사A vs 보험사B",
      "coverageA": "A보장내용(짧게)",
      "coverageB": "B보장내용(짧게)",
      "type": "완전중복|부분중복|유사중복",
      "monthlySavings": "월 X만원",
      "severity": "높음|중간|낮음",
      "action": "권고(한줄)"
    }
  ],
  "aiSummary": "요약 2문장",
  "recommendation": "권고 3문장",
  "disclaimer": "이 분석은 참고용입니다. 실제 변경 전 전문가 상담을 권장합니다."
}`

// ── 1단계 시스템 프롬프트 (추출 전용) ─────────────────────
const EXTRACT_SYSTEM = `당신은 보험 문서에서 보장 항목을 정확히 추출하는 AI입니다.
규칙:
1. 반드시 순수 JSON만 출력. 백틱/코드블록 절대 금지.
2. 문서에 명시된 내용만 추출. 추론·유추·창작 절대 금지.
3. 보장항목명은 문서에 기재된 원문 그대로 사용 (임의 변경·요약 금지).
4. 각 보험증권을 하나의 policy 객체로 분리하여 추출.
5. 보험사명과 상품명은 '기본사항' 섹션에서 정확히 읽을 것.
6. 모든 담보 항목을 빠짐없이 추출할 것.`

// ── 2단계 시스템 프롬프트 (비교 분석 전용) ────────────────
const ANALYZE_SYSTEM = `당신은 대한민국 보험 전문 분석 AI입니다.
규칙:
1. 반드시 순수 JSON만 출력. 백틱/코드블록 절대 금지.
2. 모든 문자열 값은 간결하게 (30자 이내 권장).
3. JSON이 완전히 닫힐 때까지 출력 (중간에 끊지 말 것).
4. 중복 판정 기준 (반드시 준수):
   - 두 개 이상의 증권에 동일하거나 매우 유사한 항목명이 존재할 때만 중복으로 판정.
   - 추출된 데이터에 명시된 항목만 사용. 없는 항목 추가 절대 금지.
   - 한쪽 증권에만 있는 항목은 중복이 아님.
5. [사용자 기본 정보]가 제공된 경우 아래 기준으로 반드시 반영:
   - 건강 상태에 따라 관련 보장항목의 severity 조정
   - 예산을 고려하여 해지/유지 권고 우선순위 결정
   - 직업·연령·성별에 따른 보장 필요도 차이 반영
   - recommendation은 사용자 상황에 맞춘 구체적 문장으로 작성`

function getText(msg: Anthropic.Message): string {
  return msg.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()
}

function parseJSON(raw: string) {
  let clean = raw.replace(/```json\n?|```\n?/g, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start !== -1 && end !== -1) clean = clean.slice(start, end + 1)
  try {
    return JSON.parse(clean)
  } catch (e) {
    let fixed = clean
    const quoteCount = (fixed.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) fixed += '"'
    const opens = Array.from(fixed).reduce((acc: string[], c: string) => {
      if (c === '{') acc.push('}')
      if (c === '[') acc.push(']')
      if (c === '}' || c === ']') acc.pop()
      return acc
    }, [])
    fixed += opens.reverse().join('')
    try { return JSON.parse(fixed) }
    catch { throw new Error(`JSON 파싱 실패: ${String(e).slice(0, 100)}`) }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callClaude(messages: any[], system: string, maxTokens = 4096) {
  return client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    system,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any,
  })
}

interface UserInfo { gender?: string; job?: string; health?: string; purpose?: string; budget?: string }

function formatUserInfo(u?: UserInfo): string {
  if (!u) return ''
  const parts: string[] = []
  if (u.gender) parts.push(`성별/연령: ${u.gender}`)
  if (u.job) parts.push(`직업: ${u.job}`)
  if (u.health) parts.push(`건강상태: ${u.health}`)
  if (u.purpose) parts.push(`분석목적: ${u.purpose}`)
  if (u.budget) parts.push(`예산: ${u.budget}`)
  if (parts.length === 0) return ''
  return `\n\n[사용자 기본 정보 — 반드시 반영]\n${parts.join('\n')}`
}

// ── 2단계: 추출된 구조화 데이터로 중복 분석 ──────────────
async function analyzeExtracted(extractedJson: string, userInfo?: UserInfo): Promise<unknown> {
  const msg = await callClaude([{
    role: 'user',
    content: `아래는 각 보험증권별로 추출된 보장항목 데이터입니다.
이 데이터만을 기반으로 중복 보장 항목을 찾아 아래 JSON 형식으로만 응답하세요.
데이터에 없는 항목은 절대 추가하지 마세요.

${RESULT_SCHEMA}
${formatUserInfo(userInfo)}

[추출된 보장항목 데이터]
${extractedJson}`,
  }], ANALYZE_SYSTEM, 4096)
  return parseJSON(getText(msg))
}

// ── PDF 분석: 1단계 추출 → 2단계 비교 ───────────────────
async function analyzeWithPDF(pdfs: { data: string; name: string }[], userInfo?: UserInfo) {
  // 1단계: 각 증권별 항목 추출
  const extractContent = [
    ...pdfs.map(pdf => ({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: pdf.data },
    })),
    {
      type: 'text',
      text: `위 PDF에서 각 보험증권별 보장항목을 아래 JSON 형식으로 추출하세요.
보장항목명은 문서 원문 그대로 사용하고, 누락 없이 모두 추출하세요.

${EXTRACT_SCHEMA}`,
    },
  ]
  const extracted = getText(await callClaude([{ role: 'user', content: extractContent }], EXTRACT_SYSTEM, 8192))

  // 2단계: 추출 결과로 중복 분석
  return analyzeExtracted(extracted, userInfo)
}

// ── 이미지 분석: 1단계 추출 → 2단계 비교 ────────────────
async function analyzeWithImages(
  images: { data: string; mediaType: string }[],
  fileNames: string[],
  userInfo?: UserInfo
) {
  type ImgMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  // 1단계: 이미지에서 항목 추출
  const extractContent = [
    ...images.slice(0, 10).map(img => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: img.mediaType as ImgMediaType, data: img.data },
    })),
    {
      type: 'text' as const,
      text: `위 보험 문서 이미지에서 각 보험증권별 보장항목을 아래 JSON 형식으로 추출하세요.
보장항목명은 문서 원문 그대로 사용하고, 누락 없이 모두 추출하세요.
파일: ${fileNames.join(', ')}

${EXTRACT_SCHEMA}`,
    },
  ]
  const extracted = getText(await callClaude([{ role: 'user', content: extractContent }], EXTRACT_SYSTEM, 8192))

  // 2단계: 추출 결과로 중복 분석
  return analyzeExtracted(extracted, userInfo)
}

// ── 텍스트 분석: 1단계 추출 → 2단계 비교 ────────────────
async function analyzeWithText(text: string, fileNames: string[], userInfo?: UserInfo) {
  // 1단계: 텍스트에서 항목 추출
  const extractMsg = await callClaude([{
    role: 'user',
    content: `아래 보험 문서에서 각 보험증권별 보장항목을 JSON 형식으로 추출하세요.
보장항목명은 문서 원문 그대로 사용하고, 누락 없이 모두 추출하세요.
파일: ${fileNames.join(', ')}

${EXTRACT_SCHEMA}

[문서 내용]
${text.slice(0, 12000)}`,
  }], EXTRACT_SYSTEM, 8192)
  const extracted = getText(extractMsg)

  // 2단계: 추출 결과로 중복 분석
  return analyzeExtracted(extracted, userInfo)
}

// ── Main Handler ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(ip))
    return NextResponse.json({ error: '요청 한도 초과. 1시간 후 재시도하세요.' }, { status: 429 })
  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: '서버 설정 오류: API 키 없음' }, { status: 500 })

  let body: {
    text?: string
    fileNames: string[]
    images?: { data: string; mediaType: string }[]
    pdfs?: { data: string; name: string }[]
    userInfo?: UserInfo
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  try {
    let result
    if (body.pdfs && body.pdfs.length > 0) {
      result = await analyzeWithPDF(body.pdfs, body.userInfo)
    } else if (body.images && body.images.length > 0) {
      result = await analyzeWithImages(body.images, body.fileNames, body.userInfo)
    } else if (body.text && body.text.trim()) {
      result = await analyzeWithText(body.text, body.fileNames, body.userInfo)
    } else {
      return NextResponse.json({ error: '분석할 문서가 없습니다.' }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '알 수 없는 오류'
    console.error('분석 오류:', msg)
    return NextResponse.json({ error: `AI 분석 오류: ${msg}` }, { status: 500 })
  }
}
