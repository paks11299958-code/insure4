import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json(null)
  try {
    const { payload } = await jwtVerify(token, secret)
    return NextResponse.json({ id: payload.id, email: payload.email, username: payload.username, role: payload.role })
  } catch {
    return NextResponse.json(null)
  }
}
