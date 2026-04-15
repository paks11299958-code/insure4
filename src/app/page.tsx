'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, LogOut, LogIn, UserPlus, LayoutDashboard, Sparkles } from 'lucide-react'
import Hero from '@/components/Hero'

interface AuthUser { id: number; email: string; username?: string }

export default function LandingPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(u => { if (u?.id) setAuthUser(u) })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAuthUser(null)
  }

  return (
    <main className="min-h-screen text-[#C0C8D8]" style={{ background: '#0D0E12' }}>

      {/* ── 헤더 GNB ── */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md border-b"
        style={{ background: 'rgba(13,14,18,0.92)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">

          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1A3A80, #2D5BE3)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <polygon points="9,2 16,6 16,12 9,16 2,12 2,6" fill="none" stroke="white" strokeWidth="1.2" />
                <line x1="9" y1="2" x2="9" y2="16" stroke="white" strokeWidth="0.7" opacity="0.4" />
                <line x1="2" y1="6" x2="16" y2="12" stroke="white" strokeWidth="0.7" opacity="0.4" />
                <line x1="16" y1="6" x2="2" y2="12" stroke="white" strokeWidth="0.7" opacity="0.4" />
                <circle cx="9" cy="9" r="2" fill="#D4AF37" />
              </svg>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: '#D4AF37' }} />
            </div>
            <span className="text-sm font-semibold tracking-wide transition-colors group-hover:text-[#6B9FFF]"
              style={{ color: '#A8B8CC' }}>AI 보험 분석</span>
          </Link>

          {/* 데스크탑 네비 */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-200"
              style={{ background: 'rgba(75,127,212,0.12)', color: '#6B9FFF', borderColor: 'rgba(75,127,212,0.3)' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(75,127,212,0.22)'
                el.style.borderColor = 'rgba(75,127,212,0.55)'
                el.style.color = '#93B4FF'
                el.style.boxShadow = '0 0 14px rgba(75,127,212,0.18)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(75,127,212,0.12)'
                el.style.borderColor = 'rgba(75,127,212,0.3)'
                el.style.color = '#6B9FFF'
                el.style.boxShadow = 'none'
              }}>
              홈
            </Link>
            <Link href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-200"
              style={{ background: 'rgba(75,127,212,0.12)', color: '#6B9FFF', borderColor: 'rgba(75,127,212,0.3)' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(75,127,212,0.22)'
                el.style.borderColor = 'rgba(75,127,212,0.55)'
                el.style.color = '#93B4FF'
                el.style.boxShadow = '0 0 14px rgba(75,127,212,0.18)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(75,127,212,0.12)'
                el.style.borderColor = 'rgba(75,127,212,0.3)'
                el.style.color = '#6B9FFF'
                el.style.boxShadow = 'none'
              }}>
              <LayoutDashboard size={14} /> 내 분석 내역
            </Link>
            <Link href="#"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:text-[#E2E8F0]"
              style={{ color: '#4E6888' }}>
              <Sparkles size={14} /> 프리미엄
            </Link>
          </nav>

          {/* 우측 인증 */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {authUser ? (
              <>
                <div className="flex items-center gap-1.5 px-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #2D5BE3, #1A3A80)' }}>
                    {(authUser.username || authUser.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs" style={{ color: '#4E6888' }}>{authUser.username || authUser.email}</span>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg border text-xs transition-colors cursor-pointer hover:text-[#6B9FFF]"
                  style={{ borderColor: 'rgba(75,127,212,0.25)', color: '#4E6888' }}>
                  <LogOut size={12} /> 로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/login"
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:text-[#E2E8F0]"
                  style={{ color: '#4E6888' }}>
                  <LogIn size={13} /> 로그인
                </Link>
                <Link href="/register"
                  className="px-4 py-2 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 hover:opacity-90"
                  style={{ borderColor: 'rgba(75,127,212,0.4)', color: '#6B9FFF', background: 'rgba(75,127,212,0.08)' }}>
                  <UserPlus size={13} /> 회원가입
                </Link>
              </>
            )}
          </div>

          {/* 모바일 햄버거 */}
          <button className="md:hidden cursor-pointer p-1" style={{ color: '#6B9FFF' }}
            onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t px-6 py-5 flex flex-col gap-4"
            style={{ background: '#13141C', borderColor: 'rgba(75,127,212,0.1)' }}>
            <Link href="/" className="text-sm font-semibold" style={{ color: '#6B9FFF' }} onClick={() => setMenuOpen(false)}>홈</Link>
            <Link href="/dashboard" className="text-sm transition-colors hover:text-[#E2E8F0]" style={{ color: '#4E6888' }} onClick={() => setMenuOpen(false)}>내 분석 내역</Link>
            <Link href="#" className="text-sm transition-colors hover:text-[#E2E8F0]" style={{ color: '#4E6888' }} onClick={() => setMenuOpen(false)}>프리미엄</Link>
            <div className="border-t pt-4 flex flex-col gap-3" style={{ borderColor: 'rgba(75,127,212,0.1)' }}>
              {authUser ? (
                <button onClick={() => { handleLogout(); setMenuOpen(false) }}
                  className="text-left text-sm cursor-pointer" style={{ color: '#4E6888' }}>로그아웃</button>
              ) : (
                <>
                  <Link href="/login" className="text-sm" style={{ color: '#4E6888' }} onClick={() => setMenuOpen(false)}>로그인</Link>
                  <Link href="/register" className="text-sm font-semibold" style={{ color: '#6B9FFF' }} onClick={() => setMenuOpen(false)}>회원가입</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── 히어로 섹션 ── */}
      <Hero />

      {/* ── 푸터 ── */}
      <footer className="border-t py-8 text-center"
        style={{ borderColor: 'rgba(75,127,212,0.08)', background: '#0D0E12' }}>
        <p className="text-xs" style={{ color: '#1A2A40' }}>insure.dbzone.kr · AI 기반 보험 중복 분석 서비스</p>
        <p className="text-xs mt-1" style={{ color: '#1A2A40' }}>본 서비스는 참고용이며, 실제 보험 변경 전 전문가 상담을 권장합니다.</p>
      </footer>
    </main>
  )
}
