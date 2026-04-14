'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Bell, ShieldCheck, Home as HomeIcon, LayoutDashboard, Sparkles, LogOut, LogIn, UserPlus, Menu, X } from 'lucide-react'
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

const STEPS = ['파일 변환 중...', 'AI가 문서를 읽는 중...', '보장 항목 추출 중...', '중복 패턴 분석 중...', '보고서 생성 중...']

const fmtSize = (b: number) => b < 1024 ? b+'B' : b < 1048576 ? (b/1024).toFixed(1)+'KB' : (b/1048576).toFixed(1)+'MB'
const isPDF = (n: string) => /\.pdf$/i.test(n)
const isImage = (n: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(n)
const fileIcon = (n: string) => isPDF(n) ? '📕' : isImage(n) ? '🖼️' : /\.docx?$/i.test(n) ? '📘' : '📄'
const getMediaType = (n: string) => /\.png$/i.test(n) ? 'image/png' : /\.gif$/i.test(n) ? 'image/gif' : /\.webp$/i.test(n) ? 'image/webp' : 'image/jpeg'

async function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = e => res(((e.target?.result as string) || '').split(',')[1] || '')
    r.onerror = () => rej(new Error('파일 읽기 실패'))
    r.readAsDataURL(file)
  })
}
async function toText(file: File): Promise<string> {
  return new Promise(res => {
    const r = new FileReader()
    r.onload = e => res((e.target?.result as string) || '')
    r.onerror = () => res('')
    r.readAsText(file, 'utf-8')
  })
}

// 따뜻한 골드 베이지 테마 입력창 공통 스타일
const inputCls = 'w-full bg-white/[0.06] border border-[#4B7FD4]/25 rounded-xl px-3 py-2 text-[#E2E8F0] text-sm placeholder:text-[#2D4060] outline-none focus:border-[#4B7FD4]/70 focus:bg-[#2D5BE3]/[0.06] transition-colors'

interface AuthUser { id: number; email: string; username?: string }

