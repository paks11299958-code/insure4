'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, Home as HomeIcon, LayoutDashboard, Sparkles, LogOut, LogIn, UserPlus } from 'lucide-react'

interface AuthUser { id: number; email: string; username?: string }

interface Analysis {
  id: number
  title: string | null
  gender: string | null
  age: string | null
  job: string | null
  health: string | null
  purpose: string | null
  budget: string | null
  fileNames: string | null
  result: {
    summary?: {
      totalPolicies: number
      duplicateCount: number
      estimatedMonthlySavings: string
      riskLevel: string
    }
    aiSummary?: string
    recommendation?: string
  } | null
  createdAt: string
}

interface Toast {
  id: number
  message: string
  deletedItem: Analysis | null
}

const riskStyle = (level: string) => {
  if (level === '높음') return { badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30', dot: 'bg-rose-400', bar: 'border-rose-500/20' }
  if (level === '중간') return { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-400', bar: 'border-amber-500/20' }
  return { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', bar: 'border-emerald-500/20' }
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const truncateFiles = (names: string) => {
  const list = names.split(',').map(s => s.trim())
  if (list.length <= 1) return names
  return `${list[0]} 외 ${list.length - 1}개`
}

const NAV_ITEMS = [
  { href: '/', icon: <HomeIcon size={18} />, label: '홈' },
  { href: '/dashboard', icon: <LayoutDashboard size={18} />, label: '내 분석 내역' },
  { href: '#', icon: <Sparkles size={18} />, label: '프리미엄' },
]

export default function DashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Analysis | null>(null)
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const filtered = analyses.filter(a =>
    (a.title || '').toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(u => {
      if (!u || !u.id) { router.push('/login'); return }
      setAuthUser(u)
      fetch('/api/analyses').then(r => r.json()).then(data => {
        setAnalyses(Array.isArray(data) ? data : [])
        setLoading(false)
      })
    })
  }, [router])

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const showToast = useCallback((message: string, deletedItem: Analysis | null = null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message, deletedItem })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const handleDelete = async (id: number) => {
    const target = analyses.find(a => a.id === id)
    if (!target) return
    setConfirmId(null)

    // 낙관적 업데이트 (즉시 목록에서 제거)
    setAnalyses(prev => prev.filter(a => a.id !== id))
    showToast('삭제되었습니다.', target)

    const res = await fetch(`/api/analyses/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      // 실패 시 복구
      setAnalyses(prev => [target, ...prev].sort((a, b) => b.id - a.id))
      showToast('삭제에 실패했습니다.')
    }
  }

  const handleUndo = async () => {
    if (!toast?.deletedItem) return
    const item = toast.deletedItem
    setToast(null)
    if (toastTimer.current) clearTimeout(toastTimer.current)

    // 목록에 복구 (서버에서 실제 복구는 불가, UI만 복구 후 새로고침)
    setAnalyses(prev => [item, ...prev].sort((a, b) => b.id - a.id))
    // 서버에 재저장은 불가하므로 실제로는 목록 재조회
    const res = await fetch('/api/analyses')
    const data = await res.json()
    setAnalyses(Array.isArray(data) ? data : [])
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#1a1816] flex items-center justify-center text-[#c4b49a]">
        <div className="text-[#7a7060] text-sm">불러오는 중...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#1a1816] pb-24 sm:pb-10 text-[#c4b49a]">

      {/* ── 데스크탑 GNB (sm 이상) ── */}
      <nav className="hidden sm:flex sticky top-0 z-50 w-full backdrop-blur-md bg-[#1e1c1b]/90 border-b border-[#d4b483]/10">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between w-full gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c4974a] to-[#7a5c2e] flex items-center justify-center">
              <ShieldCheck size={15} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-[#f0ebe0] group-hover:text-[#d4b483] transition-colors">AI 보험 분석</span>
          </Link>

          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all
                  ${pathname === item.href
                    ? 'bg-[#d4b483]/15 text-[#f5d28a]'
                    : 'text-[#7a7060] hover:text-[#c4b49a] hover:bg-white/[0.05]'}`}>
                {item.icon} {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {authUser ? (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#c4974a] to-[#7a5c2e] flex items-center justify-center text-[10px] font-bold text-white">
                    {(authUser.username || authUser.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-[#c4b49a]">{authUser.username || authUser.email}</span>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-1 text-xs text-[#7a7060] hover:text-[#d4b483] border border-[#d4b483]/20 rounded-lg px-3 py-1.5 hover:border-[#d4b483]/40 transition-colors cursor-pointer">
                  <LogOut size={12} /> 로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-xs text-[#7a7060] hover:text-[#d4b483] transition-colors px-2 py-1.5 flex items-center gap-1">
                  <LogIn size={13} /> 로그인
                </Link>
                <Link href="/register" className="flex items-center gap-1 text-xs text-[#d4b483] border border-[#d4b483]/30 rounded-lg px-3 py-1.5 hover:bg-[#d4b483]/10 transition-colors">
                  <UserPlus size={13} /> 회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── 모바일 상단 헤더 (sm 미만) ── */}
      <div className="sm:hidden flex items-center justify-between px-5 pt-12 pb-4 bg-[#1e1c1b] border-b border-[#d4b483]/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c4974a] to-[#7a5c2e] flex items-center justify-center">
            <ShieldCheck size={15} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-[#f0ebe0]">AI 보험 분석</span>
        </div>
        <div className="flex items-center gap-2">
          {authUser ? (
            <button onClick={handleLogout} className="text-xs text-[#7a7060] cursor-pointer">로그아웃</button>
          ) : (
            <Link href="/login" className="text-xs text-[#d4b483]">로그인</Link>
          )}
        </div>
      </div>

      {/* ── 페이지 타이틀 영역 ── */}
      <div className="bg-[#1e1c1a] border-b border-[#d4b483]/10">
        <div className="max-w-6xl mx-auto px-5 pt-6 pb-5">
          <h1 className="text-2xl font-bold text-[#f0ebe0] mb-1">분석 내역</h1>
          <p className="text-xs text-[#5a5040]">총 {analyses.length}개의 분석 결과가 저장되어 있습니다</p>

          {analyses.length > 0 && (
            <div className="relative mt-4 max-w-md">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="제목으로 검색"
                className="w-full bg-white/[0.06] border border-[#d4b483]/15 rounded-2xl px-4 py-3 text-sm text-[#f0ebe0] placeholder:text-[#5a5040] outline-none focus:border-[#d4b483]/40 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6a6050] text-xl leading-none cursor-pointer">×</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 모바일 하단 탭바 ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1e1c1b]/95 backdrop-blur-md border-t border-[#d4b483]/10">
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all
                ${pathname === item.href
                  ? 'text-[#f5d28a]'
                  : 'text-[#5a5040] hover:text-[#c4b49a]'}`}>
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* 컨텐츠 */}
      <div className="max-w-6xl mx-auto px-4 pt-5">

        {analyses.length === 0 ? (
          <div className="mt-20 text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-[#7a7060] text-base mb-2">분석 내역이 없습니다</p>
            <p className="text-[#5a5040] text-sm mb-6">보험을 분석하면 여기에 저장됩니다</p>
            <Link href="/" className="inline-block px-6 py-3 bg-[#d4b483]/15 border border-[#d4b483]/30 rounded-2xl text-[#d4b483] text-sm font-medium">
              분석 시작하기
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-[#7a7060] text-sm">"{search}" 검색 결과가 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" ref={menuRef}>
              {filtered.map(a => {
                const summary = a.result?.summary
                const rs = summary ? riskStyle(summary.riskLevel) : null
                const isOpen = selected?.id === a.id
                const isMenuOpen = openMenu === a.id

                return (
                  <div
                    key={a.id}
                    className={`bg-[#242220] rounded-3xl overflow-hidden border flex flex-col ${rs?.bar ?? 'border-[#d4b483]/10'}`}
                    style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.4)' }}
                  >
                    {/* 카드 상단 */}
                    <div className="px-5 pt-5 pb-3 flex-1">
                      <div className="flex items-start justify-between gap-2 mb-4">
                        {/* 제목 + 정보 */}
                        <div className="min-w-0 flex-1">
                          <h2 className="text-base font-bold text-[#f0ebe0] leading-snug truncate">
                            {a.title || '제목 없음'}
                          </h2>
                          <p className="text-xs text-[#5a5040] mt-1 leading-relaxed">
                            {[a.gender, a.age, a.job].filter(Boolean).join(' · ')}
                          </p>
                        </div>

                        {/* 위험도 + ⋮ 메뉴 */}
                        <div className="flex items-center gap-2 shrink-0">
                          {summary && rs && (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${rs.badge}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${rs.dot} animate-pulse`} />
                              {summary.riskLevel}
                            </div>
                          )}

                          {/* ⋮ 드롭다운 메뉴 */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenu(isMenuOpen ? null : a.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-xl text-[#7a7060] hover:text-[#c4b49a] hover:bg-white/[0.08] transition-colors cursor-pointer text-lg"
                            >
                              ⋮
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 top-10 z-20 w-40 bg-[#2e2c2a] border border-[#d4b483]/20 rounded-2xl shadow-2xl overflow-hidden">
                                <Link
                                  href={`/report/${a.id}`}
                                  target="_blank"
                                  onClick={() => setOpenMenu(null)}
                                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#c4b49a] hover:bg-white/[0.06] transition-colors"
                                >
                                  <span>📄</span> 결과 보기
                                </Link>
                                <button
                                  onClick={() => { setSelected(isOpen ? null : a); setOpenMenu(null) }}
                                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#c4b49a] hover:bg-white/[0.06] transition-colors cursor-pointer"
                                >
                                  <span>🤖</span> AI 요약
                                </button>
                                <div className="border-t border-[#d4b483]/10 mx-3" />
                                <button
                                  onClick={() => { setConfirmId(a.id); setOpenMenu(null) }}
                                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <span>🗑️</span> 삭제
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 핵심 지표 */}
                      {summary && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-[#1a1816] rounded-2xl p-3 text-center">
                            <div className="text-base font-bold text-emerald-400 leading-tight">{summary.estimatedMonthlySavings}</div>
                            <div className="text-[11px] text-[#5a5040] mt-1">월 절약</div>
                          </div>
                          <div className="bg-[#1a1816] rounded-2xl p-3 text-center">
                            <div className="text-base font-bold text-rose-400 leading-tight">{summary.duplicateCount}</div>
                            <div className="text-[11px] text-[#5a5040] mt-1">중복 항목</div>
                          </div>
                          <div className="bg-[#1a1816] rounded-2xl p-3 text-center">
                            <div className="text-base font-bold text-[#d4b483] leading-tight">{summary.totalPolicies}</div>
                            <div className="text-[11px] text-[#5a5040] mt-1">총 보험</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 날짜 + 파일 */}
                    <div className="px-5 py-3 flex items-center justify-between border-t border-[#d4b483]/08">
                      <span className="text-xs text-[#5a5040]">{formatDate(a.createdAt)}</span>
                      {a.fileNames && (
                        <span className="text-xs text-[#5a5040] truncate max-w-[120px]">📎 {truncateFiles(a.fileNames)}</span>
                      )}
                    </div>

                    {/* 버튼 */}
                    <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                      <Link
                        href={`/report/${a.id}`}
                        target="_blank"
                        className="flex items-center justify-center py-3 bg-[#d4b483] rounded-2xl text-[#1a1410] text-sm font-bold transition-opacity hover:opacity-90"
                      >
                        결과 보기
                      </Link>
                      <button
                        onClick={() => setSelected(isOpen ? null : a)}
                        className="flex items-center justify-center py-3 bg-white/[0.06] border border-[#d4b483]/20 rounded-2xl text-[#c4b49a] text-sm font-medium hover:bg-white/[0.1] transition-colors cursor-pointer"
                      >
                        {isOpen ? '접기 ▲' : 'AI 요약 ▼'}
                      </button>
                    </div>

                    {/* AI 요약 펼침 */}
                    {isOpen && a.result && (
                      <div className="border-t border-[#d4b483]/10 mx-4 mb-4 pt-4 space-y-3">
                        {a.result.aiSummary && (
                          <div>
                            <p className="text-xs font-bold text-[#d4b483] mb-1.5">AI 요약</p>
                            <p className="text-sm text-[#c4b49a] leading-relaxed whitespace-pre-wrap">{a.result.aiSummary}</p>
                          </div>
                        )}
                        {a.result.recommendation && (
                          <div>
                            <p className="text-xs font-bold text-[#d4b483] mb-1.5">추천</p>
                            <p className="text-sm text-[#c4b49a] leading-relaxed whitespace-pre-wrap">{a.result.recommendation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-center text-xs text-[#4a4035] mt-6">
              {search ? `${filtered.length}개 검색됨 (전체 ${analyses.length}개)` : `총 ${analyses.length}개`}
            </p>
          </>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {confirmId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setConfirmId(null)}
        >
          <div
            className="w-full sm:max-w-sm bg-[#242220] rounded-t-3xl sm:rounded-3xl p-6 border border-[#d4b483]/15"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🗑️</div>
              <h3 className="text-base font-bold text-[#f0ebe0] mb-1">분석 내역을 삭제할까요?</h3>
              <p className="text-sm text-[#7a7060]">삭제된 데이터는 복구되지 않습니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="py-3.5 rounded-2xl bg-white/[0.06] border border-[#d4b483]/15 text-[#c4b49a] text-sm font-medium cursor-pointer hover:bg-white/[0.1] transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                className="py-3.5 rounded-2xl bg-rose-500/90 hover:bg-rose-500 text-white text-sm font-bold cursor-pointer transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#2e2c2a] border border-[#d4b483]/20 rounded-2xl px-5 py-3.5 shadow-2xl"
          style={{ minWidth: '240px' }}>
          <span className="text-sm text-[#f0ebe0] flex-1">{toast.message}</span>
          {toast.deletedItem && (
            <button
              onClick={handleUndo}
              className="text-sm text-[#d4b483] font-bold hover:text-[#f5d060] transition-colors cursor-pointer shrink-0"
            >
              실행 취소
            </button>
          )}
        </div>
      )}
    </main>
  )
}
