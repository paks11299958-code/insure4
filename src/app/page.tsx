'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X, LogOut, LogIn, UserPlus, LayoutDashboard, Sparkles } from 'lucide-react'

interface AuthUser { id: number; email: string; username?: string }

/* ── SVG 아이콘: AIPD 로고 엠블럼 ── */
function AIPDEmblem({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      {/* 외곽 링 */}
      <circle cx="30" cy="30" r="28" stroke="#4B7FD4" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.5" />
      <circle cx="30" cy="30" r="22" stroke="#2D5BE3" strokeWidth="0.8" opacity="0.3" />
      {/* 네트워크 노드 연결선 */}
      <line x1="30" y1="8" x2="48" y2="22" stroke="#4B7FD4" strokeWidth="0.9" opacity="0.6" />
      <line x1="30" y1="8" x2="12" y2="22" stroke="#4B7FD4" strokeWidth="0.9" opacity="0.6" />
      <line x1="48" y1="22" x2="48" y2="38" stroke="#4B7FD4" strokeWidth="0.9" opacity="0.6" />
      <line x1="12" y1="22" x2="12" y2="38" stroke="#4B7FD4" strokeWidth="0.9" opacity="0.6" />
      <line x1="48" y1="38" x2="30" y2="52" stroke="#4B7FD4" strokeWidth="0.9" opacity="0.6" />
      <line x1="12" y1="38" x2="30" y2="52" stroke="#4B7FD4" strokeWidth="0.9" opacity="0.6" />
      <line x1="30" y1="8" x2="30" y2="52" stroke="#2D5BE3" strokeWidth="0.6" opacity="0.3" />
      <line x1="12" y1="22" x2="48" y2="38" stroke="#2D5BE3" strokeWidth="0.6" opacity="0.3" />
      <line x1="48" y1="22" x2="12" y2="38" stroke="#2D5BE3" strokeWidth="0.6" opacity="0.3" />
      {/* 노드 포인트 */}
      <circle cx="30" cy="8" r="2.5" fill="#306FFF" />
      <circle cx="48" cy="22" r="2" fill="#4B7FD4" />
      <circle cx="12" cy="22" r="2" fill="#4B7FD4" />
      <circle cx="48" cy="38" r="2" fill="#4B7FD4" />
      <circle cx="12" cy="38" r="2" fill="#4B7FD4" />
      <circle cx="30" cy="52" r="2" fill="#4B7FD4" />
      {/* 중앙 육각형 */}
      <polygon points="30,20 37,24 37,32 30,36 23,32 23,24" fill="#0F1828" stroke="#4B7FD4" strokeWidth="1.2" />
      {/* 중앙 그래프 바 */}
      <rect x="25.5" y="31" width="2" height="3" rx="0.5" fill="#4B7FD4" opacity="0.8" />
      <rect x="29" y="28" width="2" height="6" rx="0.5" fill="#306FFF" />
      <rect x="32.5" y="25" width="2" height="9" rx="0.5" fill="#D4AF37" />
      {/* 골드 중앙 포인트 */}
      <circle cx="30" cy="30" r="1.5" fill="#D4AF37" />
    </svg>
  )
}

/* ── SVG 아이콘: 클라우드 업로드 + 서버랙 ── */
function IconUpload() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* 서버 랙 */}
      <rect x="10" y="34" width="32" height="5" rx="1.5" fill="#0F1828" stroke="#4B7FD4" strokeWidth="1.2" />
      <rect x="10" y="41" width="32" height="5" rx="1.5" fill="#0F1828" stroke="#4B7FD4" strokeWidth="1.2" />
      <circle cx="37" cy="36.5" r="1.2" fill="#22C55E" />
      <circle cx="37" cy="43.5" r="1.2" fill="#D4AF37" />
      <line x1="14" y1="36.5" x2="32" y2="36.5" stroke="#4B7FD4" strokeWidth="0.8" opacity="0.5" />
      <line x1="14" y1="43.5" x2="32" y2="43.5" stroke="#4B7FD4" strokeWidth="0.8" opacity="0.5" />
      {/* 클라우드 */}
      <path d="M18 28 Q14 28 14 23 Q14 18 19 18 Q19.5 14 24 14 Q28 14 29 17 Q33 17 33 22 Q33 28 28 28 Z"
        fill="#0F1828" stroke="#4B7FD4" strokeWidth="1.3" strokeLinejoin="round" />
      {/* 업로드 화살표 */}
      <line x1="23" y1="26" x2="23" y2="19" stroke="#D4AF37" strokeWidth="1.8" strokeLinecap="round" />
      <polyline points="20,21.5 23,18.5 26,21.5" stroke="#D4AF37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* 연결선 */}
      <line x1="23" y1="28" x2="23" y2="34" stroke="#4B7FD4" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
    </svg>
  )
}

