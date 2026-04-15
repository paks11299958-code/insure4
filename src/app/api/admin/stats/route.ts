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
    const [totalUsers, totalAnalyses] = await Promise.all([
      prisma.user.count(),
      prisma.analysis.count(),
    ])

    // 최근 30일 가입자 추이
    const since = new Date()
    since.setDate(since.getDate() - 29)
    since.setHours(0, 0, 0, 0)

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // 날짜별 그룹핑
    const countByDate: Record<string, number> = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date(since)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      countByDate[key] = 0
    }
    for (const u of users) {
      const key = u.createdAt.toISOString().slice(0, 10)
      if (key in countByDate) countByDate[key]++
    }

    const signupChart = Object.entries(countByDate).map(([date, count]) => ({ date, count }))

    // 이번 주 신규 가입
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const newUsersThisWeek = await prisma.user.count({ where: { createdAt: { gte: weekAgo } } })

    return NextResponse.json({ totalUsers, totalAnalyses, newUsersThisWeek, signupChart })
  } catch (err) {
    console.error('[admin/stats]', err)
    return NextResponse.json({ error: '오류가 발생했습니다.' }, { status: 500 })
  }
}
