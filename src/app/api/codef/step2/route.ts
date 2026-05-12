import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  rsaEncrypt,
  fetchInsuranceList,
  registerCredit4u,
  formatInsuranceData,
  computeBirthDate,
  hashSsn,
  TWO_WAY_CODE,
  TwoWayAuthData,
} from '@/lib/codef'

const MAX_LOOPS = 10

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      userName:        string
      ssnFront:        string
      ssnBack:         string
      smsAuthNo:       string
      jobIndex:        number
      threadIndex:     number
      jti:             string
      twoWayTimestamp: number
      credit4uId:      string
      credit4uPw:      string
      isRegister:      boolean
      phoneNo?:        string
      telecom?:        string
    }
    const {
      userName, ssnFront, ssnBack, smsAuthNo,
      jobIndex, threadIndex, jti, twoWayTimestamp,
      credit4uId, credit4uPw, isRegister, phoneNo, telecom,
    } = body

    const kstNow = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    console.log('[step2] 요청 수신 (KST):', kstNow)
    console.log('[step2] smsAuthNo:', smsAuthNo, '/ jti:', jti)
    console.log('[step2] twoWayTimestamp KST:', new Date(twoWayTimestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }), '/ isRegister:', isRegister)

    // 1차 요청 파라미터 (2차 요청에도 모두 포함해야 함)
    const identity  = rsaEncrypt(`${ssnFront}${ssnBack}`)
    const birthDate = computeBirthDate(ssnFront, ssnBack[0])

    // ── 회원가입 2차 루프 ──
    if (isRegister) {
      // 첫 요청: SMS 인증번호 포함
      let twoWayData: TwoWayAuthData = { jobIndex, threadIndex, jti, twoWayTimestamp, smsAuthNo }

      for (let loop = 1; loop <= MAX_LOOPS; loop++) {
        console.log(`[step2] 회원가입 ${loop}차 요청 / twoWayData:`, JSON.stringify(twoWayData))

        const regResult = await registerCredit4u({
          id: credit4uId, password: credit4uPw,
          identity, userName: userName?.trim() ?? '',
          phoneNo: phoneNo ?? '', telecom: telecom ?? '0',
          birthDate, twoWayData,
        })
        console.log(`[step2] 회원가입 ${loop}차 응답:`, JSON.stringify(regResult, null, 2))

        const contType = regResult.data?.continue2Way as boolean | undefined

        // 추가 인증 필요
        if (regResult.result.code === TWO_WAY_CODE && contType) {
          const nextMethod = regResult.data?.method as string | undefined
          console.log(`[step2] continue2Way=true / method=${nextMethod}`)

          // 사용자 SMS 입력 필요 → 프론트엔드로 반환
          if (nextMethod === 'smsAuthNo') {
            return NextResponse.json({
              requiresTwoWay: true, isRegister: true,
              twoWayInfo: {
                jobIndex:        regResult.data.jobIndex,
                threadIndex:     regResult.data.threadIndex,
                jti:             regResult.data.jti,
                twoWayTimestamp: regResult.data.twoWayTimestamp,
                credit4uId, credit4uPw, phoneNo, telecom,
              },
            })
          }

          // 그 외 method → 자동으로 다음 2차 요청 진행
          twoWayData = {
            jobIndex:        regResult.data.jobIndex,
            threadIndex:     regResult.data.threadIndex,
            jti:             regResult.data.jti,
            twoWayTimestamp: regResult.data.twoWayTimestamp,
          }
          continue
        }

        // 에러
        if (regResult.result.code !== '0000') {
          const msg = regResult.result.code === 'CF-01004'
            ? 'SMS 인증 시간이 초과되었습니다. 다시 시도해 주세요.'
            : decodeURIComponent(regResult.result.message ?? '회원가입 인증 실패')
          return NextResponse.json(
            { error: msg, code: regResult.result.code, timeout: regResult.result.code === 'CF-01004' },
            { status: 502 },
          )
        }

        // 회원가입 성공 → DB 저장 후 보험 조회
        console.log('[step2] 회원가입 완료 → DB 저장')
        const ssnHash = hashSsn(ssnFront, ssnBack)
        await prisma.credit4uAccount.upsert({
          where:  { ssnHash },
          create: { ssnHash, credit4uId, credit4uPw },
          update: { credit4uId, credit4uPw },
        })

        const identity  = rsaEncrypt(`${ssnFront}${ssnBack}`)
        const birthDate = computeBirthDate(ssnFront, ssnBack[0])
        const result2   = await fetchInsuranceList({
          userName: userName.trim(), identity, birthDate,
          id: credit4uId, password: credit4uPw,
        })
        console.log('[step2] 계약조회(가입후):', JSON.stringify(result2, null, 2))

        if (result2.result.code !== '0000') {
          return NextResponse.json(
            { error: decodeURIComponent(result2.result.message ?? '조회 실패'), code: result2.result.code },
            { status: 502 },
          )
        }

        const text2     = formatInsuranceData(result2.data, userName.trim())
        const fileName2 = `내보험_${userName.trim()}_${new Date().toISOString().slice(0, 10)}.txt`
        return NextResponse.json({ text: text2, fileName: fileName2 })
      }

      return NextResponse.json({ error: '최대 인증 횟수를 초과했습니다. 다시 시도해 주세요.' }, { status: 502 })
    }

    // ── 보험 조회 2차 루프 ──
    let twoWayData: TwoWayAuthData = { jobIndex, threadIndex, jti, twoWayTimestamp, smsAuthNo }

    for (let loop = 1; loop <= MAX_LOOPS; loop++) {
      console.log(`[step2] 보험 조회 ${loop}차 요청 / twoWayData:`, JSON.stringify(twoWayData))

      const result = await fetchInsuranceList({
        userName: userName?.trim() ?? '',
        identity, birthDate,
        id: credit4uId, password: credit4uPw,
        twoWayData,
      })
      console.log(`[step2] 보험 조회 ${loop}차 응답:`, JSON.stringify(result, null, 2))

      const continue2Way = result.data?.continue2Way as boolean | undefined

      if (result.result.code === TWO_WAY_CODE && continue2Way) {
        const nextMethod = result.data?.method as string | undefined
        console.log(`[step2] continue2Way=true / method=${nextMethod}`)

        if (nextMethod === 'smsAuthNo') {
          return NextResponse.json({
            requiresTwoWay: true, isRegister: false,
            twoWayInfo: {
              jobIndex:        result.data.jobIndex,
              threadIndex:     result.data.threadIndex,
              jti:             result.data.jti,
              twoWayTimestamp: result.data.twoWayTimestamp,
              credit4uId, credit4uPw,
            },
          })
        }

        // 자동으로 다음 2차 요청 진행
        twoWayData = {
          jobIndex:        result.data.jobIndex,
          threadIndex:     result.data.threadIndex,
          jti:             result.data.jti,
          twoWayTimestamp: result.data.twoWayTimestamp,
        }
        continue
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

    return NextResponse.json({ error: '최대 인증 횟수를 초과했습니다. 다시 시도해 주세요.' }, { status: 502 })

  } catch (e) {
    console.error('[step2]', e)
    const msg = e instanceof Error ? e.message : '서버 오류가 발생했습니다.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
