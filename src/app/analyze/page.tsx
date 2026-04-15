'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { ShieldCheck, Home as HomeIcon, LayoutDashboard, Sparkles, LogOut, LogIn, UserPlus, Menu, X, UploadCloud, FileText, Trash2, ChevronDown, Bot, Printer, Download } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

const inputCls = 'w-full bg-white/[0.06] border border-[#4B7FD4]/25 rounded-xl px-3 py-2 text-[#E2E8F0] text-sm placeholder:text-[#2D4060] outline-none focus:border-[#4B7FD4]/70 focus:bg-[#2D5BE3]/[0.06] transition-colors'

const NAV_ITEMS = [
  { href:'/', icon:<HomeIcon size={16}/>, label:'홈' },
  { href:'/dashboard', icon:<LayoutDashboard size={16}/>, label:'내 분석 내역' },
  { href:'#', icon:<Sparkles size={16}/>, label:'프리미엄' },
]

export default function AnalyzePage() {
  const pathname = usePathname()
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
          try {
            const parsed = JSON.parse(saved)
            setUserInfo(parsed); setRestoredInfo(true)
            sessionStorage.removeItem('pendingUserInfo')
          } catch { /* 무시 */ }
        }
      }
    })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout',{method:'POST'})
    setAuthUser(null)
  }

  const MAX_FILES = 5

  const addFiles = useCallback((list: FileList | File[]) => {
    setFiles(prev => {
      const names = new Set(prev.map(f=>f.name))
      const newFiles = Array.from(list).filter(f=>!names.has(f.name)).map(f=>({file:f,name:f.name,size:f.size}))
      return [...prev, ...newFiles].slice(0, MAX_FILES)
    })
  }, [])

  const FIELD_LABELS: Record<keyof UserInfo, string> = { title:'제목', gender:'성별', age:'연령', job:'직업', health:'건강', purpose:'목적', budget:'예산' }

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
      : result.duplicates.map(d=>`
        <tr>
          <td><strong>${d.item}</strong><br/><span style="color:#888;font-size:8pt">${d.action}</span></td>
          <td>${d.policies}</td>
          <td><span class="cov-a">A: ${d.coverageA}</span><br/><span class="cov-b">B: ${d.coverageB}</span></td>
          <td>${d.type}</td>
          <td style="color:#92400e;font-weight:500">${d.monthlySavings}</td>
          <td><span class="badge ${sevClass(d.severity)}">${d.severity}</span></td>
        </tr>`).join('')
    const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>보험 중복 분석 보고서</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Noto Sans KR',sans-serif;background:#fff;color:#1a1a1a;padding:18mm 20mm;font-size:10.5pt;line-height:1.6}.title-row{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #c4974a;padding-bottom:3mm;margin-bottom:5mm}.title-row h1{font-size:17pt;font-weight:700;color:#1a1a1a}.title-row .meta{font-size:8.5pt;color:#888;text-align:right;line-height:1.8}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-bottom:6mm}.card{border:1px solid #e0d8c8;border-radius:6px;padding:3.5mm 4mm;text-align:center}.card .val{font-size:16pt;font-weight:700;color:#1a1a1a}.card .val.red{color:#b91c1c}.card .val.amber{color:#92400e}.card .val.risk-high{color:#b91c1c}.card .val.risk-mid{color:#92400e}.card .val.risk-low{color:#166534}.card .lbl{font-size:8pt;color:#888;margin-top:1mm}.section-title{font-size:9pt;font-weight:600;color:#7a5c2e;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:2.5mm;margin-top:5mm}.ai-box{background:#fdf8f0;border:1px solid #e8d8b0;border-left:3px solid #c4974a;border-radius:6px;padding:4mm 5mm;font-size:9.5pt;line-height:1.8;color:#444;margin-bottom:5mm}table{width:100%;border-collapse:collapse;margin-bottom:5mm;font-size:8.5pt}th{background:#f5f2ec;border:1px solid #e0d8c8;padding:2mm 3mm;text-align:left;font-weight:600;color:#555;white-space:nowrap}td{border:1px solid #e0d8c8;padding:2.5mm 3mm;vertical-align:top;color:#333}tr:nth-child(even) td{background:#fafaf8}.badge{display:inline-block;padding:0.5mm 2.5mm;border-radius:3px;font-size:8pt;font-weight:500}.badge-high{background:#fee2e2;color:#991b1b}.badge-mid{background:#fef3c7;color:#92400e}.badge-low{background:#d1fae5;color:#065f46}.cov-a{color:#7a5c2e;display:block}.cov-b{color:#666;display:block}.rec-box{background:#fdf8f0;border:1px solid #e8d8b0;border-left:3px solid #c4974a;border-radius:6px;padding:4mm 5mm;font-size:9.5pt;line-height:1.9;color:#444;margin-bottom:4mm}.disc{font-size:8pt;color:#999;border:1px solid #eee;border-radius:5px;padding:3mm 4mm}@media print{body{padding:12mm 14mm}@page{margin:10mm}}</style>
