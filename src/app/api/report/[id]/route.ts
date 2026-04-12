import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const { payload } = await jwtVerify(token, secret)
    const user = payload as { id: number }

    const analysis = await prisma.analysis.findFirst({
      where: { id: Number(params.id), userId: user.id },
    })

    if (!analysis) return NextResponse.json({ error: '결과를 찾을 수 없습니다.' }, { status: 404 })

    return NextResponse.json(analysis)
  } catch {
    return NextResponse.json({ error: '인증 오류' }, { status: 401 })
  }
}
