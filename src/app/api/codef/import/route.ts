import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/codef/import
 *
 * 코드에프 API를 통해 내보험 조회 후 PDF로 반환
 *
 * [연동 준비 사항]
 * 1. 코드에프 가입 후 CLIENT_ID, CLIENT_SECRET 발급
 * 2. .env.local에 추가:
 *    CODEF_CLIENT_ID=your_client_id
 *    CODEF_CLIENT_SECRET=your_client_secret
 *    CODEF_PUBLIC_KEY=your_rsa_public_key
 * 3. npm install codef-api-v2 (또는 직접 HTTP 호출)
 * 4. 아래 TODO 주석 구간을 실제 코드에프 API 호출로 교체
 */
export async function POST(req: NextRequest) {
  try {
    const { ssnFront, ssnBack } = await req.json()

    if (!ssnFront || !ssnBack) {
      return NextResponse.json({ error: '주민등록번호를 입력해 주세요.' }, { status: 400 })
    }
    if (ssnFront.length !== 6 || ssnBack.length !== 7) {
      return NextResponse.json({ error: '주민등록번호 형식이 올바르지 않습니다.' }, { status: 400 })
    }

    // ── TODO: 코드에프 API 연동 시작 ──────────────────────────────
    //
    // [Step 1] 코드에프 액세스 토큰 발급
    // const tokenRes = await fetch('https://oauth.codef.io/oauth/token', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //   body: new URLSearchParams({
    //     grant_type: 'client_credentials',
    //     client_id: process.env.CODEF_CLIENT_ID!,
    //     client_secret: process.env.CODEF_CLIENT_SECRET!,
    //   }),
    // })
    // const { access_token } = await tokenRes.json()
    //
    // [Step 2] 주민번호 RSA 암호화 (코드에프 공개키 사용)
    // const crypto = require('crypto')
    // const publicKey = Buffer.from(process.env.CODEF_PUBLIC_KEY!, 'base64').toString()
    // const encryptedSsn = crypto.publicEncrypt(
    //   { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    //   Buffer.from(`${ssnFront}${ssnBack}`)
    // ).toString('base64')
    //
    // [Step 3] 내보험 조회 API 호출 (금융결제원 - 내보험다보여)
    // const apiRes = await fetch('https://api.codef.io/v1/kr/insurance/public/p/myins/list', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     Authorization: `Bearer ${access_token}`,
    //   },
    //   body: JSON.stringify({
    //     organization: '0000',   // 전체 보험사
    //     loginType: '0',         // 인증서 로그인
    //     id: encryptedSsn,
    //   }),
    // })
    // const insuranceData = await apiRes.json()
    //
    // [Step 4] 조회 결과를 PDF로 변환
    // (예: puppeteer, jsPDF, pdfkit 등 사용)
    // const pdfBuffer = await generatePdf(insuranceData)
    //
    // return new NextResponse(pdfBuffer, {
    //   headers: {
    //     'Content-Type': 'application/pdf',
    //     'Content-Disposition': 'attachment; filename="my-insurance.pdf"',
    //   },
    // })
    //
    // ── TODO 끝 ───────────────────────────────────────────────────

    // 연동 전 임시 응답 (개발/테스트용)
    return NextResponse.json(
      { error: '코드에프 API 연동이 아직 설정되지 않았습니다. .env.local에 CODEF_CLIENT_ID, CODEF_CLIENT_SECRET, CODEF_PUBLIC_KEY를 설정해 주세요.' },
      { status: 501 }
    )

  } catch (e) {
    console.error('[codef/import]', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
