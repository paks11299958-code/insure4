'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Menu, X, LogOut, LogIn, UserPlus, LayoutDashboard, ShieldCheck, CheckCircle2 } from 'lucide-react'

interface AuthUser { id: number; email: string; username?: string }

export default function LandingPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/auth/me').then(r => r.json()).then(u => { if (u?.id) setAuthUser(u) }).catch(() => {})
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAuthUser(null)
    setMenuOpen(false)
  }

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: '#FFFFFF', color: '#111827' }}>

      {/* ══════════════════════════════════
          GNB — 흰 배경
      ══════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #E5E7EB' }}>
        <div className="max-w-[1120px] mx-auto px-5 h-[64px] flex items-center justify-between">

          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo2.png" alt="로고" width={32} height={32} style={{ borderRadius: 8 }} />
            <span className="text-[14px] font-bold" style={{ color: '#111827', letterSpacing: '-0.3px' }}>AI보험분석</span>
          </Link>

          {/* 데스크탑 네비 */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: '/', label: '홈' },
              { href: '/analyze', label: 'AI 분석 시작' },
              { href: '/dashboard', label: '분석 내역' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="px-4 py-2 rounded-xl text-[13px] font-medium spring-fast"
                style={{ color: '#6B7280' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#111827'; el.style.background = '#F3F4F6' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#6B7280'; el.style.background = 'transparent' }}>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* 우측 인증 */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {authUser ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                  style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: '#111827', color: 'white' }}>
                    {(authUser.username || authUser.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#374151' }}>{authUser.username || authUser.email}</span>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs cursor-pointer spring-fast"
                  style={{ border: '1px solid #E5E7EB', color: '#9CA3AF' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#374151'; el.style.borderColor = '#D1D5DB' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#9CA3AF'; el.style.borderColor = '#E5E7EB' }}>
                  <LogOut size={11} /> 로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/login"
                  className="px-4 py-2 rounded-xl text-[13px] font-medium spring-fast"
                  style={{ color: '#6B7280' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#111827' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#6B7280' }}>
                  <span className="flex items-center gap-1.5"><LogIn size={13} />로그인</span>
                </Link>
                <Link href="/register"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-bold spring-fast"
                  style={{ background: '#111827', color: 'white' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#1F2937' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#111827' }}>
                  <UserPlus size={13} /> 무료 시작
                </Link>
              </>
            )}
          </div>

          {/* 모바일 햄버거 */}
          <button className="md:hidden cursor-pointer p-2 rounded-xl spring-fast"
            style={{ color: '#374151', border: '1px solid #E5E7EB' }}
            onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* 모바일 메뉴 */}
        {menuOpen && (
          <div className="md:hidden border-t px-5 py-4 flex flex-col gap-1 fade-in-up"
            style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
            {[
              { href: '/', label: '홈' },
              { href: '/analyze', label: 'AI 분석 시작' },
              { href: '/dashboard', label: '분석 내역' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="px-4 py-3 rounded-xl text-sm font-medium"
                style={{ color: '#374151' }}
                onClick={() => setMenuOpen(false)}>{item.label}</Link>
            ))}
            <div className="border-t mt-2 pt-3 flex flex-col gap-2" style={{ borderColor: '#F3F4F6' }}>
              {authUser ? (
                <button onClick={handleLogout}
                  className="px-4 py-3 rounded-xl text-sm text-left cursor-pointer"
                  style={{ color: '#9CA3AF' }}>로그아웃</button>
              ) : (
                <>
                  <Link href="/login" className="px-4 py-3 rounded-xl text-sm font-medium text-center"
                    style={{ color: '#374151', border: '1px solid #E5E7EB' }}
                    onClick={() => setMenuOpen(false)}>로그인</Link>
                  <Link href="/register"
                    className="px-4 py-3 rounded-xl text-sm font-bold text-center"
                    style={{ color: 'white', background: '#111827' }}
                    onClick={() => setMenuOpen(false)}>무료로 시작하기</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════
          히어로 섹션
      ══════════════════════════════════ */}
      <section className="pt-[64px]" style={{ background: '#FFFFFF' }}>
        <div className="max-w-[1120px] mx-auto px-5">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 py-16 lg:py-24">

            {/* 왼쪽: 텍스트 */}
            <div className={`flex-1 min-w-0 ${mounted ? 'fade-in-up-1' : 'opacity-0'}`}>

              {/* 상단 뱃지 */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6"
                style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#111827' }} />
                <span className="text-[11px] font-semibold" style={{ color: '#374151', letterSpacing: '0.04em' }}>AI 기반 보험 중복 분석 서비스</span>
              </div>

              {/* 훅 질문 */}
              <p className="text-base md:text-lg font-semibold mb-3" style={{ color: '#6B7280' }}>
                &ldquo;내 보험, 제대로 가입한 게 맞을까?&rdquo;
              </p>

              {/* 메인 헤드라인 */}
              <h1 className="font-black leading-[1.15] mb-5"
                style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', color: '#111827', letterSpacing: '-0.04em' }}>
                터치 한 번으로 끝내는<br />AI 보험 정밀 진단
              </h1>

              {/* 설명 */}
              <p className="leading-relaxed mb-8"
                style={{ fontSize: 'clamp(0.875rem,1.8vw,1rem)', color: '#6B7280', maxWidth: 420 }}>
                보험 문서를 올리면 AI가 중복 보장을 자동 분석하고<br className="hidden sm:block" />
                절감 가능 금액과 맞춤 리포트를 즉시 제공합니다
              </p>

              {/* 체크리스트 */}
              <ul className="flex flex-col gap-2.5 mb-8">
                {[
                  'PDF, 이미지 등 모든 형식 지원',
                  '중복 보장 자동 탐지 및 절감액 계산',
                  '분석 후 문서 즉시 삭제 — 완전 무료',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm" style={{ color: '#374151' }}>
                    <CheckCircle2 size={16} style={{ color: '#111827', flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>

              {/* CTA 버튼 */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/analyze"
                  className="group flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-extrabold text-sm spring"
                  style={{
                    background: '#111827',
                    color: 'white',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                    letterSpacing: '-0.2px',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#1F2937'; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#111827'; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)' }}>
                  내 보험 무료 진단하기
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 duration-300" />
                </Link>

                <Link href="/dashboard"
                  className="flex items-center justify-center gap-1.5 px-6 py-4 rounded-2xl text-sm font-semibold spring"
                  style={{ color: '#6B7280', border: '1px solid #E5E7EB', background: '#FFFFFF' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#111827'; el.style.borderColor = '#D1D5DB'; el.style.background = '#F9FAFB' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#6B7280'; el.style.borderColor = '#E5E7EB'; el.style.background = '#FFFFFF' }}>
                  <LayoutDashboard size={14} /> 분석 내역 보기
                </Link>
              </div>
            </div>

            {/* 오른쪽: m_deg.png 히어로 이미지 */}
            <div className={`shrink-0 w-full lg:w-auto flex justify-center ${mounted ? 'fade-in-up-2' : 'opacity-0'}`}>
              <div className="relative" style={{ maxWidth: 520 }}>
                {/* 배경 블러 장식 */}
                <div className="absolute -inset-6 rounded-3xl blur-2xl -z-10"
                  style={{ background: 'linear-gradient(135deg,#F0F4FF,#E8F0FF,#F5F5FF)', opacity: 0.8 }} />
                {/* 이미지 프레임 */}
                <div className="rounded-2xl overflow-hidden"
                  style={{
                    boxShadow: '0 24px 80px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
                    border: '1px solid #E5E7EB',
                  }}>
                  <Image
                    src="/m_deg.png"
                    alt="AI 보험 분석 서비스 화면"
                    width={520}
                    height={360}
                    priority
                    className="w-full h-auto block"
                    style={{ display: 'block' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          통계 바
      ══════════════════════════════════ */}
      <section style={{ background: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
        <div className="max-w-[1120px] mx-auto px-5">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0"
            style={{ borderColor: '#E5E7EB' }}>
            {[
              { value: '2,400+', label: '누적 분석 건수' },
              { value: '월 ₩38,000', label: '평균 절감액' },
              { value: '3.2개', label: '평균 중복 항목' },
              { value: '98%', label: '사용자 만족도' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <p className="font-black mb-1"
                  style={{ fontSize: 'clamp(1.3rem,3vw,1.7rem)', color: '#111827', letterSpacing: '-0.03em' }}>
                  {s.value}
                </p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          4대 핵심 기능
      ══════════════════════════════════ */}
      <section className="py-24" style={{ background: '#FFFFFF' }}>
        <div className="max-w-[1120px] mx-auto px-5">

          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: '#9CA3AF' }}>서비스 특징</p>
            <h2 className="font-black leading-tight" style={{ fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', color: '#111827', letterSpacing: '-0.03em' }}>
              왜 AI 보험 분석인가요?
            </h2>
            <p className="mt-3 text-sm" style={{ color: '#9CA3AF', maxWidth: 360, margin: '12px auto 0' }}>
              복잡한 보험 구조를 AI가 정밀하게 분석해 드립니다
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                emoji: '📄',
                title: '문서 자동 분석',
                desc: 'PDF, 이미지 등 어떤 형식의 보험 문서도 AI가 자동으로 인식하고 보장 항목을 추출합니다',
              },
              {
                emoji: '🔍',
                title: 'AI 중복 탐지',
                desc: '유사·동일 보장 항목을 정밀 비교해 불필요하게 중복된 보험을 찾아냅니다',
              },
              {
                emoji: '📊',
                title: '맞춤 분석 리포트',
                desc: '중복 항목별 절감 금액과 최적화 방향을 시각적으로 정리한 리포트를 즉시 제공합니다',
              },
              {
                emoji: '🔒',
                title: '안전한 데이터',
                desc: '업로드된 보험 문서는 분석 후 즉시 삭제됩니다. 개인정보는 저장되지 않습니다',
              },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl p-6 spring cursor-default"
                style={{ border: '1px solid #E5E7EB', background: '#FFFFFF' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 16px 48px rgba(0,0,0,0.08)'; el.style.borderColor = '#D1D5DB' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = 'none'; el.style.borderColor = '#E5E7EB' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-2xl"
                  style={{ background: '#F3F4F6' }}>
                  {f.emoji}
                </div>
                <h3 className="font-bold mb-2" style={{ color: '#111827', fontSize: 14 }}>{f.title}</h3>
                <p className="leading-relaxed" style={{ color: '#9CA3AF', fontSize: 13 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          이용 방법 (3단계)
      ══════════════════════════════════ */}
      <section className="py-24" style={{ background: '#F9FAFB' }}>
        <div className="max-w-[1120px] mx-auto px-5">

          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: '#9CA3AF' }}>이용 방법</p>
            <h2 className="font-black leading-tight" style={{ fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', color: '#111827', letterSpacing: '-0.03em' }}>
              3단계로 끝나는 보험 분석
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: '보험 문서 업로드',
                desc: '보험증권 PDF 또는 보험 관련 이미지를 업로드하세요. 여러 개도 한 번에 가능합니다.',
                link: '/analyze',
                cta: '분석 시작하기',
              },
              {
                step: '02',
                title: 'AI 자동 분석',
                desc: 'AI가 문서를 읽고 보장 항목을 추출하여 중복 여부와 절감 가능 금액을 계산합니다.',
                link: null,
                cta: null,
              },
              {
                step: '03',
                title: '리포트 확인 및 절감',
                desc: '맞춤 분석 리포트를 확인하고 보험 최적화에 활용하세요.',
                link: '/dashboard',
                cta: '내역 확인하기',
              },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl p-7 spring"
                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.07)'; el.style.borderColor = '#D1D5DB' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'none'; el.style.borderColor = '#E5E7EB' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: '#111827' }}>
                  <span className="font-black text-xs text-white" style={{ letterSpacing: '0.05em' }}>{s.step}</span>
                </div>
                <h3 className="font-bold mb-2" style={{ color: '#111827', fontSize: 15 }}>{s.title}</h3>
                <p className="leading-relaxed mb-5" style={{ color: '#9CA3AF', fontSize: 13 }}>{s.desc}</p>
                {s.link && (
                  <Link href={s.link}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold spring-fast"
                    style={{ color: '#374151' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#111827' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#374151' }}>
                    {s.cta} <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          최종 CTA
      ══════════════════════════════════ */}
      <section className="py-24" style={{ background: '#111827' }}>
        <div className="max-w-[1120px] mx-auto px-5 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: '#6B7280' }}>지금 바로 시작하세요</p>
          <h2 className="font-black leading-tight mb-4" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFFFFF', letterSpacing: '-0.04em' }}>
            내 보험이 새고 있을지도 모릅니다
          </h2>
          <p className="mb-10 mx-auto" style={{ color: '#6B7280', maxWidth: 460, lineHeight: 1.8, fontSize: 14 }}>
            평균 보험 가입자의 68%가 중복 보장을 갖고 있습니다.<br />
            AI 분석으로 지금 당장 확인해 보세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/analyze"
              className="group flex items-center gap-2.5 px-10 py-4 rounded-2xl font-extrabold text-sm spring"
              style={{
                background: '#FFFFFF',
                color: '#111827',
                boxShadow: '0 4px 24px rgba(255,255,255,0.1)',
                letterSpacing: '-0.2px',
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 40px rgba(255,255,255,0.15)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 4px 24px rgba(255,255,255,0.1)' }}>
              무료로 내 보험 분석하기
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 duration-300" />
            </Link>
            <p className="text-xs" style={{ color: '#374151' }}>회원가입 없이도 이용 가능 · 완전 무료</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          푸터
      ══════════════════════════════════ */}
      <footer style={{ background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
        <div className="max-w-[1120px] mx-auto px-5 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <Image src="/logo2.png" alt="로고" width={28} height={28} style={{ borderRadius: 6 }} />
                <span className="font-bold text-sm" style={{ color: '#374151' }}>AI 보험 분석</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF', maxWidth: 360 }}>
                AI 기반 보험 중복 보장 분석 서비스입니다.<br />
                본 서비스는 참고용이며, 실제 보험 변경 전 전문가 상담을 권장합니다.
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1.5">
              <div className="flex items-center gap-4">
                {[
                  { href: '/', label: '홈' },
                  { href: '/analyze', label: 'AI 분석' },
                  { href: '/dashboard', label: '분석 내역' },
                  { href: '/login', label: '로그인' },
                ].map(item => (
                  <Link key={item.href} href={item.href}
                    className="text-xs spring-fast"
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#374151'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#9CA3AF'}>
                    {item.label}
                  </Link>
                ))}
              </div>
              <span className="text-xs" style={{ color: '#D1D5DB' }}>© 2025 AI Insurance Analytics · insure.dbzone.kr</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
