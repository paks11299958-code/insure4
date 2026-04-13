import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/admin')) {
    const token = req.cookies.get('auth-token')?.value

    if (!token) {
      console.log('[middleware] 토큰 없음 → 리다이렉트')
      return NextResponse.redirect(new URL('/', req.url))
    }

    try {
      const { payload } = await jwtVerify(token, secret)
      console.log('[middleware] role:', payload.role)
      if (payload.role !== 'ADMIN') {
        console.log('[middleware] ADMIN 아님 → 리다이렉트')
        return NextResponse.redirect(new URL('/', req.url))
      }
    } catch (e) {
      console.log('[middleware] JWT 오류:', e)
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/(admin)(.*)', '/admin'],
}
