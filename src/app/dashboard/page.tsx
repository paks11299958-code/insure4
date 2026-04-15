'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck, Home as HomeIcon, LayoutDashboard, Sparkles,
  LogOut, LogIn, UserPlus, Menu, X,
  AlertTriangle, FileBarChart2,
  PlusCircle, ExternalLink, Trash2, Bot,
  ChevronUp,
} from 'lucide-react'

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
  if (level === '높음') return { color:'#EF4444', bg:'rgba(239,68,68,.1)', border:'rgba(239,68,68,.3)', dot:'#EF4444', cardBorder:'rgba(239,68,68,.2)' }
  if (level === '중간') return { color:'#F59E0B', bg:'rgba(245,158,11,.1)', border:'rgba(245,158,11,.3)', dot:'#F59E0B', cardBorder:'rgba(245,158,11,.18)' }
  return { color:'#22C55E', bg:'rgba(34,197,94,.1)', border:'rgba(34,197,94,.3)', dot:'#22C55E', cardBorder:'rgba(34,197,94,.18)' }
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
  { href:'/', icon:<HomeIcon size={16}/>, label:'홈' },
  { href:'/dashboard', icon:<LayoutDashboard size={16}/>, label:'내 분석 내역' },
  { href:'#', icon:<Sparkles size={16}/>, label:'프리미엄' },
]

