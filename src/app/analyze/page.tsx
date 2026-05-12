'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { LogOut, LogIn, UserPlus, Menu, X, UploadCloud, FileText, Download, Printer, Bot } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import CodefImportButton from './CodefImportButton'

interface Duplicate {
  item: string; policies: string; coverageA: string; coverageB: string
  type: string; monthlySavings: string; severity: string; action: string
}
interface AnalysisResult {
  summary: { totalPolicies: number; duplicateCount: number; estimatedMonthlySavings: string; riskLevel: string }
  duplicates: Duplicate[]; aiSummary: string; recommendation: string; disclaimer: string
}
interface UploadedFile { file: File; name: string; size: number }
interface UserInfo { title: string; gender: string; age: string; job: string; health: string; purpose: string; budget: string }
interface AuthUser { id: number; email: string; username?: string }

const STEPS = ['파일 변환 중...','AI가 문서를 읽는 중...','보장 항목 추출 중...','중복 패턴 분석 중...','보고서 생성 중...']
const fmtSize = (b: number) => b < 1024 ? b+'B' : b < 1048576 ? (b/1024).toFixed(1)+'KB' : (b/1048576).toFixed(1)+'MB'
const isPDF   = (n: string) => /\.pdf$/i.test(n)
const isImage = (n: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(n)
const fileIcon= (n: string) => isPDF(n)?'📕':isImage(n)?'🖼️':/\.docx?$/i.test(n)?'📘':'📄'
const getMediaType = (n: string) => /\.png$/i.test(n)?'image/png':/\.gif$/i.test(n)?'image/gif':/\.webp$/i.test(n)?'image/webp':'image/jpeg'

async function toBase64(file: File): Promise<string> {
  return new Promise((res,rej) => {
    const r = new FileReader()
    r.onload = e => res(((e.target?.result as string)||'').split(',')[1]||'')
    r.onerror = () => rej(new Error('파일 읽기 실패'))
    r.readAsDataURL(file)
  })
}
async function toText(file: File): Promise<string> {
  return new Promise(res => {
    const r = new FileReader()
    r.onload = e => res((e.target?.result as string)||'')
    r.onerror = () => res('')
    r.readAsText(file, 'utf-8')
  })
}

const FIELD_LABELS: Record<keyof UserInfo, string> = { title:'제목', gender:'성별', age:'연령', job:'직업', health:'건강', purpose:'목적', budget:'예산' }

const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/analyze', label: 'AI 분석' },
  { href: '/dashboard', label: '분석 내역' },
]

