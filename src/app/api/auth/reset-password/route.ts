import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password)
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

    if (password.length < 6)
      return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 })

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    })

    if (!user)
      return NextResponse.json({ error: '링크가 만료되었거나 유효하지 않습니다.' }, { status: 400 })

    const hashed = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return NextResponse.json({ message: '비밀번호가 변경되었습니다.' })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json({ error: '오류가 발생했습니다.' }, { status: 500 })
  }
}