</head><body>
<div class="title-row"><h1>보험 중복 보장 분석 보고서</h1><div class="meta">분석 일시: ${date}<br/>파일: ${files.map(f=>f.name).join(', ')}</div></div>
<div class="cards">
  <div class="card"><div class="val red">${result.summary.duplicateCount}</div><div class="lbl">중복 보장 항목</div></div>
  <div class="card"><div class="val">${result.summary.totalPolicies}</div><div class="lbl">분석 보험 수</div></div>
  <div class="card"><div class="val amber">${result.summary.estimatedMonthlySavings}</div><div class="lbl">절감 예상액</div></div>
  <div class="card"><div class="val risk-${result.summary.riskLevel==='높음'?'high':result.summary.riskLevel==='중간'?'mid':'low'}">${result.summary.riskLevel}</div><div class="lbl">중복 위험도</div></div>
</div>
<div class="section-title">⬡ AI 분석 요약</div><div class="ai-box">${result.aiSummary}</div>
<div class="section-title">중복 보장 상세 목록</div>
<table><thead><tr><th>중복 항목</th><th>해당 보험</th><th>보장 내용 비교</th><th>중복 유형</th><th>절감 예상</th><th>심각도</th></tr></thead><tbody>${dupRows}</tbody></table>
<div class="section-title">AI 권고사항</div><div class="rec-box">${result.recommendation}</div>
<div class="disc">${result.disclaimer}</div>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),500))</script>
</body></html>`
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

  const sevBadge = (s:string) =>
    s==='높음' ? {color:'#EF4444',bg:'rgba(239,68,68,.12)',border:'rgba(239,68,68,.3)'} :
    s==='중간' ? {color:'#F59E0B',bg:'rgba(245,158,11,.12)',border:'rgba(245,158,11,.3)'} :
                 {color:'#22C55E',bg:'rgba(34,197,94,.12)',border:'rgba(34,197,94,.3)'}

  const riskColor = (s:string) =>
    s==='높음'?'#EF4444':s==='중간'?'#F59E0B':'#22C55E'
  const riskBorder = (s:string) =>
    s==='높음'?'rgba(239,68,68,.25)':s==='중간'?'rgba(245,158,11,.25)':'rgba(34,197,94,.25)'
  const riskBg = (s:string) =>
    s==='높음'?'rgba(239,68,68,.06)':s==='중간'?'rgba(245,158,11,.06)':'rgba(34,197,94,.06)'

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes orbDrift { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(20px,-14px) scale(1.03)} 70%{transform:translate(-12px,7px) scale(.98)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulseRing { 0%{box-shadow:0 0 0 0 rgba(75,127,212,.4)} 70%{box-shadow:0 0 0 7px rgba(75,127,212,0)} 100%{box-shadow:0 0 0 0 rgba(75,127,212,0)} }
        @keyframes stepBounce { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.6)} }
        .fu-1{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .1s both}
        .fu-2{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .22s both}
        .fu-3{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .34s both}
        .fu-4{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) .46s both}
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
        <div className="absolute top-0 right-0 w-[500px] h-[400px] pointer-events-none" style={{animation:'orbDrift 13s ease-in-out infinite'}}>
          <div style={{width:'100%',height:'100%',background:'radial-gradient(ellipse at 70% 10%,rgba(249,115,22,.05) 0%,transparent 65%)'}}/>
        </div>
        <div className="absolute bottom-0 left-0 w-[360px] h-[300px] pointer-events-none" style={{animation:'orbDrift 17s ease-in-out 5s infinite'}}>
          <div style={{width:'100%',height:'100%',background:'radial-gradient(ellipse at 20% 90%,rgba(75,127,212,.06) 0%,transparent 60%)'}}/>
        </div>

        {/* ── GNB ── */}
        <nav className="sticky top-0 z-50 w-full backdrop-blur-xl border-b" style={{background:'rgba(13,14,18,.92)',borderColor:'rgba(255,255,255,.07)'}}>
          <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
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
                    onMouseEnter={e=>{if(active)return;const el=e.currentTarget as HTMLElement;el.style.color='#A8B8CC';el.style.background='rgba(75,127,212,.06)';el.style.borderColor='rgba(75,127,212,.15)'}}
                    onMouseLeave={e=>{if(active)return;const el=e.currentTarget as HTMLElement;el.style.color='#4E6888';el.style.background='transparent';el.style.borderColor='transparent'}}>
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
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#6B9FFF'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#4E6888'}}>
                    <LogOut size={11}/> 로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-xs px-2 py-1.5 flex items-center gap-1 transition-colors" style={{color:'#64707E'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#E2E8F0'}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#4E6888'}}><LogIn size={12}/> 로그인</Link>
                  <Link href="/register" className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-all" style={{borderColor:'rgba(75,127,212,.3)',color:'#6B9FFF',background:'rgba(75,127,212,.08)'}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.15)'}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.08)'}}>
                    <UserPlus size={12}/> 회원가입
                  </Link>
                </>
              )}
            </div>

            <button className="md:hidden text-[#6B9FFF] cursor-pointer p-1 ml-auto" onClick={()=>setMobileMenuOpen(v=>!v)}>
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

        {/* ── 본문 ── */}
        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-10 pb-20">

          {/* 페이지 헤더 */}
          <header className="fu-1 text-center mb-9">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border mb-5"
              style={{background:'rgba(249,115,22,.07)',borderColor:'rgba(249,115,22,.2)',backdropFilter:'blur(8px)'}}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full animate-ping" style={{background:'#EF4444',opacity:.6}}/>
                <span className="relative rounded-full h-2 w-2" style={{background:'#EF4444'}}/>
              </span>
              <span className="text-xs font-semibold tracking-wide" style={{color:'#6B9FFF'}}>AI 보험 중복 분석 서비스</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-snug mb-3" style={{color:'#E2E8F0',wordBreak:'keep-all'}}>
              보험 <span style={{background:'linear-gradient(90deg,#6B9FFF,#93C4FF)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>중복보장</span>을<br/>AI로 분석해 드립니다
            </h1>
            <p className="text-sm leading-relaxed" style={{color:'#64707E',wordBreak:'keep-all'}}>
              보험 문서를 업로드하면 중복 항목을 파악하고<br className="hidden sm:block"/>절감 가능 금액과 맞춤 보고서를 생성합니다
            </p>
            <div className="flex justify-center gap-2 flex-wrap mt-4">
              {[
                {label:'📕 PDF', color:'#EF4444', bc:'rgba(239,68,68,.25)'},
                {label:'🖼️ JPG · PNG', color:'#F59E0B', bc:'rgba(245,158,11,.25)'},
                {label:'📄 TXT · DOCX', color:'#6B9FFF', bc:'rgba(75,127,212,.25)'},
              ].map((t,i) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full border" style={{color:t.color,borderColor:t.bc,background:'rgba(0,0,0,.2)'}}>{t.label}</span>
              ))}
            </div>
          </header>

          {/* ── [1] 제목 ── */}
          <div className="fu-2 mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold" style={{color:'#93B4FF'}}>제목 <span style={{color:'#EF4444'}}>*</span></label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={autoTitle}
                  onChange={e=>{setAutoTitle(e.target.checked);setUserInfo(p=>({...p,title:e.target.checked?'내보험 컨설팅':''}))}}
                  className="w-3 h-3 cursor-pointer" style={{accentColor:'#4B7FD4'}}/>
                <span className="text-xs" style={{color:'#6B9FFF'}}>자동입력</span>
              </label>
            </div>
            <input
              ref={titleRef}
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all ${emptyFields.includes('title')?'border-rose-500/70':'border-[#4B7FD4]/25 focus:border-[#4B7FD4]/60'}`}
              style={{background:'rgba(75,127,212,.05)',color:'#E2E8F0'}}
              value={userInfo.title}
              onChange={e=>{setAutoTitle(false);setUserInfo(p=>({...p,title:e.target.value}));setEmptyFields(p=>p.filter(f=>f!=='title'))}}
              placeholder="예: 내보험 컨설팅"
            />
          </div>

          {/* ── [2] 기본 정보 카드 (Double-Bezel) ── */}
          <div className="fu-2 mb-4" style={{padding:'1px',borderRadius:'20px',background:'linear-gradient(135deg,rgba(255,255,255,.1) 0%,rgba(255,255,255,.04) 100%)'}}>
            <div style={{borderRadius:'19px',background:'rgba(20,21,30,.97)',backdropFilter:'blur(16px)',padding:'1px'}}>
              <div style={{borderRadius:'18px',background:'linear-gradient(135deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.02) 100%)',padding:'1px'}}>
                <div style={{borderRadius:'17px',background:'rgba(13,14,22,.94)',overflow:'hidden'}}>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-5">
                      <span className="w-1 h-4 rounded-full" style={{background:'linear-gradient(180deg,#4B7FD4,#2D5BE3)'}}/>
                      <span className="text-sm font-semibold" style={{color:'#E2E8F0'}}>기본</span>
                      <span className="text-xs ml-1" style={{color:'#3A424E'}}>추가 정보를 입력할수록 정확한 AI 분석이 가능합니다</span>
                    </div>

                    {/* 성별 + 생년월일 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold" style={{color:'#93B4FF'}}>성별 <span style={{color:'#EF4444'}}>*</span></label>
                        <div className={`flex rounded-xl overflow-hidden border ${emptyFields.includes('gender')?'border-rose-500/70':'border-[#4B7FD4]/25'}`}
                          style={{background:'rgba(255,255,255,.04)'}}>
                          {['남성','여성'].map(opt => (
                            <button key={opt} type="button"
                              onClick={()=>{setUserInfo(p=>({...p,gender:opt}));setEmptyFields(p=>p.filter(x=>x!=='gender'))}}
                              className="flex-1 py-[9px] text-sm font-medium transition-all duration-200 cursor-pointer"
                              style={userInfo.gender===opt
                                ? {background:'linear-gradient(135deg,#2D5BE3,#1A3A80)',color:'white',fontWeight:'700'}
                                : {color:'#64707E'}}>
                              {opt==='남성'?'♂ 남성':'♀ 여성'}
                            </button>
                          ))}
                        </div>
                        {emptyFields.includes('gender') && <p className="text-[11px]" style={{color:'#EF4444'}}>성별을 선택해 주세요</p>}
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold" style={{color:'#93B4FF'}}>생년월일 <span style={{color:'#EF4444'}}>*</span></label>
                        <input ref={ageRef} type="date"
                          className={`w-full border rounded-xl px-3 py-2 text-sm outline-none transition-colors cursor-pointer [color-scheme:dark] ${emptyFields.includes('age')?'border-rose-500/70':'border-[#4B7FD4]/25 focus:border-[#4B7FD4]/60'}`}
                          style={{background:'rgba(75,127,212,.05)',color:'#E2E8F0'}}
                          value={userInfo.age} max={new Date().toISOString().split('T')[0]}
                          onChange={e=>{setUserInfo(p=>({...p,age:e.target.value}));setEmptyFields(p=>p.filter(x=>x!=='age'))}}/>
                        {emptyFields.includes('age') && <p className="text-[11px]" style={{color:'#EF4444'}}>생년월일을 선택해 주세요</p>}
                      </div>
                    </div>

                    {/* 추가 정보 토글 */}
                    <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                      <div className="w-9 h-5 rounded-full relative transition-colors duration-200"
                        style={{background:showAdditional?'#2D5BE3':'rgba(255,255,255,.1)'}}
                        onClick={()=>setShowAdditional(v=>!v)}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${showAdditional?'translate-x-4':'translate-x-0.5'}`}/>
                      </div>
                      <span className="text-xs" style={{color:'#6B9FFF'}}>추가 정보 입력</span>
                    </label>

                    {/* 추가 정보 */}
                    <div className="overflow-hidden transition-all duration-300"
                      style={{maxHeight:showAdditional?'400px':'0px',opacity:showAdditional?1:0,marginTop:showAdditional?'16px':'0'}}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          {label:'직업', ref:jobRef,    key:'job',    placeholder:'예: 사무직'},
                          {label:'건강', ref:healthRef, key:'health', placeholder:'예: 고혈압 복용 중'},
                          {label:'예산', ref:budgetRef, key:'budget', placeholder:'예: 월 15만원'},
                        ].map(f => (
                          <div key={f.key} className="flex flex-col gap-2">
                            <label className="text-xs font-semibold" style={{color:'#93B4FF'}}>{f.label}</label>
                            <input ref={f.ref} className={inputCls} value={userInfo[f.key as keyof UserInfo]}
                              onChange={e=>setUserInfo(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}/>
                          </div>
                        ))}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold" style={{color:'#93B4FF'}}>목적</label>
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input type="checkbox" checked={autoPurpose}
                                onChange={e=>{setAutoPurpose(e.target.checked);setUserInfo(p=>({...p,purpose:e.target.checked?'중복 보장제거 및 컨설팅':''}))}}
                                className="w-3 h-3 cursor-pointer" style={{accentColor:'#4B7FD4'}}/>
                              <span className="text-xs" style={{color:'#6B9FFF'}}>자동입력</span>
                            </label>
                          </div>
                          <input ref={purposeRef} className={inputCls} value={userInfo.purpose}
                            onChange={e=>{setAutoPurpose(false);setUserInfo(p=>({...p,purpose:e.target.value}))}}
                            placeholder="예: 중복 보장 제거"/>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── [2.5] 내보험 가져오기 ── */}
          <div className="fu-3 mb-4">
            <CodefImportButton onImported={(file) => {
              setFiles(prev => {
                const exists = prev.some(f=>f.name===file.name)
                if (exists) return prev
                return [...prev,{file,name:file.name,size:file.size}].slice(0, MAX_FILES)
              })
            }} />
          </div>

          {/* ── [3] 업로드 카드 (Double-Bezel) ── */}
          <div className="fu-3 mb-4" style={{padding:'1px',borderRadius:'20px',background:'linear-gradient(135deg,rgba(255,255,255,.1) 0%,rgba(255,255,255,.04) 100%)'}}>
            <div style={{borderRadius:'19px',background:'rgba(20,21,30,.97)',backdropFilter:'blur(16px)',padding:'1px'}}>
              <div style={{borderRadius:'18px',background:'linear-gradient(135deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.02) 100%)',padding:'1px'}}>
                <div style={{borderRadius:'17px',background:'rgba(13,14,22,.94)',overflow:'hidden'}}>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-1 h-4 rounded-full" style={{background:'linear-gradient(180deg,#4B7FD4,#2D5BE3)'}}/>
                      <span className="text-sm font-semibold" style={{color:'#E2E8F0'}}>보험 문서 업로드</span>
                    </div>

                    {/* 신뢰 문구 */}
                    <div className="flex items-center justify-center gap-1.5 mb-4 text-xs" style={{color:'#3A424E'}}>
                      <span>🔒</span><span>첨부 파일은 AI 분석에만 사용되며 저장되지 않습니다.</span>
                    </div>

                    {/* 드롭존 */}
                    <div
                      className="rounded-2xl p-8 text-center cursor-pointer transition-all select-none"
                      style={{
                        border:`2px dashed ${dragging?'rgba(75,127,212,.7)':'rgba(75,127,212,.2)'}`,
                        background:dragging?'rgba(45,91,227,.06)':'rgba(75,127,212,.02)',
                      }}
                      onDragOver={e=>{e.preventDefault();setDragging(true)}}
                      onDragLeave={()=>setDragging(false)}
                      onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files)}}
                      onClick={()=>fileInputRef.current?.click()}
                      onMouseEnter={e=>{if(!dragging){const el=e.currentTarget as HTMLElement;el.style.borderColor='rgba(75,127,212,.45)';el.style.background='rgba(75,127,212,.04)'}}}
                      onMouseLeave={e=>{if(!dragging){const el=e.currentTarget as HTMLElement;el.style.borderColor='rgba(75,127,212,.2)';el.style.background='rgba(75,127,212,.02)'}}}
                    >
                      <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                        className="hidden" onChange={e=>e.target.files&&addFiles(e.target.files)}/>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                        style={{background:'rgba(75,127,212,.08)',border:'1px solid rgba(75,127,212,.18)'}}>
                        <UploadCloud size={26} color="#4B7FD4" strokeWidth={1.5}/>
                      </div>
                      <p className="text-sm font-medium mb-1" style={{color:'#C0C8D8'}}>드래그하거나 클릭하여 업로드</p>
                      <p className="text-xs" style={{color:'#3A424E'}}>PDF · JPG · PNG · TXT · DOCX · 최대 5개</p>
                    </div>

                    {/* 파일 목록 */}
                    {files.length > 0 && (
                      <div className="flex flex-col gap-2 mt-3">
                        {files.map((f,i) => (
                          <div key={f.name} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                            style={{background:'rgba(75,127,212,.05)',border:'1px solid rgba(75,127,212,.1)'}}>
                            <span className="text-base">{fileIcon(f.name)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm truncate" style={{color:'#C0C8D8'}}>{f.name}</div>
                              <div className="text-xs" style={{color:'#3A424E'}}>{fmtSize(f.size)}</div>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-lg border shrink-0 font-medium"
                              style={isPDF(f.name)?{color:'#EF4444',borderColor:'rgba(239,68,68,.3)',background:'rgba(239,68,68,.06)'}
                                :isImage(f.name)?{color:'#F59E0B',borderColor:'rgba(245,158,11,.3)',background:'rgba(245,158,11,.06)'}
                                :{color:'#6B9FFF',borderColor:'rgba(75,127,212,.3)',background:'rgba(75,127,212,.06)'}}>
                              {isPDF(f.name)?'PDF':isImage(f.name)?'IMG':'TXT'}
                            </span>
                            <button className="cursor-pointer transition-colors p-1 rounded-lg"
                              style={{color:'#3A424E'}}
                              onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))}
                              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#EF4444'}}
                              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#2D4060'}}>
                              <X size={14}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 복원 알림 */}
          {restoredInfo && (
            <div className="fu-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-xs mb-4"
              style={{background:'rgba(34,197,94,.08)',border:'1px solid rgba(34,197,94,.22)',color:'#4ADE80'}}>
              <span>✅</span>
              <span>이전 입력 정보를 복원했습니다. 파일을 다시 업로드해 주세요.</span>
              <button className="ml-auto cursor-pointer transition-colors" style={{color:'rgba(34,197,94,.5)'}}
                onClick={()=>setRestoredInfo(false)} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#4ADE80'}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='rgba(34,197,94,.5)'}}>✕</button>
            </div>
          )}

          {/* 에러 */}
          {error && (
            <div className="rounded-2xl px-4 py-3 text-sm mb-4" style={{background:'rgba(239,68,68,.05)',border:'1px solid rgba(239,68,68,.28)',color:'#EF4444'}}>{error}</div>
          )}

          {/* ── 분석 버튼 ── */}
          <div className="hidden sm:block no-print mb-6">
            <button
              disabled={files.length===0||loading}
              onClick={handleAnalyzeClick}
              className="spring w-full py-4 rounded-2xl text-white font-extrabold text-base tracking-wide flex items-center justify-center gap-2.5 cursor-pointer"
              style={{
                background:files.length===0||loading?'rgba(45,91,227,.3)':'linear-gradient(135deg,#306FFF 0%,#2D5BE3 50%,#1A4FC4 100%)',
                opacity:files.length===0||loading?.65:1,
                boxShadow:files.length===0||loading?'none':'0 0 32px rgba(249,115,22,.35)',
                pointerEvents:files.length===0||loading?'none':'auto',
              }}
              onMouseEnter={e=>{if(files.length===0||loading)return;const el=e.currentTarget as HTMLElement;el.style.boxShadow='0 0 48px rgba(249,115,22,.6)';el.style.transform='scale(1.01)'}}
              onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.boxShadow=files.length===0||loading?'none':'0 0 32px rgba(249,115,22,.35)';el.style.transform='scale(1)'}}>
              <span className={`text-lg ${!loading?'animate-bounce':''}`}>{loading?'⏳':'🔍'}</span>
              {loading ? 'AI 분석 중...' : 'AI 중복 분석 시작'}
            </button>
            {!authUser && files.length > 0 && (
              <p className="text-center text-xs mt-2" style={{color:'#3A424E'}}>
                🔐 로그인 후 분석 결과를 저장하고 언제든 다시 확인할 수 있습니다
              </p>
            )}
          </div>

          {/* ── 로딩 ── */}
          {loading && (
            <div className="text-center p-10 rounded-3xl mt-4" style={{background:'rgba(18,28,50,.8)',border:'1px solid rgba(75,127,212,.15)',backdropFilter:'blur(16px)'}}>
              <div className="flex items-center justify-center gap-1 mb-5">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="w-1 rounded-full" style={{
                    height:'28px',
                    background:i===stepIdx?'#6B9FFF':'rgba(75,127,212,.2)',
                    animation:`stepBounce .8s ease-in-out ${i*.12}s infinite`,
                    transition:'background .3s',
                  }}/>
                ))}
              </div>
              <p className="text-sm font-medium mb-1" style={{color:'#6B9FFF'}}>AI가 보험 문서를 분석하고 있습니다</p>
              <p className="text-xs" style={{color:'#3A424E'}}>{stepMsg}</p>
              <div className="flex justify-center gap-1.5 mt-4">
                {STEPS.map((_,i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{background:i===stepIdx?'#2D5BE3':'rgba(45,91,227,.2)'}}/>
                ))}
              </div>
            </div>
          )}

          {/* ── 결과 ── */}
          {result && (
            <div id="result-section" className="mt-6">
              {/* 결과 헤더 */}
              <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full" style={{background:'linear-gradient(180deg,#4B7FD4,#2D5BE3)'}}/>
                    <span className="text-base font-bold" style={{color:'#E2E8F0'}}>분석 완료 보고서</span>
                  </div>
                  <div className="text-xs mt-0.5 ml-3" style={{color:'#3A424E'}}>
                    {new Date().toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})} · 파일 {files.length}개
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap no-print">
                  {[
                    {label:'TXT', icon:<Download size={11}/>, fn:exportTxt},
                    {label:'PDF', icon:<FileText size={11}/>, fn:exportPdf},
                    {label:'인쇄', icon:<Printer size={11}/>, fn:()=>window.print()},
                  ].map((b,i) => (
                    <button key={i} onClick={b.fn}
                      className="spring-fast flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border cursor-pointer"
                      style={{borderColor:'rgba(75,127,212,.2)',color:'#6B9FFF',background:'rgba(75,127,212,.06)'}}
                      onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background='rgba(75,127,212,.14)';el.style.borderColor='rgba(75,127,212,.4)'}}
                      onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background='rgba(75,127,212,.06)';el.style.borderColor='rgba(75,127,212,.2)'}}>
                      {b.icon} {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 요약 지표 카드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                {[
                  {value:result.summary.duplicateCount, label:'중복 항목', color:'#EF4444', bc:'rgba(239,68,68,.25)', bg:'rgba(239,68,68,.05)'},
                  {value:result.summary.totalPolicies,  label:'분석 보험', color:'#E2E8F0', bc:'rgba(75,127,212,.2)',  bg:'rgba(75,127,212,.05)'},
                  {value:result.summary.estimatedMonthlySavings, label:'절감 예상', color:'#F59E0B', bc:'rgba(245,158,11,.25)', bg:'rgba(245,158,11,.05)'},
                  {value:result.summary.riskLevel, label:'위험도', color:riskColor(result.summary.riskLevel), bc:riskBorder(result.summary.riskLevel), bg:riskBg(result.summary.riskLevel)},
                ].map((m,i) => (
                  <div key={i} className="rounded-2xl p-4 text-center border"
                    style={{background:m.bg,borderColor:m.bc,backdropFilter:'blur(8px)'}}>
                    <div className="text-xl font-bold mb-1 truncate" style={{color:m.color}}>{m.value}</div>
                    <div className="text-xs" style={{color:'#3A424E'}}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* AI 요약 (Double-Bezel) */}
              <div className="mb-5" style={{padding:'1px',borderRadius:'16px',background:'linear-gradient(135deg,rgba(255,255,255,.09) 0%,rgba(255,255,255,.03) 100%)'}}>
                <div style={{borderRadius:'15px',background:'rgba(13,14,22,.94)',backdropFilter:'blur(12px)'}}>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot size={14} color="#6B9FFF"/>
                      <span className="text-xs font-semibold tracking-widest uppercase" style={{color:'#6B9FFF'}}>AI 분석 요약</span>
                    </div>
                    <p className="text-sm leading-[1.85] whitespace-pre-wrap" style={{color:'#8A9AB8'}}>{result.aiSummary}</p>
                  </div>
                </div>
              </div>

              {/* 중복 상세 테이블 */}
              <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{color:'#3A424E'}}>중복 보장 상세 목록</div>
              <div className="overflow-x-auto mb-5 rounded-2xl" style={{border:'1px solid rgba(75,127,212,.1)'}}>
                <table className="w-full border-collapse text-sm min-w-[600px]">
                  <thead>
                    <tr style={{background:'rgba(75,127,212,.06)'}}>
                      {['중복 항목','해당 보험','보장 내용 비교','중복 유형','절감 예상','심각도'].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-xs font-medium border-b whitespace-nowrap" style={{color:'#64707E',borderColor:'rgba(255,255,255,.07)'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.duplicates.length === 0
                      ? <tr><td colSpan={6} className="text-center py-8" style={{color:'#3A424E'}}>중복 보장 항목이 발견되지 않았습니다</td></tr>
                      : result.duplicates.map((d,i) => {
                          const sb = sevBadge(d.severity)
                          return (
                            <tr key={i} style={{borderBottom:'1px solid rgba(75,127,212,.06)'}}
                              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.04)'}}
                              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent'}}>
                              <td className="px-3 py-2.5 align-top">
                                <strong className="block text-sm font-medium mb-0.5" style={{color:'#E2E8F0'}}>{d.item}</strong>
                                <span className="text-xs" style={{color:'#3A424E'}}>{d.action}</span>
                              </td>
                              <td className="px-3 py-2.5 text-xs align-top" style={{color:'#64707E'}}>{d.policies}</td>
                              <td className="px-3 py-2.5 text-xs align-top">
                                <div className="mb-0.5" style={{color:'#6B9FFF'}}>A: {d.coverageA}</div>
                                <div style={{color:'#7A8FA8'}}>B: {d.coverageB}</div>
                              </td>
                              <td className="px-3 py-2.5 text-xs align-top" style={{color:'#7A8FA8'}}>{d.type}</td>
                              <td className="px-3 py-2.5 text-xs align-top font-medium" style={{color:'#F59E0B'}}>{d.monthlySavings}</td>
                              <td className="px-3 py-2.5 align-top">
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border"
                                  style={{color:sb.color,background:sb.bg,borderColor:sb.border}}>{d.severity}</span>
                              </td>
                            </tr>
                          )
                        })
                    }
                  </tbody>
                </table>
              </div>

              {/* AI 권고사항 */}
              <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{color:'#3A424E'}}>AI 권고사항</div>
              <div className="rounded-xl px-5 py-4 text-sm leading-[1.85] mb-3"
                style={{background:'rgba(75,127,212,.04)',border:'1px solid rgba(75,127,212,.15)',borderLeft:'3px solid #4B7FD4',color:'#8A9AB8'}}>
                {result.recommendation}
              </div>
              <div className="text-xs rounded-xl px-4 py-3 mb-8"
                style={{color:'#3A424E',background:'rgba(75,127,212,.02)',border:'1px solid rgba(75,127,212,.07)'}}>
                {result.disclaimer}
              </div>
            </div>
          )}

          {/* 푸터 */}
          <footer className="text-center mt-8 text-xs leading-7" style={{color:'#1A2A40'}}>
            <p>insure.dbzone.kr · AI 기반 보험 중복 분석 서비스</p>
            <p>본 서비스는 참고용이며, 실제 보험 변경 전 전문가 상담을 권장합니다.</p>
          </footer>
        </div>

        {/* ── 로그인 유도 모달 ── */}
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
            style={{background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)'}}
            onClick={()=>setShowLoginModal(false)}>
            <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
              style={{padding:'1px',background:'linear-gradient(135deg,rgba(75,127,212,.4) 0%,rgba(45,91,227,.2) 100%)'}}
              onClick={e=>e.stopPropagation()}>
              <div style={{borderRadius:'23px',background:'rgba(16,17,26,.98)',backdropFilter:'blur(20px)',padding:'24px'}}>
                <div className="text-center mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{background:'linear-gradient(135deg,rgba(45,91,227,.25),rgba(26,58,128,.25))',border:'1px solid rgba(75,127,212,.3)'}}>
                    <span className="text-2xl">🔐</span>
                  </div>
                  <div className="text-base font-bold mb-2" style={{color:'#E2E8F0'}}>로그인이 필요한 서비스입니다</div>
                  <p className="text-sm leading-relaxed" style={{color:'#64707E'}}>
                    분석 결과를 저장하고<br/>언제든 다시 확인할 수 있습니다.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={()=>handleLoginModalGo('/login')}
                    className="spring w-full py-3 rounded-2xl text-sm font-extrabold cursor-pointer"
                    style={{background:'linear-gradient(135deg,#F97316,#C05610)',color:'#FFF7ED',boxShadow:'0 0 20px rgba(249,115,22,.4)'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.boxShadow='0 0 32px rgba(48,111,255,.6)'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.boxShadow='0 0 20px rgba(45,91,227,.4)'}}>
                    로그인하기
                  </button>
                  <button onClick={()=>handleLoginModalGo('/register')}
                    className="spring w-full py-3 rounded-2xl text-sm font-bold border cursor-pointer"
                    style={{background:'rgba(75,127,212,.08)',borderColor:'rgba(75,127,212,.3)',color:'#6B9FFF'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.16)'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.08)'}}>
                    회원가입하기
                  </button>
                  <button onClick={()=>setShowLoginModal(false)}
                    className="w-full py-2.5 text-sm cursor-pointer transition-colors"
                    style={{color:'#3A424E'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='#6B9FFF'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#2D4060'}}>
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 경고 모달 ── */}
        {showEmptyWarning && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
            style={{background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)'}}>
            <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
              style={{padding:'1px',background:'linear-gradient(135deg,rgba(245,158,11,.3) 0%,rgba(75,127,212,.15) 100%)'}}>
              <div style={{borderRadius:'23px',background:'rgba(16,17,26,.98)',backdropFilter:'blur(20px)',padding:'24px'}}>
                <div className="text-base font-bold mb-3" style={{color:'#E2E8F0'}}>⚠️ 입력되지 않은 항목</div>
                <div className="text-sm leading-7 mb-5" style={{color:'#8A9AB8'}}>
                  <ul className="mb-3 space-y-1">
                    {emptyFields.map(f => <li key={f} style={{color:'#F59E0B'}}>· {FIELD_LABELS[f as keyof UserInfo]}</li>)}
                  </ul>
                  <p>기본 정보 없이 계속 진행하시겠습니까?</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleWarningCancel}
                    className="py-3 rounded-2xl text-sm border cursor-pointer transition-all"
                    style={{background:'rgba(75,127,212,.06)',borderColor:'rgba(75,127,212,.2)',color:'#8A9AB8'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.12)'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(75,127,212,.06)'}}>
                    입력하러 가기
                  </button>
                  <button onClick={handleWarningProceed}
                    className="spring py-3 rounded-2xl text-sm font-bold cursor-pointer"
                    style={{background:'linear-gradient(135deg,#F97316,#C05610)',color:'#FFF7ED'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.filter='brightness(1.15)'}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.filter='brightness(1)'}}>
                    계속 진행
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  )
}