export default function AnalyzePage() {
  const pathname = usePathname()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stepMsg, setStepMsg] = useState(STEPS[0])
  const [stepIdx, setStepIdx] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo>({ title: '', gender: '', age: '', job: '', health: '', purpose: '', budget: '' })
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [emptyFields, setEmptyFields] = useState<string[]>([])
  const [showEmptyWarning, setShowEmptyWarning] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const genderRef = useRef<HTMLInputElement>(null)
  const ageRef = useRef<HTMLInputElement>(null)
  const jobRef = useRef<HTMLInputElement>(null)
  const healthRef = useRef<HTMLInputElement>(null)
  const purposeRef = useRef<HTMLInputElement>(null)
  const budgetRef = useRef<HTMLInputElement>(null)
  const [autoPurpose, setAutoPurpose] = useState(false)
  const [autoTitle, setAutoTitle] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [restoredInfo, setRestoredInfo] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAdditional, setShowAdditional] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(u => {
      setAuthUser(u)
      // 로그인 후 복귀했을 때 저장된 userInfo 복원
      if (u?.id) {
        const saved = sessionStorage.getItem('pendingUserInfo')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setUserInfo(parsed)
            setRestoredInfo(true)
            sessionStorage.removeItem('pendingUserInfo')
          } catch { /* 무시 */ }
        }
      }
    })
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAuthUser(null)
  }

  const MAX_FILES = 5

  const addFiles = useCallback((list: FileList | File[]) => {
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      const newFiles = Array.from(list).filter(f => !names.has(f.name)).map(f => ({ file: f, name: f.name, size: f.size }))
      return [...prev, ...newFiles].slice(0, MAX_FILES)
    })
  }, [])

  const FIELD_LABELS: Record<keyof UserInfo, string> = { title: '제목', gender: '성별', age: '연령', job: '직업', health: '건강', purpose: '목적', budget: '예산' }

  const handleAnalyzeClick = () => {
    // 비로그인 체크
    if (!authUser) { setShowLoginModal(true); return }
    const requiredFields: (keyof UserInfo)[] = ['title', 'gender', 'age']
    const empty = requiredFields.filter(k => !userInfo[k].trim())
    if (empty.length > 0) { setEmptyFields(empty); setShowEmptyWarning(true); return }
    analyze()
  }

  const handleWarningProceed = () => {
    setShowEmptyWarning(false)
    if (!userInfo.title.trim()) setUserInfo(p => ({ ...p, title: '내보험 컨설팅' }))
    analyze()
  }

  const handleWarningCancel = () => {
    setShowEmptyWarning(false)
    const first = emptyFields[0] as keyof UserInfo
    setTimeout(() => {
      if (first === 'title') titleRef.current?.focus()
      else if (first === 'gender') genderRef.current?.focus()
      else if (first === 'age') ageRef.current?.focus()
      else if (first === 'job') jobRef.current?.focus()
      else if (first === 'health') healthRef.current?.focus()
      else if (first === 'budget') budgetRef.current?.focus()
      else if (first === 'purpose') purposeRef.current?.focus()
    }, 50)
  }

  const handleLoginModalGo = (path: '/login' | '/register') => {
    sessionStorage.setItem('pendingUserInfo', JSON.stringify(userInfo))
    window.location.href = `${path}?returnTo=/analyze`
  }


  const analyze = async () => {
    setError(''); setResult(null); setLoading(true); setStepIdx(0); setStepMsg(STEPS[0])
    let si = 0
    ivRef.current = setInterval(() => { si = (si + 1) % STEPS.length; setStepIdx(si); setStepMsg(STEPS[si]) }, 2000)

    try {
      const pdfFiles = files.filter(f => isPDF(f.name))
      const imgFiles = files.filter(f => isImage(f.name))
      const txtFiles = files.filter(f => !isPDF(f.name) && !isImage(f.name))
      const fileNames = files.map(f => f.name)
      let body: Record<string, unknown>

      if (pdfFiles.length > 0) {
        setStepMsg('PDF를 AI에 전달 중...')
        const pdfs = await Promise.all(pdfFiles.map(async f => ({ data: await toBase64(f.file), name: f.name })))
        let extraText = ''
        for (const f of txtFiles) extraText += `\n\n=== ${f.name} ===\n${(await toText(f.file)).slice(0, 3000)}`
        body = { pdfs, fileNames, text: extraText, userInfo }
      } else if (imgFiles.length > 0) {
        setStepMsg('이미지에서 보험 내용 추출 중...')
        const images = await Promise.all(imgFiles.map(async f => ({ data: await toBase64(f.file), mediaType: getMediaType(f.name) })))
        let extraText = ''
        for (const f of txtFiles) extraText += `\n\n=== ${f.name} ===\n${(await toText(f.file)).slice(0, 3000)}`
        body = { images, fileNames, text: extraText, userInfo }
      } else {
        let combined = ''
        for (const f of txtFiles) combined += `\n\n=== ${f.name} ===\n${(await toText(f.file)).slice(0, 4000)}`
        body = { text: combined, fileNames, userInfo }
      }

      setStepMsg('AI 중복 분석 중...')
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `오류 ${res.status}`)
      setResult(data)

      // 로그인 상태면 분석 결과 자동 저장
      if (authUser) {
        fetch('/api/analyses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userInfo, fileNames, result: data }),
        }).catch(() => {})
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      if (ivRef.current) clearInterval(ivRef.current)
      setLoading(false)
    }
  }

  const exportPdf = () => {
    if (!result) return
    const date = new Date().toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    const sevClass = (s: string) => s === '높음' ? 'badge-high' : s === '중간' ? 'badge-mid' : 'badge-low'
    const dupRows = result.duplicates.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:#888;padding:8mm 0">중복 보장 항목이 발견되지 않았습니다</td></tr>`
      : result.duplicates.map(d => `
        <tr>
          <td><strong>${d.item}</strong><br/><span style="color:#888;font-size:8pt">${d.action}</span></td>
          <td>${d.policies}</td>
          <td><span class="cov-a">A: ${d.coverageA}</span><br/><span class="cov-b">B: ${d.coverageB}</span></td>
          <td>${d.type}</td>
          <td style="color:#92400e;font-weight:500">${d.monthlySavings}</td>
          <td><span class="badge ${sevClass(d.severity)}">${d.severity}</span></td>
        </tr>`).join('')

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>보험 중복 분석 보고서</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Noto Sans KR',sans-serif;background:#fff;color:#1a1a1a;padding:18mm 20mm;font-size:10.5pt;line-height:1.6}
  .title-row{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #c4974a;padding-bottom:3mm;margin-bottom:5mm}
  .title-row h1{font-size:17pt;font-weight:700;color:#1a1a1a}
  .title-row .meta{font-size:8.5pt;color:#888;text-align:right;line-height:1.8}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-bottom:6mm}
  .card{border:1px solid #e0d8c8;border-radius:6px;padding:3.5mm 4mm;text-align:center}
  .card .val{font-size:16pt;font-weight:700;color:#1a1a1a}
  .card .val.red{color:#b91c1c}.card .val.amber{color:#92400e}.card .val.risk-high{color:#b91c1c}.card .val.risk-mid{color:#92400e}.card .val.risk-low{color:#166534}
  .card .lbl{font-size:8pt;color:#888;margin-top:1mm}
  .section-title{font-size:9pt;font-weight:600;color:#7a5c2e;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:2.5mm;margin-top:5mm}
  .ai-box{background:#fdf8f0;border:1px solid #e8d8b0;border-left:3px solid #c4974a;border-radius:6px;padding:4mm 5mm;font-size:9.5pt;line-height:1.8;color:#444;margin-bottom:5mm}
  table{width:100%;border-collapse:collapse;margin-bottom:5mm;font-size:8.5pt}
  th{background:#f5f2ec;border:1px solid #e0d8c8;padding:2mm 3mm;text-align:left;font-weight:600;color:#555;white-space:nowrap}
  td{border:1px solid #e0d8c8;padding:2.5mm 3mm;vertical-align:top;color:#333}
  tr:nth-child(even) td{background:#fafaf8}
  .badge{display:inline-block;padding:0.5mm 2.5mm;border-radius:3px;font-size:8pt;font-weight:500}
  .badge-high{background:#fee2e2;color:#991b1b}.badge-mid{background:#fef3c7;color:#92400e}.badge-low{background:#d1fae5;color:#065f46}
  .cov-a{color:#7a5c2e;display:block}.cov-b{color:#666;display:block}
  .rec-box{background:#fdf8f0;border:1px solid #e8d8b0;border-left:3px solid #c4974a;border-radius:6px;padding:4mm 5mm;font-size:9.5pt;line-height:1.9;color:#444;margin-bottom:4mm}
  .disc{font-size:8pt;color:#999;border:1px solid #eee;border-radius:5px;padding:3mm 4mm}
  @media print{body{padding:12mm 14mm}@page{margin:10mm}}
</style>
</head>
<body>
<div class="title-row">
  <h1>보험 중복 보장 분석 보고서</h1>
  <div class="meta">분석 일시: ${date}<br/>파일: ${files.map(f => f.name).join(', ')}</div>
</div>

<div class="cards">
  <div class="card"><div class="val red">${result.summary.duplicateCount}</div><div class="lbl">중복 보장 항목</div></div>
  <div class="card"><div class="val">${result.summary.totalPolicies}</div><div class="lbl">분석 보험 수</div></div>
  <div class="card"><div class="val amber">${result.summary.estimatedMonthlySavings}</div><div class="lbl">절감 예상액</div></div>
  <div class="card"><div class="val risk-${result.summary.riskLevel === '높음' ? 'high' : result.summary.riskLevel === '중간' ? 'mid' : 'low'}">${result.summary.riskLevel}</div><div class="lbl">중복 위험도</div></div>
</div>

<div class="section-title">⬡ AI 분석 요약</div>
<div class="ai-box">${result.aiSummary}</div>

<div class="section-title">중복 보장 상세 목록</div>
<table>
  <thead><tr><th>중복 항목</th><th>해당 보험</th><th>보장 내용 비교</th><th>중복 유형</th><th>절감 예상</th><th>심각도</th></tr></thead>
  <tbody>${dupRows}</tbody>
</table>

<div class="section-title">AI 권고사항</div>
<div class="rec-box">${result.recommendation}</div>
<div class="disc">${result.disclaimer}</div>

<script>window.addEventListener('load', () => setTimeout(() => window.print(), 500))</script>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  const exportTxt = () => {
    if (!result) return
    const rows = result.duplicates.map(d => `${d.item}\t${d.policies}\t${d.type}\t${d.monthlySavings}\t${d.severity}`).join('\n')
    const txt = ['보험 중복 보장 분석 보고서','='.repeat(44),`분석 일시: ${new Date().toLocaleString('ko-KR')}`,`파일: ${files.map(f=>f.name).join(', ')}`,'','[요약]',`• 분석 보험: ${result.summary.totalPolicies}개`,`• 중복 항목: ${result.summary.duplicateCount}개`,`• 절감 예상: ${result.summary.estimatedMonthlySavings}`,`• 위험도: ${result.summary.riskLevel}`,'','[AI 요약]',result.aiSummary,'','[중복 상세]','항목\t보험\t유형\t절감\t심각도',rows,'','[권고사항]',result.recommendation,'','[안내]',result.disclaimer].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }))
    a.download = `보험중복분석_${new Date().toLocaleDateString('ko-KR').replace(/\.\s*/g,'-').replace(/-$/,'')}.txt`
    a.click()
  }

  const sevBadge = (s: string) =>
    s === '높음' ? 'bg-rose-500/15 text-rose-400' :
    s === '중간' ? 'bg-amber-500/15 text-amber-400' :
    'bg-emerald-500/15 text-emerald-400'

  const riskCard = (s: string) =>
    s === '높음' ? 'border-rose-500/30 bg-rose-500/5' :
    s === '중간' ? 'border-amber-500/30 bg-amber-500/5' :
    'border-emerald-500/30 bg-emerald-500/5'

  const riskVal = (s: string) =>
    s === '높음' ? 'text-rose-400' :
    s === '중간' ? 'text-amber-400' :
    'text-emerald-400'

  const NAV_ITEMS = [
    { href: '/', icon: <HomeIcon size={18} />, label: '홈' },
    { href: '/dashboard', icon: <LayoutDashboard size={18} />, label: '내 분석 내역' },
    { href: '#', icon: <Sparkles size={18} />, label: '프리미엄' },
  ]

  return (
    <main className="min-h-screen bg-[#0C1221] text-[#A8B8CC]">

      {/* ── 통합 GNB ── */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#0F1828]/90 border-b border-[#4B7FD4]/10">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between w-full gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2D5BE3] to-[#1A3A80] flex items-center justify-center">
              <ShieldCheck size={15} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-[#E2E8F0] group-hover:text-[#6B9FFF] transition-colors">AI 보험 분석</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all
                  ${pathname === item.href
                    ? 'bg-[#2D5BE3]/15 text-[#93B4FF]'
                    : 'text-[#4E6888] hover:text-[#A8B8CC] hover:bg-white/[0.05]'}`}>
                {item.icon} {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            {authUser ? (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2D5BE3] to-[#1A3A80] flex items-center justify-center text-[10px] font-bold text-white">
                    {(authUser.username || authUser.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-[#A8B8CC]">{authUser.username || authUser.email}</span>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-1 text-xs text-[#4E6888] hover:text-[#6B9FFF] border border-[#4B7FD4]/20 rounded-lg px-3 py-1.5 hover:border-[#4B7FD4]/40 transition-colors cursor-pointer">
                  <LogOut size={12} /> 로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-xs text-[#4E6888] hover:text-[#6B9FFF] transition-colors px-2 py-1.5 flex items-center gap-1">
                  <LogIn size={13} /> 로그인
                </Link>
                <Link href="/register" className="flex items-center gap-1 text-xs text-[#6B9FFF] border border-[#4B7FD4]/30 rounded-lg px-3 py-1.5 hover:bg-[#2D5BE3]/10 transition-colors">
                  <UserPlus size={13} /> 회원가입
                </Link>
              </>
            )}
          </div>

          {/* 모바일 햄버거 */}
          <button className="md:hidden text-[#6B9FFF] cursor-pointer p-1 ml-auto"
            onClick={() => setMobileMenuOpen(v => !v)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* 모바일 드롭다운 */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0C1221] border-t border-[#4B7FD4]/10 px-5 py-4 flex flex-col gap-1">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-all
                  ${pathname === item.href
                    ? 'bg-[#2D5BE3]/15 text-[#93B4FF]'
                    : 'text-[#4E6888] hover:text-[#A8B8CC] hover:bg-white/[0.04]'}`}>
                {item.icon} {item.label}
              </Link>
            ))}
            <div className="border-t border-[#4B7FD4]/10 mt-2 pt-3">
              {authUser ? (
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false) }}
                  className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm text-[#4E6888] hover:text-rose-400 hover:bg-rose-500/[0.05] transition-all cursor-pointer w-full">
                  <LogOut size={16} /> 로그아웃
                </button>
              ) : (
                <div className="flex flex-col gap-1">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm text-[#4E6888] hover:text-[#A8B8CC] hover:bg-white/[0.04] transition-all">
                    <LogIn size={16} /> 로그인
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm text-[#6B9FFF] hover:bg-[#2D5BE3]/10 transition-all">
                    <UserPlus size={16} /> 회원가입
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── 본문 ── */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-16">

        {/* [1] 설명 영역 */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#2D5BE3]/[0.08] border border-[#4B7FD4]/20 rounded-full px-4 py-1.5 text-xs text-[#6B9FFF] mb-5">
            <Bell className="animate-bounce text-red-400 fill-red-400" size={13} />
            AI 보험 중복 분석 서비스
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#E2E8F0] leading-snug mb-3">
            보험 <span className="text-[#6B9FFF]">중복보장</span>을<br />AI로 분석해 드립니다
          </h1>
          <p className="text-sm text-[#4E6888] leading-relaxed">
            보험 문서를 업로드하면 중복 항목을 파악하고<br className="hidden sm:block" />절감 가능 금액과 맞춤 보고서를 생성합니다
          </p>
          <div className="flex justify-center gap-2 flex-wrap mt-4">
            <span className="text-xs px-3 py-1 rounded-full border text-rose-400 border-rose-400/30">📕 PDF</span>
            <span className="text-xs px-3 py-1 rounded-full border text-amber-400 border-amber-400/30">🖼️ JPG · PNG</span>
            <span className="text-xs px-3 py-1 rounded-full border text-[#6B9FFF] border-[#4B7FD4]/30">📄 TXT · DOCX</span>
          </div>
        </header>

        {/* [2-0] 제목 (섹션 카드 바깥) */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-[#93B4FF]">
              제목 <span className="text-rose-400">*</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={autoTitle}
                onChange={e => { setAutoTitle(e.target.checked); setUserInfo(p => ({...p, title: e.target.checked ? '내보험 컨설팅' : ''})) }}
                className="w-3 h-3 accent-[#d4b483] cursor-pointer" />
              <span className="text-xs text-[#6B9FFF]">자동입력</span>
            </label>
          </div>
          <input
            ref={titleRef}
            className={`w-full bg-white/[0.06] border rounded-xl px-3 py-2.5 text-[#E2E8F0] text-sm placeholder:text-[#2D4060] outline-none focus:bg-[#2D5BE3]/[0.06] transition-colors ${emptyFields.includes('title') ? 'border-rose-500/70 focus:border-rose-400' : 'border-[#4B7FD4]/25 focus:border-[#4B7FD4]/70'}`}
            value={userInfo.title}
            onChange={e => { setAutoTitle(false); setUserInfo(p => ({...p, title: e.target.value})); setEmptyFields(p => p.filter(f => f !== 'title')) }}
            placeholder="예: 내보험 컨설팅"
          />
        </div>

        {/* [2] 기본 정보 카드 */}
        <section className="bg-[#131F35] border border-[#4B7FD4]/15 rounded-3xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-4 bg-[#2D5BE3] rounded-full" />
            <p className="text-sm font-semibold text-[#E2E8F0]">기본 정보</p>
            <p className="text-xs text-[#6a6050] ml-1">추가 정보를 입력할수록 정확한 AI 분석이 가능합니다</p>
          </div>

          {/* 필수 2열: 성별, 생년월일 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

            {/* 성별 토글 버튼 */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#93B4FF]">
                성별 <span className="text-rose-400">*</span>
              </label>
              <div className={`flex rounded-xl overflow-hidden border ${emptyFields.includes('gender') ? 'border-rose-500/70' : 'border-[#4B7FD4]/25'}`}
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['남성', '여성'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setUserInfo(p => ({...p, gender: opt})); setEmptyFields(p => p.filter(x => x !== 'gender')) }}
                    className={`flex-1 py-[9px] text-sm font-medium transition-all duration-200 cursor-pointer
                      ${userInfo.gender === opt
                        ? 'bg-[#2D5BE3] text-[#1a1410] font-bold shadow-inner'
                        : 'text-[#4E6888] hover:text-[#E2E8F0] hover:bg-white/[0.06]'
                      }`}
                  >
                    {opt === '남성' ? '♂ 남성' : '♀ 여성'}
                  </button>
                ))}
              </div>
              {emptyFields.includes('gender') && (
                <p className="text-[11px] text-rose-400">성별을 선택해 주세요</p>
              )}
            </div>

            {/* 생년월일 날짜 선택 */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#93B4FF]">
                생년월일 <span className="text-rose-400">*</span>
              </label>
              <input
                ref={ageRef}
                type="date"
                className={`w-full bg-white/[0.06] border rounded-xl px-3 py-2 text-[#E2E8F0] text-sm outline-none focus:bg-[#2D5BE3]/[0.06] transition-colors cursor-pointer [color-scheme:dark]
                  ${emptyFields.includes('age') ? 'border-rose-500/70 focus:border-rose-400' : 'border-[#4B7FD4]/25 focus:border-[#4B7FD4]/70'}`}
                value={userInfo.age}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => { setUserInfo(p => ({...p, age: e.target.value})); setEmptyFields(p => p.filter(x => x !== 'age')) }}
              />
              {emptyFields.includes('age') && (
                <p className="text-[11px] text-rose-400">생년월일을 선택해 주세요</p>
              )}
            </div>

          </div>

          {/* 추가 정보 토글 */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <div
              className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${showAdditional ? 'bg-[#2D5BE3]' : 'bg-white/10'}`}
              onClick={() => setShowAdditional(v => !v)}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${showAdditional ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-[#9a8e7a]">추가 정보 입력</span>
            <span className="text-xs text-[#2D4060]">(직업, 건강, 예산, 목적)</span>
          </label>

          {/* 추가 정보 (토글 시 표시) */}
          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: showAdditional ? '400px' : '0px', opacity: showAdditional ? 1 : 0, marginTop: showAdditional ? '16px' : '0' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: '직업', ref: jobRef, key: 'job', placeholder: '예: 사무직' },
                { label: '건강', ref: healthRef, key: 'health', placeholder: '예: 고혈압 복용 중' },
                { label: '예산', ref: budgetRef, key: 'budget', placeholder: '예: 월 15만원' },
              ].map(f => (
                <div key={f.key} className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#93B4FF]">{f.label}</label>
                  <input ref={f.ref} className={inputCls} value={userInfo[f.key as keyof UserInfo]}
                    onChange={e => setUserInfo(p => ({...p, [f.key]: e.target.value}))}
                    placeholder={f.placeholder} />
                </div>
              ))}

              {/* 목적 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#93B4FF]">목적</label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={autoPurpose}
                      onChange={e => { setAutoPurpose(e.target.checked); setUserInfo(p => ({...p, purpose: e.target.checked ? '중복 보장제거 및 컨설팅' : ''})) }}
                      className="w-3 h-3 accent-[#d4b483] cursor-pointer" />
                    <span className="text-xs text-[#6B9FFF]">자동입력</span>
                  </label>
                </div>
                <input ref={purposeRef} className={inputCls} value={userInfo.purpose}
                  onChange={e => { setAutoPurpose(false); setUserInfo(p => ({...p, purpose: e.target.value})) }}
                  placeholder="예: 중복 보장 제거" />
              </div>
            </div>
          </div>
        </section>

        {/* [2.5] 내보험 가져오기 버튼 */}
        <CodefImportButton onImported={(file) => {
          setFiles(prev => {
            const exists = prev.some(f => f.name === file.name)
            if (exists) return prev
            return [...prev, { file, name: file.name, size: file.size }].slice(0, MAX_FILES)
          })
        }} />

        {/* [3] 업로드 카드 */}
        <section className="bg-[#131F35] border border-[#4B7FD4]/15 rounded-3xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-[#2D5BE3] rounded-full" />
            <p className="text-sm font-semibold text-[#E2E8F0]">보험 문서 업로드</p>
          </div>

          {/* 신뢰 문구 */}
          <div className="flex items-center justify-center gap-1.5 mb-3 text-xs text-zinc-500">
            <span>🔒</span>
            <span>첨부 파일은 AI 분석에만 사용되며 저장되지 않습니다.</span>
          </div>

          {/* 드롭존 */}
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all select-none ${dragging ? 'border-[#4B7FD4]/60 bg-[#2D5BE3]/[0.06]' : 'border-[#4B7FD4]/20 bg-[#2D5BE3]/[0.02] hover:border-[#4B7FD4]/40 hover:bg-[#2D5BE3]/[0.04]'}`}
            onDragOver={e=>{e.preventDefault();setDragging(true)}}
            onDragLeave={()=>setDragging(false)}
            onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files)}}
            onClick={()=>fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              className="hidden" onChange={e=>e.target.files&&addFiles(e.target.files)} />
            <div className="w-12 h-12 rounded-2xl bg-[#2D5BE3]/[0.08] border border-[#4B7FD4]/20 flex items-center justify-center text-2xl mx-auto mb-3">📋</div>
            <p className="text-sm font-medium text-[#d9cfc0] mb-1">드래그하거나 클릭하여 업로드</p>
            <p className="text-xs text-[#2D4060]">PDF · JPG · PNG · TXT · DOCX · 최대 5개</p>
          </div>

          {/* 파일 목록 */}
          {files.length > 0 && (
            <div className="flex flex-col gap-2 mt-3">
              {files.map((f,i) => (
                <div key={f.name} className="flex items-center gap-2.5 px-3 py-2.5 bg-[#0C1221] border border-[#4B7FD4]/10 rounded-xl">
                  <span className="text-base">{fileIcon(f.name)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#d9cfc0] truncate">{f.name}</div>
                    <div className="text-xs text-[#2D4060]">{fmtSize(f.size)}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg border shrink-0 font-medium ${isPDF(f.name) ? 'text-rose-400 border-rose-400/30' : isImage(f.name) ? 'text-amber-400 border-amber-400/30' : 'text-[#6B9FFF] border-[#4B7FD4]/30'}`}>
                    {isPDF(f.name)?'PDF':isImage(f.name)?'IMG':'TXT'}
                  </span>
                  <button className="text-[#2D4060] hover:text-rose-400 transition-colors text-sm cursor-pointer"
                    onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))}>✕</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 복원 알림 */}
        {restoredInfo && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl px-4 py-3 text-emerald-400 text-xs mb-4">
            <span>✅</span>
            <span>이전 입력 정보를 복원했습니다. 파일을 다시 업로드해 주세요.</span>
            <button className="ml-auto text-emerald-600 hover:text-emerald-400 cursor-pointer" onClick={() => setRestoredInfo(false)}>✕</button>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="bg-rose-500/[0.05] border border-rose-500/30 rounded-2xl px-4 py-3 text-rose-400 text-sm mb-4">{error}</div>
        )}

        {/* 분석 버튼 (데스크탑) */}
        <div className="hidden sm:block no-print mb-6">
          <div className={`${(files.length===0||loading) ? 'opacity-40 pointer-events-none' : ''}`}>
            <button
              className="gold-glow-btn w-full py-4 bg-gradient-to-b from-[#4B8FFF] via-[#306FFF] to-[#1A4FC4] hover:from-[#6BA8FF] hover:via-[#4B8FFF] hover:to-[#2D5BE3] rounded-2xl border-2 border-[#4B8FFF] text-white font-extrabold text-base tracking-wide flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.01]"
              disabled={files.length===0||loading}
              onClick={handleAnalyzeClick}
            >
              <span className={`text-lg ${!loading ? 'animate-bounce' : ''}`}>{loading ? '⏳' : '🔍'}</span>
              {loading ? '분석 중...' : 'AI 중복 분석 시작'}
            </button>
          </div>
          {!authUser && files.length > 0 && (
            <p className="text-center text-xs text-[#2D4060] mt-2">
              🔐 로그인 후 분석 결과를 저장하고 언제든 다시 확인할 수 있습니다
            </p>
          )}
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="text-center p-10 bg-[#131F35] border border-[#4B7FD4]/15 rounded-3xl mt-4">
            <div className="w-10 h-10 border-2 border-[#4B7FD4]/20 border-t-[#d4b483] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#6B9FFF] text-sm font-medium">AI가 보험 문서를 분석하고 있습니다</p>
            <p className="text-xs text-[#2D4060] mt-1">{stepMsg}</p>
            <div className="flex justify-center gap-1.5 mt-4">
              {STEPS.map((_,i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i===stepIdx ? 'bg-[#2D5BE3]' : 'bg-[#2D5BE3]/20'}`} />
              ))}
            </div>
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div id="result-section" className="mt-6">
            <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
              <div>
                <div className="text-base font-bold text-[#E2E8F0]">분석 완료 보고서</div>
                <div className="text-xs text-[#2D4060] mt-0.5">
                  {new Date().toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})} · 파일 {files.length}개
                </div>
              </div>
              <div className="flex gap-2 flex-wrap no-print">
                <button className="px-3 py-1.5 bg-transparent border border-[#4B7FD4]/25 rounded-xl text-[#6B9FFF] text-xs hover:bg-[#2D5BE3]/10 transition-colors cursor-pointer" onClick={exportTxt}>📄 TXT</button>
                <button className="px-3 py-1.5 bg-transparent border border-[#4B7FD4]/25 rounded-xl text-[#6B9FFF] text-xs hover:bg-[#2D5BE3]/10 transition-colors cursor-pointer" onClick={exportPdf}>📑 PDF</button>
                <button className="px-3 py-1.5 bg-transparent border border-[#4B7FD4]/25 rounded-xl text-[#6B9FFF] text-xs hover:bg-[#2D5BE3]/10 transition-colors cursor-pointer" onClick={()=>window.print()}>🖨️ 인쇄</button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
              <div className="bg-rose-500/5 border border-rose-500/25 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-rose-400 mb-1">{result.summary.duplicateCount}</div>
                <div className="text-xs text-[#2D4060]">중복 항목</div>
              </div>
              <div className="bg-[#131F35] border border-[#4B7FD4]/15 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-[#d9cfc0] mb-1">{result.summary.totalPolicies}</div>
                <div className="text-xs text-[#2D4060]">분석 보험</div>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-4 text-center">
                <div className="text-xl font-bold text-amber-400 mb-1">{result.summary.estimatedMonthlySavings}</div>
                <div className="text-xs text-[#2D4060]">절감 예상</div>
              </div>
              <div className={`rounded-2xl p-4 text-center border ${riskCard(result.summary.riskLevel)}`}>
                <div className={`text-xl font-bold mb-1 ${riskVal(result.summary.riskLevel)}`}>{result.summary.riskLevel}</div>
                <div className="text-xs text-[#2D4060]">위험도</div>
              </div>
            </div>

            <div className="bg-[#131F35] border border-[#4B7FD4]/15 rounded-2xl p-5 mb-5">
              <div className="text-xs font-semibold text-[#6B9FFF] mb-3">⬡ AI 분석 요약</div>
              <p className="text-sm text-[#a09080] leading-7">{result.aiSummary}</p>
            </div>

            <div className="text-xs font-semibold text-[#2D4060] mb-3">중복 보장 상세 목록</div>
            <div className="overflow-x-auto mb-5">
              <table className="w-full border-collapse text-sm min-w-[600px]">
                <thead>
                  <tr>
                    {['중복 항목','해당 보험','보장 내용 비교','중복 유형','절감 예상','심각도'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs text-[#2D4060] font-normal border-b border-[#4B7FD4]/10 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.duplicates.length === 0
                    ? <tr><td colSpan={6} className="text-center text-[#2D4060] py-6">중복 보장 항목이 발견되지 않았습니다</td></tr>
                    : result.duplicates.map((d,i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2.5 border-b border-[#4B7FD4]/[0.06] align-top">
                          <strong className="block text-[#E2E8F0] font-medium text-sm mb-0.5">{d.item}</strong>
                          <span className="text-xs text-[#2D4060]">{d.action}</span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#4B7FD4]/[0.06] text-xs text-[#4E6888] align-top">{d.policies}</td>
                        <td className="px-3 py-2.5 border-b border-[#4B7FD4]/[0.06] text-xs align-top">
                          <div className="text-[#6B9FFF] mb-0.5">A: {d.coverageA}</div>
                          <div className="text-[#a09080]">B: {d.coverageB}</div>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#4B7FD4]/[0.06] text-xs text-[#a09080] align-top">{d.type}</td>
                        <td className="px-3 py-2.5 border-b border-[#4B7FD4]/[0.06] text-xs text-amber-400 align-top">{d.monthlySavings}</td>
                        <td className="px-3 py-2.5 border-b border-[#4B7FD4]/[0.06] align-top">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${sevBadge(d.severity)}`}>{d.severity}</span>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            <div className="text-xs font-semibold text-[#2D4060] mb-3">AI 권고사항</div>
            <div className="bg-[#2D5BE3]/[0.04] border border-[#4B7FD4]/20 border-l-[3px] border-l-[#d4b483] rounded-xl px-5 py-4 text-sm text-[#a09080] leading-7 mb-3">
              {result.recommendation}
            </div>
            <div className="text-xs text-[#4a4035] bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3 mb-6">
              {result.disclaimer}
            </div>
          </div>
        )}

        <footer className="text-center mt-12 text-xs text-[#3a3530] leading-7">
          <p>insure.dbzone.kr · AI 기반 보험 중복 분석 서비스</p>
          <p>본 서비스는 참고용이며, 실제 보험 변경 전 전문가 상담을 권장합니다.</p>
        </footer>
      </div>

      {/* 로그인 유도 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-4"
          onClick={() => setShowLoginModal(false)}>
          <div className="bg-[#131F35] border border-[#4B7FD4]/25 rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2D5BE3] to-[#1A3A80] flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔐</span>
              </div>
              <div className="text-base font-bold text-[#E2E8F0] mb-2">로그인이 필요한 서비스입니다</div>
              <p className="text-sm text-[#4E6888] leading-relaxed mb-5">
                분석 결과를 저장하고<br />언제든 다시 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="w-full py-3 bg-gradient-to-b from-[#f5d060] via-[#e8b840] to-[#c4892a] rounded-2xl text-[#1e1408] font-extrabold text-sm cursor-pointer hover:brightness-110 transition-all"
                onClick={() => handleLoginModalGo('/login')}>
                로그인하기
              </button>
              <button
                className="w-full py-3 bg-[#2D5BE3]/10 border border-[#4B7FD4]/30 rounded-2xl text-[#6B9FFF] font-bold text-sm cursor-pointer hover:bg-[#2D5BE3]/20 transition-all"
                onClick={() => handleLoginModalGo('/register')}>
                회원가입하기
              </button>
              <button
                className="w-full py-2.5 text-[#2D4060] text-sm cursor-pointer hover:text-[#a09080] transition-colors mt-1"
                onClick={() => setShowLoginModal(false)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 경고 모달 */}
      {showEmptyWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-4">
          <div className="bg-[#131F35] border border-[#4B7FD4]/25 rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-sm shadow-2xl">
            <div className="text-base font-bold text-[#E2E8F0] mb-3">⚠️ 입력되지 않은 항목</div>
            <div className="text-sm text-[#a09080] leading-7 mb-5">
              <ul className="mb-3 space-y-1">
                {emptyFields.map(f => <li key={f} className="text-amber-400">· {FIELD_LABELS[f as keyof UserInfo]}</li>)}
              </ul>
              <p>기본 정보 없이 계속 진행하시겠습니까?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="py-3 bg-transparent border border-[#4B7FD4]/20 rounded-2xl text-[#a09080] text-sm hover:border-[#4B7FD4]/40 transition-colors cursor-pointer"
                onClick={handleWarningCancel}>입력하러 가기</button>
              <button
                className="py-3 bg-gradient-to-r from-[#7a5c2e] to-[#c4974a] rounded-2xl text-[#E2E8F0] text-sm font-bold hover:brightness-110 transition-all cursor-pointer"
                onClick={handleWarningProceed}>계속 진행</button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
