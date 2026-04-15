import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

async function verifyAdmin(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'ADMIN'
  } catch { return false }
}

export async function GET(req: NextRequest) {
  if (!await verifyAdmin(req))
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'desc' // asc | desc

    const users = await prisma.user.findMany({
      where: search ? { email: { contains: search, mode: 'insensitive' } } : undefined,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        _count: { select: { analyses: true } },
      },
      orderBy: { createdAt: sort === 'asc' ? 'asc' : 'desc' },
    })

    return NextResponse.json(users)
  } catch (err) {
    console.error('[admin/users]', err)
    return NextResponse.json({ error: '오류가 발생했습니다.' }, { status: 500 })
  }
}