export default function AnalyzePage() {
  const [files, setFiles]               = useState<UploadedFile[]>([])
  const [dragging, setDragging]         = useState(false)
  const [loading, setLoading]           = useState(false)
  const [stepMsg, setStepMsg]           = useState(STEPS[0])
  const [stepIdx, setStepIdx]           = useState(0)
  const [error, setError]               = useState('')
  const [result, setResult]             = useState<AnalysisResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ivRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const [userInfo, setUserInfo]         = useState<UserInfo>({ title:'', gender:'', age:'', job:'', health:'', purpose:'', budget:'' })
  const [authUser, setAuthUser]         = useState<AuthUser | null>(null)
  const [emptyFields, setEmptyFields]   = useState<string[]>([])
  const [showEmptyWarning, setShowEmptyWarning] = useState(false)
  const titleRef   = useRef<HTMLInputElement>(null)
  const genderRef  = useRef<HTMLInputElement>(null)
  const ageRef     = useRef<HTMLInputElement>(null)
  const jobRef     = useRef<HTMLInputElement>(null)
  const healthRef  = useRef<HTMLInputElement>(null)
  const purposeRef = useRef<HTMLInputElement>(null)
  const budgetRef  = useRef<HTMLInputElement>(null)
  const [autoPurpose, setAutoPurpose]   = useState(false)
  const [autoTitle, setAutoTitle]       = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [restoredInfo, setRestoredInfo] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAdditional, setShowAdditional] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(u => {
      setAuthUser(u)
      if (u?.id) {
        const saved = sessionStorage.getItem('pendingUserInfo')
        if (saved) {
          try { const parsed = JSON.parse(saved); setUserInfo(parsed); setRestoredInfo(true); sessionStorage.removeItem('pendingUserInfo') } catch { /* 무시 */ }
        }
      }
    }).catch(() => {})
  }, [])

  const handleLogout = async () => { await fetch('/api/auth/logout',{method:'POST'}); setAuthUser(null) }

  const MAX_FILES = 5
  const addFiles = useCallback((list: FileList | File[]) => {
    setFiles(prev => {
      const names = new Set(prev.map(f=>f.name))
      const newFiles = Array.from(list).filter(f=>!names.has(f.name)).map(f=>({file:f,name:f.name,size:f.size}))
      return [...prev, ...newFiles].slice(0, MAX_FILES)
    })
  }, [])

  const handleAnalyzeClick = () => {
    if (!authUser) { setShowLoginModal(true); return }
    const requiredFields: (keyof UserInfo)[] = ['title','gender','age']
    const empty = requiredFields.filter(k => !userInfo[k].trim())
    if (empty.length > 0) { setEmptyFields(empty); setShowEmptyWarning(true); return }
    analyze()
  }

  const handleWarningProceed = () => {
    setShowEmptyWarning(false)
    if (!userInfo.title.trim()) setUserInfo(p=>({...p,title:'내보험 컨설팅'}))
    analyze()
  }
  const handleWarningCancel = () => {
    setShowEmptyWarning(false)
    const first = emptyFields[0] as keyof UserInfo
    setTimeout(() => {
      if (first==='title')   titleRef.current?.focus()
      else if (first==='gender')  genderRef.current?.focus()
      else if (first==='age')     ageRef.current?.focus()
      else if (first==='job')     jobRef.current?.focus()
      else if (first==='health')  healthRef.current?.focus()
      else if (first==='budget')  budgetRef.current?.focus()
      else if (first==='purpose') purposeRef.current?.focus()
    }, 50)
  }
  const handleLoginModalGo = (path: '/login'|'/register') => {
    sessionStorage.setItem('pendingUserInfo', JSON.stringify(userInfo))
    window.location.href = `${path}?returnTo=/analyze`
  }

  const analyze = async () => {
    setError(''); setResult(null); setLoading(true); setStepIdx(0); setStepMsg(STEPS[0])
    let si = 0
    ivRef.current = setInterval(()=>{ si=(si+1)%STEPS.length; setStepIdx(si); setStepMsg(STEPS[si]) }, 2000)
    try {
      const pdfFiles = files.filter(f=>isPDF(f.name))
      const imgFiles = files.filter(f=>isImage(f.name))
      const txtFiles = files.filter(f=>!isPDF(f.name)&&!isImage(f.name))
      const fileNames = files.map(f=>f.name)
      let body: Record<string,unknown>
      if (pdfFiles.length > 0) {
        setStepMsg('PDF를 AI에 전달 중...')
        const pdfs = await Promise.all(pdfFiles.map(async f=>({data:await toBase64(f.file),name:f.name})))
        let extraText = ''
        for (const f of txtFiles) extraText += `\n\n=== ${f.name} ===\n${(await toText(f.file)).slice(0,3000)}`
        body = { pdfs, fileNames, text: extraText, userInfo }
      } else if (imgFiles.length > 0) {
        setStepMsg('이미지에서 보험 내용 추출 중...')
        const images = await Promise.all(imgFiles.map(async f=>({data:await toBase64(f.file),mediaType:getMediaType(f.name)})))
        let extraText = ''
        for (const f of txtFiles) extraText += `\n\n=== ${f.name} ===\n${(await toText(f.file)).slice(0,3000)}`
        body = { images, fileNames, text: extraText, userInfo }
      } else {
        let combined = ''
        for (const f of txtFiles) combined += `\n\n=== ${f.name} ===\n${(await toText(f.file)).slice(0,4000)}`
        body = { text: combined, fileNames, userInfo }
      }
      setStepMsg('AI 중복 분석 중...')
      const res = await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||`오류 ${res.status}`)
      setResult(data)
      if (authUser) {
        fetch('/api/analyses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userInfo,fileNames,result:data})}).catch(()=>{})
      }
    } catch(e: unknown) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      if (ivRef.current) clearInterval(ivRef.current)
      setLoading(false)
    }
  }

  const exportPdf = () => {
    if (!result) return
    const date = new Date().toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})
    const sevClass = (s:string) => s==='높음'?'badge-high':s==='중간'?'badge-mid':'badge-low'
    const dupRows = result.duplicates.length===0
      ? `<tr><td colspan="6" style="text-align:center;color:#888;padding:8mm 0">중복 보장 항목이 발견되지 않았습니다</td></tr>`
      : result.duplicates.map(d=>`<tr><td><strong>${d.item}</strong><br/><span style="color:#888;font-size:8pt">${d.action}</span></td><td>${d.policies}</td><td><span>A: ${d.coverageA}</span><br/><span>B: ${d.coverageB}</span></td><td>${d.type}</td><td style="color:#92400e;font-weight:500">${d.monthlySavings}</td><td><span class="badge ${sevClass(d.severity)}">${d.severity}</span></td></tr>`).join('')
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>보험 중복 분석 보고서</title><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Noto Sans KR',sans-serif;background:#fff;color:#1a1a1a;padding:18mm 20mm;font-size:10.5pt;line-height:1.6}.title-row{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111827;padding-bottom:3mm;margin-bottom:5mm}.title-row h1{font-size:17pt;font-weight:700}.title-row .meta{font-size:8.5pt;color:#888;text-align:right;line-height:1.8}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-bottom:6mm}.card{border:1px solid #e5e7eb;border-radius:6px;padding:3.5mm 4mm;text-align:center}.card .val{font-size:16pt;font-weight:700}.card .lbl{font-size:8pt;color:#888;margin-top:1mm}.section-title{font-size:9pt;font-weight:600;color:#374151;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:2.5mm;margin-top:5mm}.ai-box{background:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid #111827;border-radius:6px;padding:4mm 5mm;font-size:9.5pt;line-height:1.8;color:#374151;margin-bottom:5mm}table{width:100%;border-collapse:collapse;margin-bottom:5mm;font-size:8.5pt}th{background:#f3f4f6;border:1px solid #e5e7eb;padding:2mm 3mm;text-align:left;font-weight:600;color:#6b7280;white-space:nowrap}td{border:1px solid #e5e7eb;padding:2.5mm 3mm;vertical-align:top;color:#374151}tr:nth-child(even) td{background:#f9fafb}.badge{display:inline-block;padding:0.5mm 2.5mm;border-radius:3px;font-size:8pt;font-weight:500}.badge-high{background:#fee2e2;color:#991b1b}.badge-mid{background:#fef3c7;color:#92400e}.badge-low{background:#d1fae5;color:#065f46}.rec-box{background:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid #111827;border-radius:6px;padding:4mm 5mm;font-size:9.5pt;line-height:1.9;color:#374151;margin-bottom:4mm}.disc{font-size:8pt;color:#9ca3af;border:1px solid #e5e7eb;border-radius:5px;padding:3mm 4mm}@media print{body{padding:12mm 14mm}@page{margin:10mm}}</style></head><body><div class="title-row"><h1>보험 중복 보장 분석 보고서</h1><div class="meta">분석 일시: ${date}<br/>파일: ${files.map(f=>f.name).join(', ')}</div></div><div class="cards"><div class="card"><div class="val" style="color:#ef4444">${result.summary.duplicateCount}</div><div class="lbl">중복 보장 항목</div></div><div class="card"><div class="val">${result.summary.totalPolicies}</div><div class="lbl">분석 보험 수</div></div><div class="card"><div class="val" style="color:#f59e0b">${result.summary.estimatedMonthlySavings}</div><div class="lbl">절감 예상액</div></div><div class="card"><div class="val">${result.summary.riskLevel}</div><div class="lbl">중복 위험도</div></div></div><div class="section-title">AI 분석 요약</div><div class="ai-box">${result.aiSummary}</div><div class="section-title">중복 보장 상세 목록</div><table><thead><tr><th>중복 항목</th><th>해당 보험</th><th>보장 내용 비교</th><th>중복 유형</th><th>절감 예상</th><th>심각도</th></tr></thead><tbody>${dupRows}</tbody></table><div class="section-title">AI 권고사항</div><div class="rec-box">${result.recommendation}</div><div class="disc">${result.disclaimer}</div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),500))</script></body></html>`
    const blob = new Blob([html],{type:'text/html;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    window.open(url,'_blank')
    setTimeout(()=>URL.revokeObjectURL(url), 10000)
  }

  const exportTxt = () => {
    if (!result) return
    const rows = result.duplicates.map(d=>`${d.item}\t${d.policies}\t${d.type}\t${d.monthlySavings}\t${d.severity}`).join('\n')
    const txt = ['보험 중복 보장 분석 보고서','='.repeat(44),`분석 일시: ${new Date().toLocaleString('ko-KR')}`,`파일: ${files.map(f=>f.name).join(', ')}`,'','[요약]',`• 분석 보험: ${result.summary.totalPolicies}개`,`• 중복 항목: ${result.summary.duplicateCount}개`,`• 절감 예상: ${result.summary.estimatedMonthlySavings}`,`• 위험도: ${result.summary.riskLevel}`,'','[AI 요약]',result.aiSummary,'','[중복 상세]','항목\t보험\t유형\t절감\t심각도',rows,'','[권고사항]',result.recommendation,'','[안내]',result.disclaimer].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt],{type:'text/plain;charset=utf-8'}))
    a.download = `보험중복분석_${new Date().toLocaleDateString('ko-KR').replace(/\.\s*/g,'-').replace(/-$/,'')}.txt`
    a.click()
  }

  const sevStyle = (s:string) =>
    s==='높음' ? {color:'#EF4444',bg:'rgba(239,68,68,0.08)',border:'rgba(239,68,68,0.25)'} :
    s==='중간' ? {color:'#F59E0B',bg:'rgba(245,158,11,0.08)',border:'rgba(245,158,11,0.25)'} :
                 {color:'#22C55E',bg:'rgba(34,197,94,0.08)',border:'rgba(34,197,94,0.25)'}
  const riskColor = (s:string) => s==='높음'?'#EF4444':s==='중간'?'#F59E0B':'#22C55E'

  const inputCls = `w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all bg-white`

  return (
    <main className="min-h-screen" style={{ background: '#F9FAFB', color: '#111827' }}>

      {/* GNB */}
      <nav className="sticky top-0 z-50"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #E5E7EB' }}>
        <div className="max-w-3xl mx-auto px-5 h-[60px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo2.png" alt="로고" width={32} height={32} style={{ borderRadius: 8 }} />
            <span className="text-[13px] font-bold" style={{ color: '#111827' }}>AI보험분석</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                className="px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
                style={item.href === '/analyze' ? { color: '#111827', background: '#F3F4F6', fontWeight: 700 } : { color: '#6B7280' }}
                onMouseEnter={e => { if (item.href !== '/analyze') { const el = e.currentTarget as HTMLElement; el.style.color = '#111827'; el.style.background = '#F3F4F6' }}}
                onMouseLeave={e => { if (item.href !== '/analyze') { const el = e.currentTarget as HTMLElement; el.style.color = '#6B7280'; el.style.background = 'transparent' }}}>
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

      {/* 본문 */}
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-20">

        {/* 페이지 헤더 */}
        <header className="text-center mb-9">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#111827' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#374151', letterSpacing: '0.04em' }}>AI 보험 중복 분석 서비스</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black leading-snug mb-3" style={{ color: '#111827', letterSpacing: '-0.03em' }}>
            보험 중복보장을<br/>AI로 분석해 드립니다
          </h1>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#6B7280' }}>
            보험 문서를 업로드하면 중복 항목을 파악하고<br className="hidden sm:block"/>절감 가능 금액과 맞춤 보고서를 생성합니다
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {[
              { label: '📕 PDF', color: '#EF4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' },
              { label: '🖼️ JPG · PNG', color: '#F59E0B', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)' },
              { label: '📄 TXT · DOCX', color: '#374151', bg: '#F3F4F6', border: '#E5E7EB' },
            ].map((t,i) => (
              <span key={i} className="text-xs px-3 py-1 rounded-full border" style={{ color: t.color, borderColor: t.border, background: t.bg }}>{t.label}</span>
            ))}
          </div>
        </header>

        {/* [1] 제목 */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold" style={{ color: '#374151' }}>제목 <span style={{ color: '#EF4444' }}>*</span></label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={autoTitle}
                onChange={e=>{setAutoTitle(e.target.checked);setUserInfo(p=>({...p,title:e.target.checked?'내보험 컨설팅':''}))}}
                className="w-3 h-3 cursor-pointer" style={{ accentColor: '#111827' }}/>
              <span className="text-xs" style={{ color: '#6B7280' }}>자동입력</span>
            </label>
          </div>
          <input
            ref={titleRef}
            className={`${inputCls} ${emptyFields.includes('title') ? 'border-red-400' : 'border-[#E5E7EB] focus:border-[#111827]'}`}
            style={{ color: '#111827' }}
            value={userInfo.title}
            onChange={e=>{setAutoTitle(false);setUserInfo(p=>({...p,title:e.target.value}));setEmptyFields(p=>p.filter(f=>f!=='title'))}}
            placeholder="예: 내보험 컨설팅"
          />
        </div>

        {/* [2] 기본 정보 */}
        <div className="mb-4 rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-1 h-4 rounded-full" style={{ background: '#111827' }}/>
              <span className="text-sm font-bold" style={{ color: '#111827' }}>기본 정보</span>
              <span className="text-xs ml-1" style={{ color: '#9CA3AF' }}>추가 정보를 입력할수록 AI 분석이 더 정확합니다</span>
            </div>

            {/* 성별 + 생년월일 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold" style={{ color: '#374151' }}>성별 <span style={{ color: '#EF4444' }}>*</span></label>
                <div className={`flex rounded-xl overflow-hidden border ${emptyFields.includes('gender') ? 'border-red-400' : 'border-[#E5E7EB]'}`}>
                  {['남성','여성'].map(opt => (
                    <button key={opt} type="button"
                      onClick={()=>{setUserInfo(p=>({...p,gender:opt}));setEmptyFields(p=>p.filter(x=>x!=='gender'))}}
                      className="flex-1 py-[9px] text-sm font-medium transition-all duration-200 cursor-pointer"
                      style={userInfo.gender===opt
                        ? { background: '#111827', color: 'white', fontWeight: 700 }
                        : { color: '#9CA3AF', background: '#FFFFFF' }}>
                      {opt==='남성'?'♂ 남성':'♀ 여성'}
                    </button>
                  ))}
                </div>
                {emptyFields.includes('gender') && <p className="text-[11px]" style={{ color: '#EF4444' }}>성별을 선택해 주세요</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold" style={{ color: '#374151' }}>생년월일 <span style={{ color: '#EF4444' }}>*</span></label>
                <input ref={ageRef} type="date"
                  className={`w-full border rounded-xl px-3 py-2 text-sm outline-none transition-colors cursor-pointer ${emptyFields.includes('age') ? 'border-red-400' : 'border-[#E5E7EB] focus:border-[#111827]'}`}
                  style={{ background: '#FFFFFF', color: '#111827' }}
                  value={userInfo.age} max={new Date().toISOString().split('T')[0]}
                  onChange={e=>{setUserInfo(p=>({...p,age:e.target.value}));setEmptyFields(p=>p.filter(x=>x!=='age'))}}/>
                {emptyFields.includes('age') && <p className="text-[11px]" style={{ color: '#EF4444' }}>생년월일을 선택해 주세요</p>}
              </div>
            </div>

            {/* 추가 정보 토글 */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
              <div className="w-9 h-5 rounded-full relative transition-colors duration-200"
                style={{ background: showAdditional ? '#111827' : '#E5E7EB' }}
                onClick={()=>setShowAdditional(v=>!v)}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${showAdditional?'translate-x-4':'translate-x-0.5'}`}/>
              </div>
              <span className="text-xs" style={{ color: '#6B7280' }}>추가 정보 입력</span>
            </label>

            {/* 추가 정보 */}
            <div className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: showAdditional ? '400px' : '0px', opacity: showAdditional ? 1 : 0, marginTop: showAdditional ? '16px' : '0' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label:'직업', ref:jobRef, key:'job', placeholder:'예: 사무직' },
                  { label:'건강', ref:healthRef, key:'health', placeholder:'예: 고혈압 복용 중' },
                  { label:'예산', ref:budgetRef, key:'budget', placeholder:'예: 월 15만원' },
                ].map(f => (
                  <div key={f.key} className="flex flex-col gap-2">
                    <label className="text-xs font-semibold" style={{ color: '#374151' }}>{f.label}</label>
                    <input ref={f.ref}
                      className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#111827] transition-all bg-white"
                      style={{ color: '#111827' }}
                      value={userInfo[f.key as keyof UserInfo]}
                      onChange={e=>setUserInfo(p=>({...p,[f.key]:e.target.value}))}
                      placeholder={f.placeholder}/>
                  </div>
                ))}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold" style={{ color: '#374151' }}>목적</label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={autoPurpose}
                        onChange={e=>{setAutoPurpose(e.target.checked);setUserInfo(p=>({...p,purpose:e.target.checked?'중복 보장제거 및 컨설팅':''}))}}
                        className="w-3 h-3 cursor-pointer" style={{ accentColor: '#111827' }}/>
                      <span className="text-xs" style={{ color: '#6B7280' }}>자동입력</span>
                    </label>
                  </div>
                  <input ref={purposeRef}
                    className="w-full border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#111827] transition-all bg-white"
                    style={{ color: '#111827' }}
                    value={userInfo.purpose}
                    onChange={e=>{setAutoPurpose(false);setUserInfo(p=>({...p,purpose:e.target.value}))}}
                    placeholder="예: 중복 보장 제거"/>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* [2.5] 내보험 가져오기 — 운영 API 승인 후 NEXT_PUBLIC_CODEF_ENABLED=true 로 활성화 */}
        {process.env.NEXT_PUBLIC_CODEF_ENABLED === 'true' && (
          <div className="mb-4">
            <CodefImportButton onImported={(file) => {
              setFiles(prev => {
                const exists = prev.some(f=>f.name===file.name)
                if (exists) return prev
                return [...prev,{file,name:file.name,size:file.size}].slice(0, MAX_FILES)
              })
            }} />
          </div>
        )}

        {/* [3] 업로드 */}
        <div className="mb-4 rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-4 rounded-full" style={{ background: '#111827' }}/>
              <span className="text-sm font-bold" style={{ color: '#111827' }}>보험 문서 업로드</span>
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-4 text-xs" style={{ color: '#9CA3AF' }}>
              <span>🔒</span><span>첨부 파일은 AI 분석에만 사용되며 저장되지 않습니다.</span>
            </div>

            {/* 드롭존 */}
            <div
              className="rounded-2xl p-8 text-center cursor-pointer transition-all select-none"
              style={{
                border: `2px dashed ${dragging ? '#111827' : '#D1D5DB'}`,
                background: dragging ? '#F3F4F6' : '#F9FAFB',
              }}
              onDragOver={e=>{e.preventDefault();setDragging(true)}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files)}}
              onClick={()=>fileInputRef.current?.click()}
              onMouseEnter={e=>{ if(!dragging) { const el=e.currentTarget as HTMLElement; el.style.borderColor='#9CA3AF'; el.style.background='#F3F4F6' }}}
              onMouseLeave={e=>{ if(!dragging) { const el=e.currentTarget as HTMLElement; el.style.borderColor='#D1D5DB'; el.style.background='#F9FAFB' }}}
            >
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                className="hidden" onChange={e=>e.target.files&&addFiles(e.target.files)}/>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#E5E7EB' }}>
                <UploadCloud size={24} color="#6B7280" strokeWidth={1.5}/>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: '#374151' }}>드래그하거나 클릭하여 업로드</p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>PDF · JPG · PNG · TXT · DOCX · 최대 5개</p>
            </div>

            {/* 파일 목록 */}
            {files.length > 0 && (
              <div className="flex flex-col gap-2 mt-3">
                {files.map((f,i) => (
                  <div key={f.name} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <span className="text-base">{fileIcon(f.name)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate" style={{ color: '#374151' }}>{f.name}</div>
                      <div className="text-xs" style={{ color: '#9CA3AF' }}>{fmtSize(f.size)}</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-lg border shrink-0 font-medium"
                      style={isPDF(f.name) ? { color:'#EF4444', borderColor:'rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.06)' }
                        : isImage(f.name) ? { color:'#F59E0B', borderColor:'rgba(245,158,11,0.3)', background:'rgba(245,158,11,0.06)' }
                        : { color:'#374151', borderColor:'#E5E7EB', background:'#F3F4F6' }}>
                      {isPDF(f.name)?'PDF':isImage(f.name)?'IMG':'TXT'}
                    </span>
                    <button className="cursor-pointer transition-colors p-1 rounded-lg"
                      style={{ color: '#9CA3AF' }}
                      onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))}
                      onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#EF4444'}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#9CA3AF'}}>
                      <X size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 복원 알림 */}
        {restoredInfo && (
          <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-xs mb-4"
            style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', color: '#16A34A' }}>
            <span>✅</span><span>이전 입력 정보를 복원했습니다. 파일을 다시 업로드해 주세요.</span>
            <button className="ml-auto cursor-pointer" style={{ color: '#9CA3AF' }} onClick={()=>setRestoredInfo(false)}>✕</button>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="rounded-2xl px-4 py-3 text-sm mb-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>{error}</div>
        )}

        {/* 분석 버튼 */}
        <div className="no-print mb-6">
          <button
            disabled={files.length===0||loading}
            onClick={handleAnalyzeClick}
            className="w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2.5 cursor-pointer transition-all"
            style={{
              background: files.length===0||loading ? '#E5E7EB' : '#111827',
              color: files.length===0||loading ? '#9CA3AF' : 'white',
              cursor: files.length===0||loading ? 'not-allowed' : 'pointer',
              boxShadow: files.length===0||loading ? 'none' : '0 4px 20px rgba(0,0,0,0.15)',
            }}
            onMouseEnter={e=>{if(files.length===0||loading)return; const el=e.currentTarget as HTMLElement; el.style.background='#1F2937'; el.style.transform='scale(1.01)'}}
            onMouseLeave={e=>{const el=e.currentTarget as HTMLElement; el.style.background=files.length===0||loading?'#E5E7EB':'#111827'; el.style.transform='scale(1)'}}>
            <span className={`text-lg ${!loading?'':'animate-spin inline-block'}`}>{loading?'⏳':'🔍'}</span>
            {loading ? 'AI 분석 중...' : 'AI 중복 분석 시작'}
          </button>
          {!authUser && files.length > 0 && (
            <p className="text-center text-xs mt-2" style={{ color: '#9CA3AF' }}>
              🔐 로그인 후 분석 결과를 저장하고 언제든 다시 확인할 수 있습니다
            </p>
          )}
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="text-center p-10 rounded-3xl mt-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="flex items-center justify-center gap-1 mb-5">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="w-1 rounded-full transition-all"
                  style={{
                    height: '28px',
                    background: i===stepIdx ? '#111827' : '#E5E7EB',
                    animation: `stepBounce .8s ease-in-out ${i*.12}s infinite`,
                  }}/>
              ))}
            </div>
            <style>{`@keyframes stepBounce { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.6)} }`}</style>
            <p className="text-sm font-medium mb-1" style={{ color: '#111827' }}>AI가 보험 문서를 분석하고 있습니다</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>{stepMsg}</p>
            <div className="flex justify-center gap-1.5 mt-4">
              {STEPS.map((_,i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{ background: i===stepIdx ? '#111827' : '#E5E7EB' }}/>
              ))}
            </div>
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div id="result-section" className="mt-6">
            {/* 결과 헤더 */}
            <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
              <div>
                <h2 className="text-base font-bold" style={{ color: '#111827' }}>분석 완료 보고서</h2>
                <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                  {new Date().toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})} · 파일 {files.length}개
                </div>
              </div>
              <div className="flex gap-2 flex-wrap no-print">
                {[
                  { label: 'TXT', icon: <Download size={11}/>, fn: exportTxt },
                  { label: 'PDF', icon: <FileText size={11}/>, fn: exportPdf },
                  { label: '인쇄', icon: <Printer size={11}/>, fn: ()=>window.print() },
                ].map((b,i) => (
                  <button key={i} onClick={b.fn}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border cursor-pointer transition-all"
                    style={{ borderColor: '#E5E7EB', color: '#374151', background: '#FFFFFF' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#F3F4F6'; el.style.borderColor = '#D1D5DB' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#FFFFFF'; el.style.borderColor = '#E5E7EB' }}>
                    {b.icon} {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 요약 지표 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
              {[
                { value: result.summary.duplicateCount, label: '중복 항목', color: '#EF4444' },
                { value: result.summary.totalPolicies,  label: '분석 보험', color: '#111827' },
                { value: result.summary.estimatedMonthlySavings, label: '절감 예상', color: '#F59E0B' },
                { value: result.summary.riskLevel, label: '위험도', color: riskColor(result.summary.riskLevel) },
              ].map((m,i) => (
                <div key={i} className="rounded-2xl p-4 text-center"
                  style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div className="text-xl font-bold mb-1 truncate" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* AI 요약 */}
            <div className="mb-5 rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderLeft: '3px solid #111827' }}>
              <div className="flex items-center gap-2 mb-3">
                <Bot size={14} color="#374151"/>
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#374151' }}>AI 분석 요약</span>
              </div>
              <p className="text-sm leading-[1.85] whitespace-pre-wrap" style={{ color: '#6B7280' }}>{result.aiSummary}</p>
            </div>

            {/* 중복 상세 테이블 */}
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#9CA3AF' }}>중복 보장 상세 목록</div>
            <div className="overflow-x-auto mb-5 rounded-2xl" style={{ border: '1px solid #E5E7EB' }}>
              <table className="w-full border-collapse text-sm min-w-[600px]">
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['중복 항목','해당 보험','보장 내용 비교','중복 유형','절감 예상','심각도'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold border-b whitespace-nowrap" style={{ color: '#6B7280', borderColor: '#E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.duplicates.length === 0
                    ? <tr><td colSpan={6} className="text-center py-8" style={{ color: '#9CA3AF' }}>중복 보장 항목이 발견되지 않았습니다</td></tr>
                    : result.duplicates.map((d,i) => {
                        const sv = sevStyle(d.severity)
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}
                            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='#F9FAFB'}}
                            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent'}}>
                            <td className="px-3 py-2.5 align-top">
                              <strong className="block text-sm font-semibold mb-0.5" style={{ color: '#111827' }}>{d.item}</strong>
                              <span className="text-xs" style={{ color: '#9CA3AF' }}>{d.action}</span>
                            </td>
                            <td className="px-3 py-2.5 text-xs align-top" style={{ color: '#6B7280' }}>{d.policies}</td>
                            <td className="px-3 py-2.5 text-xs align-top">
                              <div className="mb-0.5" style={{ color: '#374151' }}>A: {d.coverageA}</div>
                              <div style={{ color: '#9CA3AF' }}>B: {d.coverageB}</div>
                            </td>
                            <td className="px-3 py-2.5 text-xs align-top" style={{ color: '#6B7280' }}>{d.type}</td>
                            <td className="px-3 py-2.5 text-xs align-top font-semibold" style={{ color: '#F59E0B' }}>{d.monthlySavings}</td>
                            <td className="px-3 py-2.5 align-top">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                                style={{ color: sv.color, background: sv.bg, borderColor: sv.border }}>{d.severity}</span>
                            </td>
                          </tr>
                        )
                      })
                  }
                </tbody>
              </table>
            </div>

            {/* AI 권고사항 */}
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#9CA3AF' }}>AI 권고사항</div>
            <div className="rounded-xl px-5 py-4 text-sm leading-[1.85] mb-3"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderLeft: '3px solid #111827', color: '#374151' }}>
              {result.recommendation}
            </div>
            <div className="text-xs rounded-xl px-4 py-3 mb-8"
              style={{ color: '#9CA3AF', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              {result.disclaimer}
            </div>
          </div>
        )}

        {/* 푸터 */}
        <footer className="text-center mt-8 text-xs leading-7" style={{ color: '#D1D5DB', borderTop: '1px solid #F3F4F6', paddingTop: 24 }}>
          <p>insure.dbzone.kr · AI 기반 보험 중복 분석 서비스</p>
          <p>본 서비스는 참고용이며, 실제 보험 변경 전 전문가 상담을 권장합니다.</p>
        </footer>
      </div>

      {/* 로그인 유도 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowLoginModal(false)}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl" style={{ background: '#F3F4F6' }}>🔐</div>
              <div className="text-base font-bold mb-2" style={{ color: '#111827' }}>로그인이 필요한 서비스입니다</div>
              <p className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>분석 결과를 저장하고<br/>언제든 다시 확인할 수 있습니다.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleLoginModalGo('/login')}
                className="w-full py-3 rounded-2xl text-sm font-extrabold cursor-pointer transition-all"
                style={{ background: '#111827', color: 'white' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1F2937'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#111827'}>
                로그인하기
              </button>
              <button onClick={() => handleLoginModalGo('/register')}
                className="w-full py-3 rounded-2xl text-sm font-bold border cursor-pointer transition-all"
                style={{ background: '#FFFFFF', borderColor: '#E5E7EB', color: '#374151' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFFFFF'}>
                회원가입하기
              </button>
              <button onClick={() => setShowLoginModal(false)}
                className="w-full py-2.5 text-sm cursor-pointer transition-colors"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#374151'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#9CA3AF'}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 경고 모달 */}
      {showEmptyWarning && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="font-bold mb-3" style={{ color: '#111827' }}>⚠️ 입력되지 않은 항목</div>
            <div className="text-sm leading-7 mb-5">
              <ul className="mb-3 space-y-1">
                {emptyFields.map(f => <li key={f} style={{ color: '#F59E0B' }}>· {FIELD_LABELS[f as keyof UserInfo]}</li>)}
              </ul>
              <p style={{ color: '#6B7280' }}>기본 정보 없이 계속 진행하시겠습니까?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleWarningCancel}
                className="py-3 rounded-2xl text-sm border cursor-pointer transition-all"
                style={{ background: '#FFFFFF', borderColor: '#E5E7EB', color: '#374151' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFFFFF'}>
                입력하러 가기
              </button>
              <button onClick={handleWarningProceed}
                className="py-3 rounded-2xl text-sm font-bold cursor-pointer transition-all"
                style={{ background: '#111827', color: 'white' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1F2937'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#111827'}>
                계속 진행
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