/* ── SVG 아이콘: 돋보기 + 데이터 노드 ── */
function IconDetect() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* 돋보기 원 */}
      <circle cx="22" cy="22" r="14" fill="#0F1828" stroke="#4B7FD4" strokeWidth="1.5" />
      <circle cx="22" cy="22" r="10" stroke="#2D5BE3" strokeWidth="0.7" opacity="0.4" strokeDasharray="2 2" />
      {/* 돋보기 안 네트워크 노드 */}
      <circle cx="22" cy="17" r="1.8" fill="#306FFF" />
      <circle cx="16" cy="25" r="1.5" fill="#4B7FD4" />
      <circle cx="28" cy="25" r="1.5" fill="#4B7FD4" />
      <circle cx="22" cy="28" r="1.5" fill="#D4AF37" />
      <line x1="22" y1="17" x2="16" y2="25" stroke="#4B7FD4" strokeWidth="1" opacity="0.7" />
      <line x1="22" y1="17" x2="28" y2="25" stroke="#4B7FD4" strokeWidth="1" opacity="0.7" />
      <line x1="16" y1="25" x2="22" y2="28" stroke="#4B7FD4" strokeWidth="1" opacity="0.7" />
      <line x1="28" y1="25" x2="22" y2="28" stroke="#4B7FD4" strokeWidth="1" opacity="0.7" />
      {/* 돋보기 손잡이 */}
      <line x1="33" y1="33" x2="43" y2="43" stroke="#4B7FD4" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="33" y1="33" x2="43" y2="43" stroke="#D4AF37" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

/* ── SVG 아이콘: 리포트 북 + 그래프 + 별 ── */
function IconReport() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* 책 왼쪽 페이지 */}
      <path d="M8 10 Q8 8 10 8 L24 8 L24 44 L10 44 Q8 44 8 42 Z"
        fill="#0F1828" stroke="#4B7FD4" strokeWidth="1.2" />
      {/* 책 오른쪽 페이지 */}
      <path d="M44 10 Q44 8 42 8 L28 8 L28 44 L42 44 Q44 44 44 42 Z"
        fill="#0F1828" stroke="#4B7FD4" strokeWidth="1.2" />
      {/* 책 가운데 */}
      <line x1="26" y1="8" x2="26" y2="44" stroke="#2D5BE3" strokeWidth="1.5" />
      {/* 왼쪽 바 차트 */}
      <rect x="12" y="30" width="3" height="8" rx="0.5" fill="#4B7FD4" opacity="0.7" />
      <rect x="17" y="25" width="3" height="13" rx="0.5" fill="#306FFF" />
      {/* 오른쪽 라인 차트 */}
      <polyline points="30,36 34,28 38,32 42,22" stroke="#4B7FD4" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="36" r="1.2" fill="#4B7FD4" />
      <circle cx="34" cy="28" r="1.2" fill="#4B7FD4" />
      <circle cx="38" cy="32" r="1.2" fill="#4B7FD4" />
      <circle cx="42" cy="22" r="1.5" fill="#D4AF37" />
      {/* 별 장식 */}
      <path d="M20 16 L21 19 L24 19 L21.5 21 L22.5 24 L20 22 L17.5 24 L18.5 21 L16 19 L19 19 Z"
        fill="#D4AF37" opacity="0.9" />
      {/* 텍스트 라인 */}
      <line x1="30" y1="40" x2="42" y2="40" stroke="#4B7FD4" strokeWidth="0.8" opacity="0.5" />
      <line x1="30" y1="43" x2="39" y2="43" stroke="#4B7FD4" strokeWidth="0.8" opacity="0.3" />
    </svg>
  )
}

