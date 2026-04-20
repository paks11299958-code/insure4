import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
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
  TwoWayAuthData,
} from '@/lib/codef'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'secret')

export async function POST(req: NextRequest) {
  try {
    // ── 1. 로그인 사용자 확인 (선택) ──
    const cookie = req.cookies.get('token')?.value
    if (cookie) {
      try { await jwtVerify(cookie, JWT_SECRET) } catch { /* 비로그인 허용 */ }
    }

    // ── 2. 요청 파라미터 파싱 ──
    const body = await req.json() as {
      userName:    string
      ssnFront:    string
      ssnBack:     string
      phoneNo?:    string
      telecom?:    string
      twoWayData?: TwoWayAuthData & { credit4uId?: string; credit4uPw?: string; phoneNo?: string; telecom?: string; isRegister?: boolean }
    }
    const { userName, ssnFront, ssnBack, phoneNo, telecom, twoWayData } = body

    if (!twoWayData) {
      if (!userName?.trim())
        return NextResponse.json({ error: '이름을 입력해 주세요.' }, { status: 400 })
      if (!ssnFront || ssnFront.length !== 6)
        return NextResponse.json({ error: '주민등록번호 앞 6자리를 확인해 주세요.' }, { status: 400 })
      if (!ssnBack || ssnBack.length !== 7)
        return NextResponse.json({ error: '주민등록번호 뒤 7자리를 확인해 주세요.' }, { status: 400 })
    }

    // ── 3. 2차 요청 (SMS 인증) ──
    if (twoWayData) {
      const { credit4uId, credit4uPw, phoneNo: tw_phone, telecom: tw_telecom, isRegister, ...twoWayInfo } = twoWayData

      // 회원가입 2차 인증
      if (isRegister) {
        const newId = credit4uId!
        const newPw = credit4uPw!
        const regResult = await registerCredit4u({
          id: newId, password: newPw,
          identity: '', userName: userName?.trim() ?? '',
          phoneNo: tw_phone ?? '', telecom: tw_telecom ?? '',
          birthDate: '', twoWayData: twoWayInfo,
        })
        console.log('[codef/import] 회원가입 2차 응답:', JSON.stringify(regResult, null, 2))

        const contType = regResult.data?.continue2Way as boolean | undefined
        if (regResult.result.code === TWO_WAY_CODE && contType) {
          return NextResponse.json({
            requiresTwoWay: true, isRegister: true,
            twoWayInfo: { ...regResult.data, credit4uId: newId, credit4uPw: newPw, phoneNo: tw_phone, telecom: tw_telecom },
          })
        }
        if (regResult.result.code !== '0000') {
          const msg = regResult.result.code === 'CF-01004'
            ? 'SMS 인증 시간이 초과되었습니다. 다시 시도해 주세요.'
            : decodeURIComponent(regResult.result.message ?? '회원가입 인증 실패')
          return NextResponse.json({ error: msg, code: regResult.result.code, timeout: regResult.result.code === 'CF-01004' }, { status: 502 })
        }
        // 회원가입 완료 → DB 저장 후 계약조회로 진행
        const ssnHash2 = hashSsn(ssnFront, ssnBack)
        await prisma.credit4uAccount.upsert({
          where: { ssnHash: ssnHash2 },
          create: { ssnHash: ssnHash2, credit4uId: newId, credit4uPw: newPw },
          update: { credit4uId: newId, credit4uPw: newPw },
        })
        const identity2 = rsaEncrypt(`${ssnFront}${ssnBack}`)
        const birthDate2 = computeBirthDate(ssnFront, ssnBack[0])
        const result2 = await fetchInsuranceList({ userName: userName.trim(), identity: identity2, birthDate: birthDate2, id: newId, password: newPw })
        console.log('[codef/import] 계약조회(가입후):', JSON.stringify(result2, null, 2))
        if (result2.result.code !== '0000') {
          return NextResponse.json({ error: decodeURIComponent(result2.result.message ?? '조회 실패'), code: result2.result.code }, { status: 502 })
        }
        const text2 = formatInsuranceData(result2.data, userName.trim())
        return NextResponse.json({ text: text2, fileName: `내보험_${userName.trim()}_${new Date().toISOString().slice(0, 10)}.txt` })
      }

      // 계약조회 2차 인증
      const result = await fetchInsuranceList({
        userName: userName?.trim() ?? '',
        identity: '',
        birthDate: '',
        id:       credit4uId ?? '',
        password: credit4uPw ?? '',
        twoWayData: twoWayInfo,
      })

      console.log('[codef/import] 2차 응답:', JSON.stringify(result, null, 2))

      const continue2Way = result.data?.continue2Way as boolean | undefined
      if (result.result.code === TWO_WAY_CODE && continue2Way) {
        return NextResponse.json({
          requiresTwoWay: true,
          twoWayInfo: {
            jobIndex:        result.data.jobIndex,
            threadIndex:     result.data.threadIndex,
            jti:             result.data.jti,
            twoWayTimestamp: result.data.twoWayTimestamp,
            credit4uId,
            credit4uPw,
          },
          extraInfo: result.data.extraInfo ?? {},
          method:    result.data.method,
        })
      }

      if (result.result.code !== '0000') {
        const msg = result.result.code === 'CF-01004'
          ? 'SMS 인증 시간이 초과되었습니다. 다시 시도해 주세요.'
          : decodeURIComponent(result.result.message ?? '인증에 실패했습니다.')
        return NextResponse.json(
          { error: msg, code: result.result.code, timeout: result.result.code === 'CF-01004' },
          { status: 502 },
        )
      }

      const text     = formatInsuranceData(result.data, userName?.trim() ?? '')
      const fileName = `내보험_${userName?.trim()}_${new Date().toISOString().slice(0, 10)}.txt`
      return NextResponse.json({ text, fileName })
    }

    // ── 4. 1차 요청 — SSN 해시로 credit4u 계정 조회 ──
    const ssnHash   = hashSsn(ssnFront, ssnBack)
    const identity  = rsaEncrypt(`${ssnFront}${ssnBack}`)
    const birthDate = computeBirthDate(ssnFront, ssnBack[0])

    let account = await prisma.credit4uAccount.findUnique({ where: { ssnHash } })

    // ── 5. 계정 없으면 자동 회원가입 ──
    if (!account) {
      if (!phoneNo?.trim())
        return NextResponse.json({ error: '휴대폰 번호를 입력해 주세요.' }, { status: 400 })

      const newId = generateCredit4uId()
      const newPw = generateCredit4uPw()

      console.log('[codef/import] credit4u 회원가입 시도:', newId)

      const regResult = await registerCredit4u({
        id:        newId,
        password:  newPw,
        identity,
        userName:  userName.trim(),
        phoneNo:   phoneNo.replace(/-/g, ''),
        telecom:   telecom ?? '0',
        birthDate,
      })

      console.log('[codef/import] 회원가입 응답:', JSON.stringify(regResult, null, 2))

      // 회원가입 중 SMS 추가인증 필요
      const regContinue = regResult.data?.continue2Way as boolean | undefined
      if (regResult.result.code === TWO_WAY_CODE && regContinue) {
        // SMS 발송 직후 DB에 미리 저장 — 재시도 시 동일 계정 재사용
        await prisma.credit4uAccount.upsert({
          where:  { ssnHash },
          create: { ssnHash, credit4uId: newId, credit4uPw: newPw },
          update: { credit4uId: newId, credit4uPw: newPw },
        })
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
          extraInfo: regResult.data.extraInfo ?? {},
          method:    regResult.data.method,
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

    // ── 6. 계약정보 조회 ──
    const result = await fetchInsuranceList({
      userName: userName.trim(),
      identity,
      birthDate,
      id:       account.credit4uId,
      password: account.credit4uPw,
    })

    console.log('[codef/import] 1차 응답:', JSON.stringify(result, null, 2))

    // ── 7. 추가인증 필요 분기 ──
    const continue2Way = result.data?.continue2Way as boolean | undefined
    if (result.result.code === TWO_WAY_CODE && continue2Way) {
      return NextResponse.json({
        requiresTwoWay: true,
        twoWayInfo: {
          jobIndex:        result.data.jobIndex,
          threadIndex:     result.data.threadIndex,
          jti:             result.data.jti,
          twoWayTimestamp: result.data.twoWayTimestamp,
          credit4uId:      account.credit4uId,
          credit4uPw:      account.credit4uPw,
        },
        extraInfo: result.data.extraInfo ?? {},
        method:    result.data.method,
      })
    }

    // ── 8. 에러 분기 ──
    if (result.result.code !== '0000') {
      return NextResponse.json(
        { error: decodeURIComponent(result.result.message ?? '보험 조회에 실패했습니다.'), code: result.result.code },
        { status: 502 },
      )
    }

    // ── 9. 성공 ──
    const text     = formatInsuranceData(result.data, userName.trim())
    const fileName = `내보험_${userName.trim()}_${new Date().toISOString().slice(0, 10)}.txt`
    return NextResponse.json({ text, fileName })

  } catch (e) {
    console.error('[codef/import]', e)
    const msg = e instanceof Error ? e.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
