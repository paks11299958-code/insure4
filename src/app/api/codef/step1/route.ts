import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  rsaEncrypt,
  fetchInsuranceList,
  registerCredit4u,
  formatInsuranceData,
  computeBirthDate,
  hashSsn,
  generateCredit4uId,
  generateCredit4uPw,
  TWO_WAY_CODE,
} from '@/lib/codef'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      userName: string
      ssnFront: string
      ssnBack:  string
      phoneNo:  string
      telecom:  string
    }
    const { userName, ssnFront, ssnBack, phoneNo, telecom } = body

    if (!userName?.trim())
      return NextResponse.json({ error: '이름을 입력해 주세요.' }, { status: 400 })
    if (!ssnFront || ssnFront.length !== 6)
      return NextResponse.json({ error: '주민등록번호 앞 6자리를 확인해 주세요.' }, { status: 400 })
    if (!ssnBack || ssnBack.length !== 7)
      return NextResponse.json({ error: '주민등록번호 뒤 7자리를 확인해 주세요.' }, { status: 400 })
    if (!phoneNo?.trim())
      return NextResponse.json({ error: '휴대폰 번호를 입력해 주세요.' }, { status: 400 })

    const ssnHash   = hashSsn(ssnFront, ssnBack)
    const identity  = rsaEncrypt(`${ssnFront}${ssnBack}`)
    const birthDate = computeBirthDate(ssnFront, ssnBack[0])
    const kstNow    = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })

    console.log('[step1] 요청 수신 (KST):', kstNow, '/ userName:', userName.trim())

    let account = await prisma.credit4uAccount.findUnique({ where: { ssnHash } })

    // ── 계정 없음 → 회원가입 1차 ──
    if (!account) {
      const newId = generateCredit4uId()
      const newPw = generateCredit4uPw()

      console.log('[step1] credit4u 회원가입 시도:', newId)

      const regResult = await registerCredit4u({
        id:       newId,
        password: newPw,
        identity,
        userName: userName.trim(),
        phoneNo:  phoneNo.replace(/-/g, ''),
        telecom:  telecom ?? '0',
        birthDate,
      })

      console.log('[step1] 회원가입 응답:', JSON.stringify(regResult, null, 2))

      const regContinue = regResult.data?.continue2Way as boolean | undefined
      if (regResult.result.code === TWO_WAY_CODE && regContinue) {
        return NextResponse.json({
          requiresTwoWay: true,
          isRegister: true,
          twoWayInfo: {
            jobIndex:        regResult.data.jobIndex,
            threadIndex:     regResult.data.threadIndex,
            jti:             regResult.data.jti,
            twoWayTimestamp: regResult.data.twoWayTimestamp,
            credit4uId:      newId,
            credit4uPw:      newPw,
            phoneNo,
            telecom,
          },
        })
      }

      if (regResult.result.code !== '0000') {
        return NextResponse.json(
          { error: decodeURIComponent(regResult.result.message ?? '회원가입에 실패했습니다.'), code: regResult.result.code },
          { status: 502 },
        )
      }

      account = await prisma.credit4uAccount.create({
        data: { ssnHash, credit4uId: newId, credit4uPw: newPw },
      })
    }

    // ── 계정 있음 → 보험 조회 1차 ──
    console.log('[step1] 보험 조회 시도:', account.credit4uId)

    const result = await fetchInsuranceList({
      userName: userName.trim(),
      identity,
      birthDate,
      id:       account.credit4uId,
      password: account.credit4uPw,
    })

    console.log('[step1] 보험 조회 응답:', JSON.stringify(result, null, 2))

    const continue2Way = result.data?.continue2Way as boolean | undefined
    if (result.result.code === TWO_WAY_CODE && continue2Way) {
      return NextResponse.json({
        requiresTwoWay: true,
        isRegister: false,
        twoWayInfo: {
          jobIndex:        result.data.jobIndex,
          threadIndex:     result.data.threadIndex,
          jti:             result.data.jti,
          twoWayTimestamp: result.data.twoWayTimestamp,
          credit4uId:      account.credit4uId,
          credit4uPw:      account.credit4uPw,
        },
      })
    }

    if (result.result.code !== '0000') {
      const msg = decodeURIComponent(result.result.message ?? '보험 조회에 실패했습니다.')
      if (msg.includes('회원가입')) {
        await prisma.credit4uAccount.delete({ where: { ssnHash } })
        return NextResponse.json(
          { error: '보험 조회 계정이 만료되었습니다. 다시 한 번 시도해 주세요.', code: result.result.code },
          { status: 502 },
        )
      }
      return NextResponse.json({ error: msg, code: result.result.code }, { status: 502 })
    }

    const text     = formatInsuranceData(result.data, userName.trim())
    const fileName = `내보험_${userName.trim()}_${new Date().toISOString().slice(0, 10)}.txt`
    return NextResponse.json({ text, fileName })

  } catch (e) {
    console.error('[step1]', e)
    const msg = e instanceof Error ? e.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