const FEATURES = [
  {
    icon: <IconUpload />,
    title: '간편 문서 업로드',
    desc: 'PDF, 이미지, 텍스트 파일을 드래그 앤 드롭으로 간편하게 업로드할 수 있습니다.',
  },
  {
    icon: <IconDetect />,
    title: '중복 항목 정밀 검토',
    desc: 'AI가 보장 항목을 정밀 분석하여 중복 구간을 자동으로 탐지합니다.',
  },
  {
    icon: <IconReport />,
    title: '절감 리포트 & 맞춤 제안',
    desc: '절감 가능 금액과 맞춤형 보험 최적화 제안을 리포트로 제공합니다.',
  },
]

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
    <main className="min-h-screen text-[#C0C8D8] relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0A0F1E 0%, #0C1525 40%, #0A1018 100%)' }}>

      {/* ── 배경 레이어 1: 스타일라이즈드 그리드 ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(75,127,212,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(75,127,212,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />

      {/* ── 배경 레이어 2: 데이터 웨이브 (우상단 글로우) ── */}
      <div className="absolute top-0 right-0 w-[600px] h-[500px] pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 80% 10%, rgba(48,111,255,0.12) 0%, rgba(45,91,227,0.06) 40%, transparent 70%)',
      }} />
      {/* 보조 글로우 */}
      <div className="absolute bottom-0 left-0 w-[400px] h-[300px] pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 20% 90%, rgba(26,58,128,0.15) 0%, transparent 60%)',
      }} />

      {/* ── 배경 레이어 3: 데이터 스트림 점선 ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[15, 35, 55, 75].map((pct, i) => (
          <div key={i} className="absolute top-0 bottom-0" style={{
            left: `${pct}%`,
            width: '1px',
            background: `linear-gradient(180deg, transparent 0%, rgba(75,127,212,0.08) 30%, rgba(75,127,212,0.12) 50%, rgba(75,127,212,0.08) 70%, transparent 100%)`,
          }} />
        ))}
      </div>

      {/* ── 헤더 GNB ── */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md border-b"
        style={{ background: 'rgba(10,15,30,0.88)', borderColor: 'rgba(75,127,212,0.12)' }}>
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
            <Link href="/" className="px-4 py-2 rounded-lg text-xs font-semibold border"
              style={{ background: 'rgba(75,127,212,0.12)', color: '#6B9FFF', borderColor: 'rgba(75,127,212,0.3)' }}>
              홈
            </Link>
            <Link href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:text-[#E2E8F0]"
              style={{ color: '#4E6888' }}>
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
            style={{ background: '#0C1525', borderColor: 'rgba(75,127,212,0.1)' }}>
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
      <section className="max-w-[1200px] mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-8">

          {/* 좌측: 로고 + 타이틀 */}
          <div className="flex-[55] flex flex-col items-start">

            {/* AIPD 로고 엠블럼 + 텍스트 */}
            <div className="flex items-center gap-5 mb-8">
              <AIPDEmblem size={72} />
              <div>
                {/* AIPD 대형 텍스트 */}
                <div className="text-[52px] md:text-[64px] font-black tracking-[-2px] leading-none select-none"
                  style={{
                    background: 'linear-gradient(135deg, #E2E8F0 0%, #A8B8CC 35%, #6B9FFF 70%, #306FFF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                  AIPD
                </div>
                <p className="text-[9px] tracking-[0.3em] uppercase mt-1 font-medium"
                  style={{ color: 'rgba(107,159,255,0.55)' }}>
                  AI Insurance Premier Diagnostics
                </p>
              </div>
            </div>

            {/* 구분선 */}
            <div className="w-full max-w-md h-px mb-7" style={{
              background: 'linear-gradient(90deg, rgba(75,127,212,0.5) 0%, rgba(75,127,212,0.1) 60%, transparent 100%)'
            }} />

            <h1 className="text-3xl md:text-4xl font-bold leading-snug tracking-tight mb-3"
              style={{ color: '#E2E8F0' }}>
              AI 보험 중복 분석 서비스
            </h1>
            <p className="text-sm leading-relaxed mb-10" style={{ color: '#4E6888' }}>
              보험 중복보장을 AI로 분석해 드립니다
            </p>

            {/* CTA 버튼 */}
            <Link href="/analyze"
              className="group relative flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-300 overflow-hidden"
              style={{ border: '1px solid rgba(75,127,212,0.6)', color: '#6B9FFF' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(48,111,255,0.15)'
                el.style.borderColor = '#306FFF'
                el.style.boxShadow = '0 0 32px rgba(48,111,255,0.3), inset 0 0 20px rgba(48,111,255,0.05)'
                el.style.transform = 'scale(1.02)'
                el.style.color = '#93B4FF'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'transparent'
                el.style.borderColor = 'rgba(75,127,212,0.6)'
                el.style.boxShadow = 'none'
                el.style.transform = 'scale(1)'
                el.style.color = '#6B9FFF'
              }}>
              내 보험 분석하기
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            {/* 배지 */}
            <div className="flex items-center gap-3 mt-6 flex-wrap">
              {['🔒 보안 분석', '⚡ 즉시 결과', '📊 맞춤 리포트'].map((t, i) => (
                <span key={i} className="text-[11px] px-3 py-1 rounded-full border"
                  style={{ borderColor: 'rgba(75,127,212,0.2)', color: '#4E6888', background: 'rgba(75,127,212,0.04)' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* 우측: 피처 카드 */}
          <div className="flex-[45] w-full flex flex-col gap-3">
            {FEATURES.map((f, i) => (
              <div key={i}
                className="flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 cursor-default"
                style={{
                  borderColor: 'rgba(75,127,212,0.15)',
                  background: 'rgba(15,24,40,0.6)',
                  backdropFilter: 'blur(8px)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(75,127,212,0.4)'
                  el.style.background = 'rgba(45,91,227,0.08)'
                  el.style.transform = 'translateY(-2px)'
                  el.style.boxShadow = '0 8px 32px rgba(48,111,255,0.1)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'rgba(75,127,212,0.15)'
                  el.style.background = 'rgba(15,24,40,0.6)'
                  el.style.transform = 'translateY(0)'
                  el.style.boxShadow = 'none'
                }}>
                {/* 아이콘 박스 */}
                <div className="w-14 h-14 rounded-xl border flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(15,24,40,0.8)', borderColor: 'rgba(75,127,212,0.2)' }}>
                  {f.icon}
                </div>
                <div className="pt-1">
                  <h3 className="text-sm font-semibold mb-1.5 tracking-wide" style={{ color: '#E2E8F0' }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: '#2D4060' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 하단 스탯 바 ── */}
        <div className="mt-14 rounded-2xl border px-8 py-5 flex flex-col sm:flex-row gap-6 sm:gap-0"
          style={{ background: 'rgba(15,24,40,0.7)', borderColor: 'rgba(75,127,212,0.1)', backdropFilter: 'blur(8px)' }}>
          {[
            { value: 'PDF · JPG · PNG', label: '지원 파일 형식', color: '#6B9FFF' },
            { value: '99.2%', label: 'AI 분석 정확도', color: '#22C55E' },
            { value: '즉시', label: '결과 확인', color: '#D4AF37' },
          ].map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center text-center sm:border-r last:border-r-0"
              style={{ borderColor: 'rgba(75,127,212,0.08)' }}>
              <span className="text-base font-bold mb-1" style={{ color: s.color }}>{s.value}</span>
              <span className="text-xs" style={{ color: '#2D4060' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="border-t py-8 text-center relative z-10"
        style={{ borderColor: 'rgba(75,127,212,0.08)' }}>
        <p className="text-xs" style={{ color: '#1A2A40' }}>insure.dbzone.kr · AI 기반 보험 중복 분석 서비스</p>
        <p className="text-xs mt-1" style={{ color: '#1A2A40' }}>본 서비스는 참고용이며, 실제 보험 변경 전 전문가 상담을 권장합니다.</p>
      </footer>
    </main>
  )
}
