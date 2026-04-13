import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = req.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })

    const { payload } = await jwtVerify(token, secret)
    const userId = payload.id as number
    const id = parseInt(params.id)

    if (isNaN(id)) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

    // 본인 소유 확인 후 삭제
    const analysis = await prisma.analysis.findFirst({ where: { id, userId } })
    if (!analysis) return NextResponse.json({ error: '찾을 수 없습니다.' }, { status: 404 })

    await prisma.analysis.delete({ where: { id } })
    return NextResponse.json({ message: '삭제되었습니다.' })
  } catch (err) {
    console.error('[analyses/delete]', err)
    return NextResponse.json({ error: '오류가 발생했습니다.' }, { status: 500 })
  }
}
