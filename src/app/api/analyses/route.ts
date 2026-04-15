import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

async function getUser(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { id: number; email: string }
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  try {
    const { userInfo, fileNames, result } = await req.json()
    const analysis = await prisma.analysis.create({
      data: {
        userId: user.id,
        title: userInfo?.title || null,
        gender: userInfo?.gender || null,
        age: userInfo?.age || null,
        job: userInfo?.job || null,
        health: userInfo?.health || null,
        purpose: userInfo?.purpose || null,
        budget: userInfo?.budget || null,
        fileNames: Array.isArray(fileNames) ? fileNames.join(', ') : fileNames,
        result,
      },
    })
    return NextResponse.json({ id: analysis.id })
  } catch (err) {
    console.error('[analyses POST]', err)
    return NextResponse.json({ error: '저장 오류' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const analyses = await prisma.analysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json(analyses)
}