export default function DashboardPage() {
  const router   = useRouter()
  const pathname = usePathname()
  const [authUser, setAuthUser]         = useState<AuthUser | null>(null)
  const [analyses, setAnalyses]         = useState<Analysis[]>([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState<Analysis | null>(null)
  const [search, setSearch]             = useState('')
  const [openMenu, setOpenMenu]         = useState<number | null>(null)
  const [confirmId, setConfirmId]       = useState<number | null>(null)
  const [toast, setToast]               = useState<Toast | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef    = useRef<HTMLDivElement | null>(null)

  const filtered = analyses.filter(a => (a.title||'').toLowerCase().includes(search.toLowerCase()))

  // 요약 통계
  const lowRiskCount  = analyses.filter(a => a.result?.summary?.riskLevel === '낮음').length
  const medRiskCount  = analyses.filter(a => a.result?.summary?.riskLevel === '중간').length
  const highRiskCount = analyses.filter(a => a.result?.summary?.riskLevel === '높음').length

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(u => {
      if (!u||!u.id) { router.push('/login'); return }
      setAuthUser(u)
      fetch('/api/analyses').then(r=>r.json()).then(data => {
        setAnalyses(Array.isArray(data)?data:[])
        setLoading(false)
      })
    })
  }, [router])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null)
    }
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
    setConfirmId(null)
    setAnalyses(prev=>prev.filter(a=>a.id!==id))
    showToast('삭제되었습니다.', target)
    const res = await fetch(`/api/analyses/${id}`,{method:'DELETE'})
    if (!res.ok) {
      setAnalyses(prev=>[target,...prev].sort((a,b)=>b.id-a.id))
      showToast('삭제에 실패했습니다.')
    }
  }

  const handleUndo = async () => {
    if (!toast?.deletedItem) return
    const item = toast.deletedItem
    setToast(null)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setAnalyses(prev=>[item,...prev].sort((a,b)=>b.id-a.id))
    const res = await fetch('/api/analyses')
    const data = await res.json()
    setAnalyses(Array.isArray(data)?data:[])
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{background:'#07091A'}}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-t-[#6B9FFF] border-[#4B7FD4]/20 animate-spin"/>
        <span className="text-sm" style={{color:'#64707E'}}>불러오는 중...</span>
      </div>
    </main>
  )

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes orbDrift { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(24px,-16px) scale(1.04)} 70%{transform:translate(-14px,8px) scale(.97)} }
        @keyframes pulseRing { 0%{box-shadow:0 0 0 0 rgba(75,127,212,.45)} 70%{box-shadow:0 0 0 7px rgba(75,127,212,0)} 100%{box-shadow:0 0 0 0 rgba(75,127,212,0)} }
        .fu-1{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .1s both}
        .fu-2{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .2s both}
        .fu-3{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .3s both}
        .spring{transition:all .4s cubic-bezier(.34,1.56,.64,1)}
        .spring-fast{transition:all .25s cubic-bezier(.34,1.56,.64,1)}
      `}</style>

      <main className="min-h-screen text-[#A8B8CC] relative" style={{background:'linear-gradient(160deg,#0C0D12 0%,#10111A 55%,#0C0E14 100%)'}}>

        {/* BG grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage:'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)',
          backgroundSize:'56px 56px',
        }}/>
        {/* BG orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[400px] pointer-events-none" style={{animation:'orbDrift 14s ease-in-out infinite'}}>
          <div style={{width:'100%',height:'100%',background:'radial-gradient(ellipse at 70% 10%,rgba(249,115,22,.05) 0%,transparent 65%)'}}/>
        </div>
        <div className="absolute bottom-0 left-0 w-[360px] h-[300px] pointer-events-none" style={{animation:'orbDrift 18s ease-in-out 5s infinite'}}>
          <div style={{width:'100%',height:'100%',background:'radial-gradient(ellipse at 20% 90%,rgba(75,127,212,.06) 0%,transparent 60%)'}}/>
        </div>

        {/* ── GNB ── */}
        <nav className="sticky top-0 z-50 w-full backdrop-blur-xl border-b" style={{background:'rgba(13,14,18,.92)',borderColor:'rgba(255,255,255,.07)'}}>
          <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#2D5BE3,#1A3A80)'}}>
                <ShieldCheck size={14} className="text-white"/>
              </div>
              <span className="text-sm font-semibold transition-colors group-hover:text-[#6B9FFF]" style={{color:'#A8B8CC'}}>AI 보험 분석</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => {
                const active = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all duration-200"
                    style={active
                      ? {background:'rgba(75,127,212,.14)',color:'#93B4FF',borderColor:'rgba(75,127,212,.3)'}
                      : {background:'transparent',color:'#64707E',borderColor:'transparent'}}
                    onMouseEnter={e => {
                      if (active) return
                      const el = e.currentTarget as HTMLElement
                      el.style.color='#A8B8CC'; el.style.background='rgba(75,127,212,.06)'; el.style.borderColor='rgba(75,127,212,.15)'
                    }}
                    onMouseLeave={e => {
                      if (active) return
                      const el = e.currentTarget as HTMLElement
                      el.style.color='#4E6888'; el.style.background='transparent'; el.style.borderColor='transparent'
                    }}>
                    {item.icon} {item.label}
                  </Link>
                )
              })}
            </div>

            <div className="hidden md:flex items-center gap-2 shrink-0">
              {authUser ? (
                <>
                  <div className="flex items-center gap-1.5 px-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{background:'linear-gradient(135deg,#2D5BE3,#1A3A80)'}}>
                      {(authUser.username||authUser.email).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs" style={{color:'#64707E'}}>{authUser.username||authUser.email}</span>
                  </div>
                  <button onClick={handleLogout}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer"
                    style={{borderColor:'rgba(75,127,212,.2)',color:'#64707E'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#6B9FFF';(e.currentTarget as HTMLElement).style.borderColor='rgba(75,127,212,.4)'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#4E6888';(e.currentTarget as HTMLElement).style.borderColor='rgba(75,127,212,.2)'}}>
                    <LogOut size={11}/> 로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-xs px-2 py-1.5 flex items-center gap-1 transition-colors hover:text-[#E2E8F0]" style={{color:'#64707E'}}><LogIn size={12}/> 로그인</Link>
                  <Link href="/register" className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:opacity-90" style={{borderColor:'rgba(75,127,212,.3)',color:'#6B9FFF',background:'rgba(75,127,212,.08)'}}>
                    <UserPlus size={12}/> 회원가입
                  </Link>
                </>
              )}
            </div>

            <button className="md:hidden cursor-pointer p-1 ml-auto" style={{color:'#6B9FFF'}} onClick={()=>setMobileMenuOpen(v=>!v)}>
              {mobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t px-5 py-4 flex flex-col gap-1" style={{background:'rgba(10,16,30,.97)',borderColor:'rgba(255,255,255,.07)'}}>
              {NAV_ITEMS.map(item => (
                <Link key={item.href} href={item.href} onClick={()=>setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-all ${pathname===item.href?'text-[#93B4FF]':'text-[#4E6888] hover:text-[#A8B8CC]'}`}
                  style={{background:pathname===item.href?'rgba(75,127,212,.12)':'transparent'}}>
                  {item.icon} {item.label}
                </Link>
              ))}
              <div className="border-t mt-2 pt-3" style={{borderColor:'rgba(255,255,255,.07)'}}>
                {authUser
                  ? <button onClick={()=>{handleLogout();setMobileMenuOpen(false)}} className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm text-rose-400 hover:bg-rose-500/[.05] transition-all cursor-pointer w-full"><LogOut size={15}/> 로그아웃</button>
                  : <div className="flex flex-col gap-1">
                      <Link href="/login" onClick={()=>setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm text-[#4E6888] hover:text-[#A8B8CC] transition-all"><LogIn size={15}/> 로그인</Link>
                      <Link href="/register" onClick={()=>setMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm text-[#6B9FFF] hover:bg-[#2D5BE3]/10 transition-all"><UserPlus size={15}/> 회원가입</Link>
                    </div>
                }
              </div>
            </div>
          )}
        </nav>

        {/* ── 페이지 헤더 ── */}
        <div className="border-b" style={{background:'rgba(13,14,18,.7)',borderColor:'rgba(255,255,255,.06)',backdropFilter:'blur(12px)'}}>
          <div className="max-w-6xl mx-auto px-5 pt-7 pb-6">
            <div className="fu-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1 h-5 rounded-full" style={{background:'linear-gradient(180deg,#4B7FD4,#2D5BE3)'}}/>
                  <h1 className="text-2xl font-bold" style={{color:'#E2E8F0',wordBreak:'keep-all'}}>분석 내역</h1>
                </div>
                <p className="text-xs ml-3" style={{color:'#3A424E'}}>총 {analyses.length}개의 분석 결과가 저장되어 있습니다</p>
              </div>
              <Link href="/analyze"
                className="spring-fast flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold self-start sm:self-auto"
                style={{background:'linear-gradient(135deg,#F97316,#C05610)',color:'#FFF7ED',boxShadow:'0 0 20px rgba(249,115,22,.3)'}}
                onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow='0 0 32px rgba(249,115,22,.55)';el.style.transform='scale(1.04)'}}
                onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow='0 0 20px rgba(45,91,227,.3)';el.style.transform='scale(1)'}}>
                <PlusCircle size={13}/> 새 분석
              </Link>
            </div>

            {/* 요약 스탯 */}
            {analyses.length > 0 && (
              <div className="fu-2 rounded-2xl mb-5" style={{padding:'1px',background:'linear-gradient(90deg,rgba(75,127,212,.18) 0%,rgba(75,127,212,.07) 50%,rgba(75,127,212,.18) 100%)'}}>
                <div className="rounded-[15px] px-6 py-4 grid grid-cols-4 gap-4" style={{background:'rgba(10,16,30,.88)',backdropFilter:'blur(12px)'}}>
                  {[
                    {icon:<FileBarChart2 size={13}/>, value:analyses.length, label:'총 분석',   color:'#6B9FFF'},
                    {icon:<ShieldCheck    size={13}/>, value:lowRiskCount,    label:'낮음', color:'#4ADE80'},
                    {icon:<AlertTriangle  size={13}/>, value:medRiskCount,    label:'중간', color:'#FBBF24'},
                    {icon:<AlertTriangle  size={13}/>, value:highRiskCount,   label:'고위험',   color:'#EF4444'},
                  ].map((s,i) => (
                    <div key={i} className="flex flex-col sm:flex-row items-center sm:items-start gap-2 text-center sm:text-left">
                      <span className="mt-0.5 opacity-60" style={{color:s.color}}>{s.icon}</span>
                      <div>
                        <div className="font-bold leading-none" style={{color:s.color,fontSize:'18px'}}>{s.value}</div>
                        <div className="mt-1" style={{color:'#E2E8F0',fontSize:'18px'}}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 검색 */}
            {analyses.length > 0 && (
              <div className="fu-3 relative max-w-md">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{color:'#3A424E'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </div>
                <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="제목으로 검색"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl outline-none transition-all"
                  style={{background:'rgba(75,127,212,.06)',border:'1px solid rgba(75,127,212,.15)',color:'#E2E8F0'}}
                  onFocus={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(75,127,212,.4)';(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.1)'}}
                  onBlur={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(75,127,212,.15)';(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.06)'}}
                />
                {search && (
                  <button onClick={()=>setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none cursor-pointer transition-colors hover:text-[#E2E8F0]"
                    style={{color:'#3A424E'}}>×</button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 컨텐츠 ── */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-6 pb-16">

          {/* 빈 상태 */}
          {analyses.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6" style={{background:'rgba(75,127,212,.08)',border:'1px solid rgba(75,127,212,.15)'}}>
                <FileBarChart2 size={40} color="#2D4060"/>
              </div>
              <h2 className="text-lg font-bold mb-2" style={{color:'#E2E8F0'}}>분석 내역이 없습니다</h2>
              <p className="text-sm mb-1" style={{color:'#64707E',wordBreak:'keep-all'}}>보험을 분석하면 여기에 저장됩니다</p>
              <p className="text-xs mb-8" style={{color:'#3A424E'}}>PDF, 이미지, 텍스트 파일을 업로드하면 AI가 즉시 분석합니다</p>
              <Link href="/analyze"
                className="spring flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold"
                style={{background:'linear-gradient(135deg,#F97316,#C05610)',color:'#FFF7ED',boxShadow:'0 0 24px rgba(249,115,22,.35)'}}
                onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow='0 0 40px rgba(249,115,22,.6)';el.style.transform='scale(1.05)'}}
                onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow='0 0 24px rgba(45,91,227,.35)';el.style.transform='scale(1)'}}>
                <PlusCircle size={15}/> 분석 시작하기
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-12 text-center">
              <p className="text-sm" style={{color:'#64707E'}}>"{search}" 검색 결과가 없습니다.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" ref={menuRef}>
                {filtered.map(a => {
                  const summary   = a.result?.summary
                  const rs        = summary ? riskStyle(summary.riskLevel) : null
                  const isOpen    = selected?.id === a.id
                  const isMenuOpen= openMenu === a.id

                  return (
                    <div key={a.id} className="spring"
                      style={{ padding:'1px', borderRadius:'20px',
                        background: rs
                          ? `linear-gradient(135deg, ${rs.cardBorder} 0%, rgba(75,127,212,.12) 60%, rgba(75,127,212,.06) 100%)`
                          : 'linear-gradient(135deg, rgba(75,127,212,.2) 0%, rgba(75,127,212,.08) 100%)',
                        boxShadow:'0 8px 32px rgba(0,0,0,.45)',
                      }}
                      onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow='0 16px 48px rgba(0,0,0,.6), 0 0 32px rgba(48,111,255,.08)';el.style.transform='translateY(-3px)'}}
                      onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow='0 8px 32px rgba(0,0,0,.45)';el.style.transform='translateY(0)'}}>

                      {/* 아우터 베젤 */}
                      <div style={{borderRadius:'19px',background:'rgba(20,21,30,.97)',backdropFilter:'blur(16px)',padding:'1px'}}>
                        {/* 이너 베젤 */}
                        <div style={{borderRadius:'18px',background:'linear-gradient(135deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.02) 100%)',padding:'1px'}}>
                          {/* 카드 컨텐츠 */}
                          <div style={{borderRadius:'17px',background:'rgba(13,14,22,.94)',overflow:'hidden'}}>

                            {/* 카드 상단 */}
                            <div className="px-5 pt-5 pb-3">
                              <div className="flex items-start justify-between gap-2 mb-4">
                                <div className="min-w-0 flex-1">
                                  <h2 className="text-sm font-bold leading-snug truncate" style={{color:'#E2E8F0'}}>{a.title||'제목 없음'}</h2>
                                  <p className="text-xs mt-1" style={{color:'#3A424E'}}>{[a.gender,a.age,a.job].filter(Boolean).join(' · ')}</p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {summary && rs && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold"
                                      style={{color:rs.color,background:rs.bg,borderColor:rs.border}}>
                                      <span className="w-1.5 h-1.5 rounded-full" style={{background:rs.dot,animation:'pulseRing 2.2s infinite'}}/>
                                      {summary.riskLevel}
                                    </div>
                                  )}

                                  {/* ⋮ 드롭다운 */}
                                  <div className="relative">
                                    <button
                                      onClick={()=>setOpenMenu(isMenuOpen?null:a.id)}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg text-lg transition-all cursor-pointer"
                                      style={{color:'#3A424E'}}
                                      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#A8B8CC';(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.1)'}}
                                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#2D4060';(e.currentTarget as HTMLElement).style.background='transparent'}}>
                                      ⋮
                                    </button>

                                    {isMenuOpen && (
                                      <div className="absolute right-0 top-9 z-20 w-40 rounded-xl overflow-hidden shadow-2xl"
                                        style={{background:'rgba(18,28,50,.98)',border:'1px solid rgba(75,127,212,.2)',backdropFilter:'blur(16px)'}}>
                                        <Link href={`/report/${a.id}`} target="_blank" onClick={()=>setOpenMenu(null)}
                                          className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                                          style={{color:'#A8B8CC'}}
                                          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.08)';(e.currentTarget as HTMLElement).style.color='#E2E8F0'}}
                                          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.color='#A8B8CC'}}>
                                          <ExternalLink size={12}/> 결과 보기
                                        </Link>
                                        <button onClick={()=>{setSelected(isOpen?null:a);setOpenMenu(null)}}
                                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors cursor-pointer"
                                          style={{color:'#A8B8CC'}}
                                          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.08)';(e.currentTarget as HTMLElement).style.color='#E2E8F0'}}
                                          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.color='#A8B8CC'}}>
                                          <Bot size={12}/> AI 요약
                                        </button>
                                        <div className="mx-3 my-1 h-px" style={{background:'rgba(75,127,212,.1)'}}/>
                                        <button onClick={()=>{setConfirmId(a.id);setOpenMenu(null)}}
                                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors cursor-pointer"
                                          style={{color:'#EF4444'}}
                                          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(239,68,68,.08)'}}
                                          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent'}}>
                                          <Trash2 size={12}/> 삭제
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 핵심 지표 */}
                              {summary && (
                                <div className="grid grid-cols-3 rounded-xl overflow-hidden" style={{border:'1px solid rgba(75,127,212,.08)'}}>
                                  {[
                                    {value:summary.estimatedMonthlySavings, label:'월 절약', color:'#4ADE80'},
                                    {value:summary.duplicateCount,          label:'중복 항목', color:'#EF4444'},
                                    {value:summary.totalPolicies,           label:'총 보험',  color:'#D4AF37'},
                                  ].map((m,i) => (
                                    <div key={i} className="flex flex-col items-center py-3.5 border-r last:border-r-0 text-center"
                                      style={{borderColor:'rgba(75,127,212,.08)',background:'rgba(255,255,255,.02)'}}>
                                      <span className="text-sm font-bold leading-none truncate px-1 max-w-full" style={{color:m.color}}>{m.value}</span>
                                      <span className="text-[10px] mt-1.5" style={{color:'#3A424E'}}>{m.label}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* 날짜 + 파일 */}
                            <div className="px-5 py-2.5 flex items-center justify-between border-t" style={{borderColor:'rgba(75,127,212,.06)'}}>
                              <span className="text-[11px]" style={{color:'#3A424E'}}>{formatDate(a.createdAt)}</span>
                              {a.fileNames && (
                                <span className="text-[11px] truncate max-w-[110px]" style={{color:'#3A424E'}}>📎 {truncateFiles(a.fileNames)}</span>
                              )}
                            </div>

                            {/* 액션 버튼 */}
                            <div className="px-4 pb-4 grid grid-cols-2 gap-2 mt-1">
                              <Link href={`/report/${a.id}`} target="_blank"
                                className="spring-fast flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                                style={{background:'linear-gradient(135deg,#F97316,#C05610)',color:'#FFF7ED',boxShadow:'0 0 14px rgba(249,115,22,.25)'}}
                                onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow='0 0 22px rgba(249,115,22,.5)';el.style.transform='scale(1.03)'}}
                                onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow='0 0 14px rgba(45,91,227,.25)';el.style.transform='scale(1)'}}>
                                <ExternalLink size={11}/> 결과 보기
                              </Link>
                              <button
                                onClick={()=>setSelected(isOpen?null:a)}
                                className="spring-fast flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border cursor-pointer"
                                style={{borderColor:'rgba(75,127,212,.2)',color:'#6B9FFF',background:'rgba(75,127,212,.06)'}}
                                onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background='rgba(75,127,212,.12)';el.style.borderColor='rgba(75,127,212,.35)';el.style.color='#93B4FF'}}
                                onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background='rgba(75,127,212,.06)';el.style.borderColor='rgba(75,127,212,.2)';el.style.color='#6B9FFF'}}>
                                {isOpen ? <><ChevronUp size={11}/> 접기</> : <><Bot size={11}/> AI 요약</>}
                              </button>
                            </div>

                            {/* AI 요약 펼침 */}
                            {isOpen && a.result && (
                              <div className="border-t mx-4 mb-4 pt-4 space-y-3" style={{borderColor:'rgba(75,127,212,.08)'}}>
                                {a.result.aiSummary && (
                                  <div>
                                    <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{color:'#2D5BE3'}}>AI 요약</p>
                                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{color:'#7A8FA8'}}>{a.result.aiSummary}</p>
                                  </div>
                                )}
                                {a.result.recommendation && (
                                  <div>
                                    <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{color:'#2D5BE3'}}>추천</p>
                                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{color:'#7A8FA8'}}>{a.result.recommendation}</p>
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-center text-xs mt-6" style={{color:'#1A2A40'}}>
                {search ? `${filtered.length}개 검색됨 (전체 ${analyses.length}개)` : `총 ${analyses.length}개`}
              </p>
            </>
          )}
        </div>

        {/* ── 삭제 확인 모달 ── */}
        {confirmId !== null && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
            style={{background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)'}}
            onClick={()=>setConfirmId(null)}>
            <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
              style={{padding:'1px',background:'linear-gradient(135deg,rgba(239,68,68,.3) 0%,rgba(75,127,212,.15) 100%)'}}
              onClick={e=>e.stopPropagation()}>
              <div style={{borderRadius:'23px',background:'rgba(16,17,26,.98)',backdropFilter:'blur(20px)',padding:'24px'}}>
                <div className="text-center mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)'}}>
                    <Trash2 size={22} color="#EF4444"/>
                  </div>
                  <h3 className="text-base font-bold mb-1.5" style={{color:'#E2E8F0'}}>분석 내역을 삭제할까요?</h3>
                  <p className="text-sm" style={{color:'#64707E'}}>삭제된 데이터는 복구되지 않습니다.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={()=>setConfirmId(null)}
                    className="py-3.5 rounded-2xl text-sm font-medium border cursor-pointer transition-all"
                    style={{background:'rgba(75,127,212,.06)',borderColor:'rgba(75,127,212,.2)',color:'#A8B8CC'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.12)'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.06)'}}>
                    취소
                  </button>
                  <button onClick={()=>handleDelete(confirmId)}
                    className="py-3.5 rounded-2xl text-sm font-bold cursor-pointer transition-all"
                    style={{background:'rgba(239,68,68,.85)',color:'white'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(239,68,68,1)'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(239,68,68,.85)'}}>
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 토스트 ── */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl"
            style={{background:'rgba(20,21,30,.97)',border:'1px solid rgba(75,127,212,.22)',backdropFilter:'blur(16px)',minWidth:'240px',boxShadow:'0 8px 32px rgba(0,0,0,.5)'}}>
            <span className="text-sm flex-1" style={{color:'#E2E8F0'}}>{toast.message}</span>
            {toast.deletedItem && (
              <button onClick={handleUndo}
                className="text-xs font-bold cursor-pointer transition-colors shrink-0"
                style={{color:'#6B9FFF'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#93B4FF'}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#6B9FFF'}}>
                실행 취소
              </button>
            )}
          </div>
        )}

      </main>
    </>
  )
}
