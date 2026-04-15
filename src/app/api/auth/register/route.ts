import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, password, username } = await req.json()

    if (!email || !password)
      return NextResponse.json({ error: '이메일과 비밀번호를 입력해주세요.' }, { status: 400 })

    if (password.length < 6)
      return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다.' }, { status: 400 })

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists)
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 })

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, password: hashed, username: username || null },
    })

    return NextResponse.json({ id: user.id, email: user.email, username: user.username }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: '회원가입 오류가 발생했습니다.' }, { status: 500 })
  }
}
