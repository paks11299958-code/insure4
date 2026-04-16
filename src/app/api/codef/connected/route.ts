/**
 * GET /api/codef/connected
 * 현재 로그인 사용자의 connected_id 보유 여부 반환
 */
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'secret')

export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get('token')?.value
    if (!cookie) return NextResponse.json({ hasConnectedId: false })

    const { payload } = await jwtVerify(cookie, JWT_SECRET)
    const userId = payload.id as number

    const info = await prisma.userCodefInfo.findUnique({ where: { userId } })

    return NextResponse.json({
      hasConnectedId: !!info?.connectedId,
      lastSyncAt: info?.lastSyncAt ?? null,
    })
  } catch {
    return NextResponse.json({ hasConnectedId: false })
  }
}
