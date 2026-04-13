import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 최초 1회 관리자 계정 설정용 - 이후 삭제 또는 비활성화 가능
const ADMIN_EMAIL = 'c2clo@naver.com'
const SETUP_KEY = process.env.ADMIN_SETUP_KEY || 'setup-secret'

export async function POST(req: Request) {
  try {
    const { key } = await req.json()
    if (key !== SETUP_KEY)
      return NextResponse.json({ error: '잘못된 키입니다.' }, { status: 403 })

    const user = await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { role: 'ADMIN' },
    })

    return NextResponse.json({ message: `${user.email} 관리자 설정 완료` })
  } catch (err) {
    console.error('[set-admin]', err)
    return NextResponse.json({ error: '오류가 발생했습니다.' }, { status: 500 })
  }
}
