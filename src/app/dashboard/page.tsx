'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck, LogOut, LogIn, UserPlus, Menu, X,
  AlertTriangle, FileBarChart2, PlusCircle, ExternalLink, Trash2, Bot, ChevronUp,
} from 'lucide-react'
import Image from 'next/image'

interface AuthUser { id: number; email: string; username?: string }
interface Analysis {
  id: number; title: string | null; gender: string | null; age: string | null
  job: string | null; health: string | null; purpose: string | null; budget: string | null
  fileNames: string | null
  result: {
    summary?: { totalPolicies: number; duplicateCount: number; estimatedMonthlySavings: string; riskLevel: string }
    aiSummary?: string; recommendation?: string
  } | null
  createdAt: string
}
interface Toast { id: number; message: string; deletedItem: Analysis | null }

const riskStyle = (level: string) => {
  if (level === '높음') return { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', cardBorder: '#FECACA' }
  if (level === '중간') return { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', cardBorder: '#FDE68A' }
  return { color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', cardBorder: '#BBF7D0' }
}
const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
const truncateFiles = (names: string) => {
  const list = names.split(',').map(s => s.trim())
  return list.length <= 1 ? names : `${list[0]} 외 ${list.length-1}개`
}

const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/analyze', label: 'AI 분석' },
  { href: '/dashboard', label: '분석 내역' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [authUser, setAuthUser]     = useState<AuthUser | null>(null)
  const [analyses, setAnalyses]     = useState<Analysis[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<Analysis | null>(null)
  const [search, setSearch]         = useState('')
  const [openMenu, setOpenMenu]     = useState<number | null>(null)
  const [confirmId, setConfirmId]   = useState<number | null>(null)
  const [toast, setToast]           = useState<Toast | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const filtered = analyses.filter(a => (a.title||'').toLowerCase().includes(search.toLowerCase()))
  const lowRiskCount  = analyses.filter(a => a.result?.summary?.riskLevel === '낮음').length
  const medRiskCount  = analyses.filter(a => a.result?.summary?.riskLevel === '중간').length
  const highRiskCount = analyses.filter(a => a.result?.summary?.riskLevel === '높음').length

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(u => {
      if (!u||!u.id) { router.push('/login'); return }
      setAuthUser(u)
      fetch('/api/analyses').then(r=>r.json()).then(data => { setAnalyses(Array.isArray(data)?data:[]); setLoading(false) })
    })
  }, [router])

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => { await fetch('/api/auth/logout',{method:'POST'}); router.push('/') }

  const showToast = useCallback((message:string, deletedItem:Analysis|null=null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({id:Date.now(), message, deletedItem})
    toastTimer.current = setTimeout(()=>setToast(null), 4000)
  }, [])

  const handleDelete = async (id:number) => {
    const target = analyses.find(a=>a.id===id)
    if (!target) return
    setConfirmId(null); setAnalyses(prev=>prev.filter(a=>a.id!==id)); showToast('삭제되었습니다.', target)
    const res = await fetch(`/api/analyses/${id}`,{method:'DELETE'})
    if (!res.ok) { setAnalyses(prev=>[target,...prev].sort((a,b)=>b.id-a.id)); showToast('삭제에 실패했습니다.') }
  }

  const handleUndo = async () => {
    if (!toast?.deletedItem) return
    const item = toast.deletedItem; setToast(null)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setAnalyses(prev=>[item,...prev].sort((a,b)=>b.id-a.id))
    const res = await fetch('/api/analyses'); const data = await res.json()
    setAnalyses(Array.isArray(data)?data:[])
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#F9FAFB' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#E5E7EB', borderTopColor: '#111827' }} />
        <span className="text-sm" style={{ color: '#9CA3AF' }}>불러오는 중...</span>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen" style={{ background: '#F9FAFB', color: '#111827' }}>

      {/* GNB */}
      <nav className="sticky top-0 z-50"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #E5E7EB' }}>
        <div className="max-w-[1120px] mx-auto px-5 h-[60px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo2.png" alt="로고" width={32} height={32} style={{ borderRadius: 8 }} />
            <span className="text-[13px] font-bold" style={{ color: '#111827' }}>AI보험분석</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
                style={item.href === '/dashboard' ? { color: '#111827', background: '#F3F4F6', fontWeight: 700 } : { color: '#6B7280' }}
                onMouseEnter={e => { if (item.href !== '/dashboard') { const el = e.currentTarget as HTMLElement; el.style.color = '#111827'; el.style.background = '#F3F4F6' }}}
                onMouseLeave={e => { if (item.href !== '/dashboard') { const el = e.currentTarget as HTMLElement; el.style.color = '#6B7280'; el.style.background = 'transparent' }}}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            {authUser ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: '#111827', color: 'white' }}>
                    {(authUser.username||authUser.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#374151' }}>{authUser.username||authUser.email}</span>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all"
                  style={{ border: '1px solid #E5E7EB', color: '#9CA3AF' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#374151'; el.style.borderColor = '#D1D5DB' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#9CA3AF'; el.style.borderColor = '#E5E7EB' }}>
                  <LogOut size={11}/> 로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2 rounded-xl text-[13px] font-medium transition-all" style={{ color: '#6B7280' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#111827'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#6B7280'}>
                  <span className="flex items-center gap-1.5"><LogIn size={13}/>로그인</span>
                </Link>
                <Link href="/register" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold transition-all"
                  style={{ background: '#111827', color: 'white' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1F2937'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#111827'}>
                  <UserPlus size={13}/> 무료 시작
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden cursor-pointer p-2 rounded-xl" style={{ border: '1px solid #E5E7EB', color: '#374151' }}
            onClick={() => setMobileMenuOpen(v=>!v)}>
            {mobileMenuOpen ? <X size={18}/> : <Menu size={18}/>}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t px-5 py-4 flex flex-col gap-1" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href} className="px-4 py-3 rounded-xl text-sm font-medium" style={{ color: '#374151' }}
                onClick={() => setMobileMenuOpen(false)}>{item.label}</Link>
            ))}
            <div className="border-t mt-2 pt-3" style={{ borderColor: '#F3F4F6' }}>
              {authUser
                ? <button onClick={() => { handleLogout(); setMobileMenuOpen(false) }} className="px-4 py-3 rounded-xl text-sm text-left cursor-pointer w-full" style={{ color: '#9CA3AF' }}>로그아웃</button>
                : <>
                    <Link href="/login" className="block px-4 py-3 rounded-xl text-sm" style={{ color: '#374151' }} onClick={() => setMobileMenuOpen(false)}>로그인</Link>
                    <Link href="/register" className="block px-4 py-3 rounded-xl text-sm font-bold text-center mt-1" style={{ background: '#111827', color: 'white' }} onClick={() => setMobileMenuOpen(false)}>무료 시작</Link>
                  </>
              }
            </div>
          </div>
        )}
      </nav>

      {/* 페이지 헤더 */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
        <div className="max-w-[1120px] mx-auto px-5 pt-7 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-black mb-1" style={{ color: '#111827', letterSpacing: '-0.03em' }}>분석 내역</h1>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>총 {analyses.length}개의 분석 결과가 저장되어 있습니다</p>
            </div>
            <Link href="/analyze"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold self-start sm:self-auto transition-all"
              style={{ background: '#111827', color: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#1F2937'; el.style.transform = 'scale(1.02)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#111827'; el.style.transform = 'scale(1)' }}>
              <PlusCircle size={13}/> 새 분석
            </Link>
          </div>

          {/* 요약 통계 */}
          {analyses.length > 0 && (
            <div className="rounded-2xl mb-5" style={{ border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
              <div className="grid grid-cols-4 divide-x" style={{ borderColor: '#E5E7EB' }}>
                {[
                  { icon: <FileBarChart2 size={13}/>, value: analyses.length, label: '총 분석', color: '#111827' },
                  { icon: <ShieldCheck size={13}/>,   value: lowRiskCount,    label: '낮음',   color: '#22C55E' },
                  { icon: <AlertTriangle size={13}/>, value: medRiskCount,    label: '중간',   color: '#F59E0B' },
                  { icon: <AlertTriangle size={13}/>, value: highRiskCount,   label: '고위험', color: '#EF4444' },
                ].map((s,i) => (
                  <div key={i} className="flex flex-col sm:flex-row items-center sm:items-start gap-2 py-4 px-4 text-center sm:text-left">
                    <span className="mt-0.5" style={{ color: s.color }}>{s.icon}</span>
                    <div>
                      <div className="font-black leading-none" style={{ color: s.color, fontSize: 20 }}>{s.value}</div>
                      <div className="mt-1 text-xs" style={{ color: '#9CA3AF' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 검색 */}
          {analyses.length > 0 && (
            <div className="relative max-w-md">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </div>
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="제목으로 검색"
                className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl outline-none transition-all"
                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#111827' }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = '#111827' }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB' }}
              />
              {search && (
                <button onClick={()=>setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none cursor-pointer"
                  style={{ color: '#9CA3AF' }}>×</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="max-w-[1120px] mx-auto px-4 pt-6 pb-16">

        {analyses.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
              <FileBarChart2 size={36} color="#D1D5DB"/>
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#111827' }}>분석 내역이 없습니다</h2>
            <p className="text-sm mb-1" style={{ color: '#6B7280' }}>보험을 분석하면 여기에 저장됩니다</p>
            <p className="text-xs mb-8" style={{ color: '#9CA3AF' }}>PDF, 이미지, 텍스트 파일을 업로드하면 AI가 즉시 분석합니다</p>
            <Link href="/analyze"
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all"
              style={{ background: '#111827', color: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#1F2937'; el.style.transform = 'scale(1.03)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#111827'; el.style.transform = 'scale(1)' }}>
              <PlusCircle size={15}/> 분석 시작하기
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-sm" style={{ color: '#9CA3AF' }}>&ldquo;{search}&rdquo; 검색 결과가 없습니다.</p>
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
                  <div key={a.id} className="rounded-2xl overflow-hidden transition-all duration-200"
                    style={{ background: '#FFFFFF', border: `1px solid ${rs ? rs.cardBorder : '#E5E7EB'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; el.style.transform = 'translateY(0)' }}>

                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="min-w-0 flex-1">
                          <h2 className="text-sm font-bold leading-snug truncate" style={{ color: '#111827' }}>{a.title||'제목 없음'}</h2>
                          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{[a.gender,a.age,a.job].filter(Boolean).join(' · ')}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {summary && rs && (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold"
                              style={{ color: rs.color, background: rs.bg, borderColor: rs.border }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: rs.color }}/>
                              {summary.riskLevel}
                            </span>
                          )}
                          <div className="relative">
                            <button onClick={() => setOpenMenu(isMenuOpen ? null : a.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-lg transition-all cursor-pointer"
                              style={{ color: '#9CA3AF' }}
                              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#374151'; el.style.background = '#F3F4F6' }}
                              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#9CA3AF'; el.style.background = 'transparent' }}>
                              ⋮
                            </button>
                            {isMenuOpen && (
                              <div className="absolute right-0 top-9 z-20 w-40 rounded-xl overflow-hidden shadow-lg"
                                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                                <Link href={`/report/${a.id}`} target="_blank" onClick={() => setOpenMenu(null)}
                                  className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                                  style={{ color: '#374151' }}
                                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#F9FAFB' }}
                                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent' }}>
                                  <ExternalLink size={12}/> 결과 보기
                                </Link>
                                <button onClick={() => { setSelected(isOpen?null:a); setOpenMenu(null) }}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors cursor-pointer"
                                  style={{ color: '#374151' }}
                                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#F9FAFB' }}
                                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent' }}>
                                  <Bot size={12}/> AI 요약
                                </button>
                                <div className="mx-3 my-1 h-px" style={{ background: '#F3F4F6' }}/>
                                <button onClick={() => { setConfirmId(a.id); setOpenMenu(null) }}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors cursor-pointer"
                                  style={{ color: '#EF4444' }}
                                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(239,68,68,0.05)' }}
                                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent' }}>
                                  <Trash2 size={12}/> 삭제
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 핵심 지표 */}
                      {summary && (
                        <div className="grid grid-cols-3 rounded-xl overflow-hidden" style={{ border: '1px solid #F3F4F6' }}>
                          {[
                            { value: summary.estimatedMonthlySavings, label: '월 절약', color: '#22C55E' },
                            { value: summary.duplicateCount,          label: '중복 항목', color: '#EF4444' },
                            { value: summary.totalPolicies,           label: '총 보험',  color: '#111827' },
                          ].map((m,i) => (
                            <div key={i} className="flex flex-col items-center py-3.5 border-r last:border-r-0 text-center"
                              style={{ borderColor: '#F3F4F6', background: '#F9FAFB' }}>
                              <span className="text-sm font-bold leading-none truncate px-1 max-w-full" style={{ color: m.color }}>{m.value}</span>
                              <span className="text-[10px] mt-1.5" style={{ color: '#9CA3AF' }}>{m.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 날짜 + 파일 */}
                    <div className="px-5 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid #F3F4F6' }}>
                      <span className="text-[11px]" style={{ color: '#D1D5DB' }}>{formatDate(a.createdAt)}</span>
                      {a.fileNames && (
                        <span className="text-[11px] truncate max-w-[110px]" style={{ color: '#D1D5DB' }}>📎 {truncateFiles(a.fileNames)}</span>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                      <Link href={`/report/${a.id}`} target="_blank"
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
                        style={{ background: '#111827', color: 'white' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#1F2937'; el.style.transform = 'scale(1.02)' }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#111827'; el.style.transform = 'scale(1)' }}>
                        <ExternalLink size={11}/> 결과 보기
                      </Link>
                      <button onClick={() => setSelected(isOpen?null:a)}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border cursor-pointer transition-all"
                        style={{ borderColor: '#E5E7EB', color: '#374151', background: '#FFFFFF' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#F9FAFB'; el.style.borderColor = '#D1D5DB' }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#FFFFFF'; el.style.borderColor = '#E5E7EB' }}>
                        {isOpen ? <><ChevronUp size={11}/> 접기</> : <><Bot size={11}/> AI 요약</>}
                      </button>
                    </div>

                    {/* AI 요약 펼침 */}
                    {isOpen && a.result && (
                      <div className="mx-4 mb-4 pt-4 space-y-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                        {a.result.aiSummary && (
                          <div>
                            <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: '#9CA3AF' }}>AI 요약</p>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#6B7280' }}>{a.result.aiSummary}</p>
                          </div>
                        )}
                        {a.result.recommendation && (
                          <div>
                            <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: '#9CA3AF' }}>추천</p>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#6B7280' }}>{a.result.recommendation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-center text-xs mt-6" style={{ color: '#D1D5DB' }}>
              {search ? `${filtered.length}개 검색됨 (전체 ${analyses.length}개)` : `총 ${analyses.length}개`}
            </p>
          </>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {confirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setConfirmId(null)}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Trash2 size={20} color="#EF4444"/>
              </div>
              <h3 className="font-bold mb-1.5" style={{ color: '#111827' }}>분석 내역을 삭제할까요?</h3>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>삭제된 데이터는 복구되지 않습니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmId(null)}
                className="py-3 rounded-xl text-sm font-medium border cursor-pointer transition-all"
                style={{ background: '#FFFFFF', borderColor: '#E5E7EB', color: '#374151' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFFFFF'}>
                취소
              </button>
              <button onClick={() => handleDelete(confirmId)}
                className="py-3 rounded-xl text-sm font-bold cursor-pointer transition-all"
                style={{ background: '#EF4444', color: 'white' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#DC2626'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#EF4444'}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl"
          style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', minWidth: '240px' }}>
          <span className="text-sm flex-1 text-white">{toast.message}</span>
          {toast.deletedItem && (
            <button onClick={handleUndo} className="text-xs font-bold cursor-pointer transition-colors shrink-0"
              style={{ color: '#9CA3AF' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FFFFFF'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#9CA3AF'}>
              실행 취소
            </button>
          )}
        </div>
      )}
    </main>
  )
}
