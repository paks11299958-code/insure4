import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import {
  getCodefToken,
  rsaEncrypt,
  fetchInsuranceList,
  formatInsuranceData,
  REAUTH_CODES,
} from '@/lib/codef'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'secret')

export async function POST(req: NextRequest) {
  try {
    // ── 1. 로그인 사용자 확인 (optional — 비로그인도 조회 가능, 단 connected_id 저장 안 됨) ──
    let userId: number | null = null
    const cookie = req.cookies.get('token')?.value
    if (cookie) {
      try {
        const { payload } = await jwtVerify(cookie, JWT_SECRET)
        userId = payload.id as number
      } catch { /* 비로그인 허용 */ }
    }

    // ── 2. 요청 파라미터 파싱 ──
    const { userName, ssnFront, ssnBack } = await req.json() as {
      userName:  string
      ssnFront:  string
      ssnBack:   string
    }

    if (!userName?.trim()) {
      return NextResponse.json({ error: '이름을 입력해 주세요.' }, { status: 400 })
    }
    if (!ssnFront || ssnFront.length !== 6) {
      return NextResponse.json({ error: '주민등록번호 앞 6자리를 확인해 주세요.' }, { status: 400 })
    }
    if (!ssnBack || ssnBack.length !== 7) {
      return NextResponse.json({ error: '주민등록번호 뒤 7자리를 확인해 주세요.' }, { status: 400 })
    }

    // ── 3. Codef OAuth 토큰 발급 ──
    const codefToken = await getCodefToken()

    // ── 4. DB에서 connected_id 조회 (재방문 사용자) ──
    let connectedId: string | undefined
    if (userId) {
      const info = await prisma.userCodefInfo.findUnique({ where: { userId } })
      connectedId = info?.connectedId ?? undefined
    }

    // ── 5. RSA 암호화 (주민등록번호는 암호화 후 즉시 폐기) ──
    const identity = rsaEncrypt(`${ssnFront}${ssnBack}`)

    // ── 6. 보험 조회 API 호출 ──
    const result = await fetchInsuranceList(codefToken, {
      userName: userName.trim(),
      identity,
      connectedId,
    })

    // ── 7. 에러 분기 ──
    if (result.result.code !== '0000') {
      // connected_id 만료 → DB에서 삭제 후 재인증 요청
      if (REAUTH_CODES.has(result.result.code)) {
        if (userId) {
          await prisma.userCodefInfo.deleteMany({ where: { userId } })
        }
        return NextResponse.json(
          { error: 'REAUTH_REQUIRED', message: '인증이 만료되었습니다. 정보를 다시 입력해 주세요.' },
          { status: 401 },
        )
      }
      return NextResponse.json(
        { error: result.result.message || '보험 조회에 실패했습니다.', code: result.result.code },
        { status: 502 },
      )
    }

    // ── 8. connected_id 저장 (최초 조회 시 응답에 포함됨) ──
    const returnedConnectedId = result.data?.connectedId as string | undefined
    if (returnedConnectedId && userId) {
      await prisma.userCodefInfo.upsert({
        where:  { userId },
        create: { userId, connectedId: returnedConnectedId },
        update: { connectedId: returnedConnectedId, lastSyncAt: new Date() },
      })
    }

    // ── 9. 보험 데이터를 텍스트로 포맷해 반환 ──
    const text     = formatInsuranceData(result.data, userName.trim())
    const fileName = `내보험_${userName.trim()}_${new Date().toISOString().slice(0, 10)}.txt`

    return NextResponse.json({ text, fileName })

  } catch (e) {
    console.error('[codef/import]', e)
    const msg = e instanceof Error ? e.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
