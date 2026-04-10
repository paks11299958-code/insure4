'use client'
import { useState, useRef, useCallback } from 'react'

interface Duplicate {
  item: string; policies: string; coverageA: string; coverageB: string
  type: string; monthlySavings: string; severity: string; action: string
}
interface AnalysisResult {
  summary: { totalPolicies: number; duplicateCount: number; estimatedMonthlySavings: string; riskLevel: string }
  duplicates: Duplicate[]; aiSummary: string; recommendation: string; disclaimer: string
}
interface UploadedFile { file: File; name: string; size: number }
interface UserInfo { gender: string; job: string; health: string; purpose: string; budget: string }

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
const inputCls = 'w-full bg-white/[0.04] border border-[#d4b483]/20 rounded-xl px-3 py-2 text-[#c4b49a] text-sm placeholder:text-[#6a6050] outline-none focus:border-[#d4b483]/50 focus:bg-[#d4b483]/[0.04] transition-colors'

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stepMsg, setStepMsg] = useState(STEPS[0])
  const [stepIdx, setStepIdx] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo>({ gender: '', job: '', health: '', purpose: '', budget: '' })
  const [showEmptyWarning, setShowEmptyWarning] = useState(false)
  const [emptyFields, setEmptyFields] = useState<string[]>([])
  const genderRef = useRef<HTMLInputElement>(null)
  const jobRef = useRef<HTMLInputElement>(null)
  const healthRef = useRef<HTMLInputElement>(null)
  const purposeRef = useRef<HTMLTextAreaElement>(null)
  const budgetRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((list: FileList | File[]) => {
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...Array.from(list).filter(f => !names.has(f.name)).map(f => ({ file: f, name: f.name, size: f.size }))]
    })
  }, [])

  const FIELD_LABELS: Record<keyof UserInfo, string> = { gender: '성별/연령', job: '직업', health: '건강', purpose: '목적', budget: '예산' }

  const handleAnalyzeClick = () => {
    const empty = (Object.keys(userInfo) as (keyof UserInfo)[]).filter(k => !userInfo[k].trim())
    if (empty.length > 0) { setEmptyFields(empty); setShowEmptyWarning(true); return }
    analyze()
  }

  const handleWarningProceed = () => { setShowEmptyWarning(false); analyze() }

  const handleWarningCancel = () => {
    setShowEmptyWarning(false)
    const first = emptyFields[0] as keyof UserInfo
    setTimeout(() => {
      if (first === 'gender') genderRef.current?.focus()
      else if (first === 'job') jobRef.current?.focus()
      else if (first === 'health') healthRef.current?.focus()
      else if (first === 'purpose') purposeRef.current?.focus()
      else if (first === 'budget') budgetRef.current?.focus()
    }, 50)
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

  return (
    <main className="min-h-screen bg-[#2c2a29] text-[#c4b49a]">
      <div className="max-w-3xl mx-auto px-5 py-10 pb-20">

        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#d4b483]/[0.08] border border-[#d4b483]/25 rounded-full px-4 py-1.5 text-[11px] text-[#d4b483] tracking-widest mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4b483] animate-pulse" />
            AI 보험 중복 분석기
          </div>
          <h1 className="font-['DM_Serif_Display',serif] text-[clamp(1.9rem,5vw,2.6rem)] font-normal text-[#f0ebe0] leading-tight mb-3">
            보험 <em className="text-[#d4b483] not-italic">중복보장</em><br />자동 분석 시스템
          </h1>
          <p className="text-sm text-[#7a7060] leading-7">
            보험 문서를 업로드하면 AI가 중복 보장 항목을 파악하고<br />절감 가능한 보험료와 맞춤형 보고서를 생성합니다
          </p>
          <div className="flex justify-center gap-2.5 flex-wrap mt-4">
            <span className="text-xs px-3 py-1 rounded-full border text-rose-400 border-rose-400/30">📕 PDF</span>
            <span className="text-xs px-3 py-1 rounded-full border text-amber-400 border-amber-400/30">🖼️ JPG · PNG</span>
            <span className="text-xs px-3 py-1 rounded-full border text-[#d4b483] border-[#d4b483]/30">📄 TXT · DOCX</span>
          </div>
        </header>

        {/* User Info Form */}
        <section className="bg-white/[0.03] border border-[#d4b483]/20 rounded-2xl p-5 mb-4">
          <p className="text-sm font-medium text-[#d4b483] mb-4">
            사용자 기본 정보
            <span className="text-xs text-[#7a7060] font-normal"> (AI가 더욱 자세한 분석을 할 수 있습니다.)</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#7a7060] font-medium tracking-wide">성별/연령</label>
              <input ref={genderRef} className={inputCls} value={userInfo.gender}
                onChange={e => setUserInfo(p => ({...p, gender: e.target.value}))}
                placeholder="예: 남성 / 1973년생" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#7a7060] font-medium tracking-wide">직업</label>
              <input ref={jobRef} className={inputCls} value={userInfo.job}
                onChange={e => setUserInfo(p => ({...p, job: e.target.value}))}
                placeholder="예: IT 기업 대표 (사무직)" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#7a7060] font-medium tracking-wide">건강</label>
              <input ref={healthRef} className={inputCls} value={userInfo.health}
                onChange={e => setUserInfo(p => ({...p, health: e.target.value}))}
                placeholder="예: 고혈압 약 복용 중 (5년 내 수술 없음)" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#7a7060] font-medium tracking-wide">예산</label>
              <input ref={budgetRef} className={inputCls} value={userInfo.budget}
                onChange={e => setUserInfo(p => ({...p, budget: e.target.value}))}
                placeholder="예: 월 15만 원 내외" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs text-[#7a7060] font-medium tracking-wide">목적</label>
              <textarea ref={purposeRef} className={`${inputCls} resize-none`} rows={2}
                value={userInfo.purpose}
                onChange={e => setUserInfo(p => ({...p, purpose: e.target.value}))}
                placeholder="예: 중복 보장제거, 갱신형 특약 정리 및 뇌/심장 진단비 보강" />
            </div>
          </div>
        </section>

        {/* Upload Zone */}
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all select-none mb-3 ${dragging ? 'border-[#d4b483]/60 bg-[#d4b483]/[0.06]' : 'border-[#d4b483]/20 bg-[#d4b483]/[0.02] hover:border-[#d4b483]/45 hover:bg-[#d4b483]/[0.04]'}`}
          onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files)}}
          onClick={()=>fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
            className="hidden" onChange={e=>e.target.files&&addFiles(e.target.files)} />
          <div className="w-14 h-14 rounded-2xl bg-[#d4b483]/[0.08] border border-[#d4b483]/20 flex items-center justify-center text-2xl mx-auto mb-4">📋</div>
          <p className="text-base font-medium text-[#d9cfc0] mb-1.5">보험 문서를 드래그하거나 클릭하여 업로드</p>
          <p className="text-xs text-[#7a7060]">PDF · JPG · PNG · TXT · DOCX 지원 &nbsp;·&nbsp; 여러 파일 동시 업로드</p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-3">
            {files.map((f,i) => (
              <div key={f.name} className="flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.03] border border-[#d4b483]/15 rounded-xl">
                <span className="text-lg">{fileIcon(f.name)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#d9cfc0] truncate">{f.name}</div>
                  <div className="text-xs text-[#7a7060]">{fmtSize(f.size)}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-lg border shrink-0 font-medium ${isPDF(f.name) ? 'text-rose-400 border-rose-400/40' : isImage(f.name) ? 'text-amber-400 border-amber-400/40' : 'text-[#d4b483] border-[#d4b483]/40'}`}>
                  {isPDF(f.name)?'PDF':isImage(f.name)?'IMG':'TXT'}
                </span>
                <button className="text-[#7a7060] hover:text-rose-400 hover:bg-rose-400/10 rounded-lg px-1.5 py-0.5 text-sm transition-colors"
                  onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-rose-500/[0.05] border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm mb-3">{error}</div>
        )}

        {/* Analyze Button */}
        <button
          className="no-print w-full py-3.5 bg-gradient-to-r from-[#7a5c2e] to-[#c4974a] hover:brightness-110 hover:-translate-y-px disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none rounded-xl text-[#f0ebe0] font-medium text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#7a5c2e]/20"
          disabled={files.length===0||loading}
          onClick={handleAnalyzeClick}
        >
          {loading ? '⏳ 분석 중...' : '🔍 AI 중복 분석 시작'}
        </button>

        {/* Loading */}
        {loading && (
          <div className="text-center p-10 bg-[#d4b483]/[0.03] border border-[#d4b483]/15 rounded-2xl mt-5">
            <div className="w-11 h-11 border-2 border-[#d4b483]/15 border-t-[#d4b483] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#d4b483] text-sm">AI가 보험 문서를 분석하고 있습니다</p>
            <p className="text-xs text-[#7a7060] mt-1">{stepMsg}</p>
            <div className="flex justify-center gap-1.5 mt-4">
              {STEPS.map((_,i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i===stepIdx ? 'bg-[#d4b483]' : 'bg-[#d4b483]/20'}`} />
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div id="result-section" className="mt-8">
            {/* Result Header */}
            <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
              <div>
                <div className="text-lg font-medium text-[#f0ebe0]">분석 완료 보고서</div>
                <div className="text-xs text-[#7a7060] mt-0.5">
                  {new Date().toLocaleString('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})} · 파일 {files.length}개
                </div>
              </div>
              <div className="flex gap-2 flex-wrap no-print">
                <button className="px-4 py-1.5 bg-transparent border border-[#d4b483]/30 rounded-lg text-[#d4b483] text-xs hover:bg-[#d4b483]/10 transition-colors cursor-pointer" onClick={exportTxt}>📄 TXT 저장</button>
                <button className="px-4 py-1.5 bg-transparent border border-[#d4b483]/30 rounded-lg text-[#d4b483] text-xs hover:bg-[#d4b483]/10 transition-colors cursor-pointer" onClick={exportPdf}>📑 PDF 저장</button>
                <button className="px-4 py-1.5 bg-transparent border border-[#d4b483]/30 rounded-lg text-[#d4b483] text-xs hover:bg-[#d4b483]/10 transition-colors cursor-pointer" onClick={()=>window.print()}>🖨️ 인쇄</button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
              <div className="bg-rose-500/5 border border-rose-500/25 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-rose-400 mb-1">{result.summary.duplicateCount}</div>
                <div className="text-xs text-[#7a7060]">중복 보장 항목</div>
              </div>
              <div className="bg-white/[0.03] border border-[#d4b483]/15 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-[#d9cfc0] mb-1">{result.summary.totalPolicies}</div>
                <div className="text-xs text-[#7a7060]">분석 보험 수</div>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-4 text-center">
                <div className="text-xl font-bold text-amber-400 mb-1">{result.summary.estimatedMonthlySavings}</div>
                <div className="text-xs text-[#7a7060]">절감 예상액</div>
              </div>
              <div className={`rounded-2xl p-4 text-center border ${riskCard(result.summary.riskLevel)}`}>
                <div className={`text-xl font-bold mb-1 ${riskVal(result.summary.riskLevel)}`}>{result.summary.riskLevel}</div>
                <div className="text-xs text-[#7a7060]">중복 위험도</div>
              </div>
            </div>

            {/* AI Summary */}
            <div className="bg-white/[0.03] border border-[#d4b483]/15 rounded-2xl p-5 mb-5">
              <div className="text-xs font-medium text-[#d4b483] tracking-widest mb-3">⬡ AI 분석 요약</div>
              <p className="text-sm text-[#a09080] leading-7">{result.aiSummary}</p>
            </div>

            {/* Duplicates Table */}
            <div className="text-xs font-medium text-[#7a7060] tracking-widest uppercase mb-3">중복 보장 상세 목록</div>
            <div className="overflow-x-auto mb-5">
              <table className="w-full border-collapse text-sm min-w-[600px]">
                <thead>
                  <tr>
                    {['중복 항목','해당 보험','보장 내용 비교','중복 유형','절감 예상','심각도'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs text-[#7a7060] font-normal border-b border-[#d4b483]/10 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.duplicates.length === 0
                    ? <tr><td colSpan={6} className="text-center text-[#7a7060] py-6">중복 보장 항목이 발견되지 않았습니다</td></tr>
                    : result.duplicates.map((d,i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2.5 border-b border-[#d4b483]/[0.06] align-top">
                          <strong className="block text-[#f0ebe0] font-medium text-sm mb-0.5">{d.item}</strong>
                          <span className="text-xs text-[#7a7060]">{d.action}</span>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#d4b483]/[0.06] text-xs text-[#7a7060] align-top">{d.policies}</td>
                        <td className="px-3 py-2.5 border-b border-[#d4b483]/[0.06] text-xs align-top">
                          <div className="text-[#d4b483] mb-0.5">A: {d.coverageA}</div>
                          <div className="text-[#a09080]">B: {d.coverageB}</div>
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#d4b483]/[0.06] text-xs text-[#a09080] align-top">{d.type}</td>
                        <td className="px-3 py-2.5 border-b border-[#d4b483]/[0.06] text-xs text-amber-400 align-top">{d.monthlySavings}</td>
                        <td className="px-3 py-2.5 border-b border-[#d4b483]/[0.06] align-top">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${sevBadge(d.severity)}`}>{d.severity}</span>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            {/* Recommendation */}
            <div className="text-xs font-medium text-[#7a7060] tracking-widest uppercase mb-3">AI 권고사항</div>
            <div className="bg-[#d4b483]/[0.04] border border-[#d4b483]/20 border-l-[3px] border-l-[#d4b483] rounded-xl px-5 py-4 text-sm text-[#a09080] leading-7 mb-3">
              {result.recommendation}
            </div>
            <div className="text-xs text-[#554e42] bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3">
              {result.disclaimer}
            </div>
          </div>
        )}

        {/* Warning Modal */}
        {showEmptyWarning && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="bg-[#302e2c] border border-[#d4b483]/25 rounded-2xl p-7 max-w-sm w-full shadow-2xl">
              <div className="text-base font-medium text-[#f0ebe0] mb-4">⚠️ 입력되지 않은 항목이 있습니다</div>
              <div className="text-sm text-[#a09080] leading-7 mb-5">
                <p>다음 항목이 비어있습니다:</p>
                <ul className="mt-2 mb-3 ml-4 list-disc text-amber-400">
                  {emptyFields.map(f => <li key={f} className="mb-0.5">{FIELD_LABELS[f as keyof UserInfo]}</li>)}
                </ul>
                <p>기본 정보 없이 계속 진행하시겠습니까?</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  className="px-4 py-2 bg-transparent border border-white/15 rounded-xl text-[#a09080] text-sm hover:border-[#d4b483]/40 hover:text-[#d4b483] transition-colors cursor-pointer"
                  onClick={handleWarningCancel}>취소 (입력하러 가기)</button>
                <button
                  className="px-4 py-2 bg-gradient-to-r from-[#7a5c2e] to-[#c4974a] rounded-xl text-[#f0ebe0] text-sm hover:brightness-110 transition-all cursor-pointer"
                  onClick={handleWarningProceed}>계속 진행</button>
              </div>
            </div>
          </div>
        )}

        <footer className="text-center mt-16 text-xs text-[#4a4438] leading-7">
          <p>insure.dbzone.kr &nbsp;·&nbsp; AI 기반 보험 중복 분석 서비스</p>
          <p>본 서비스는 참고용이며, 실제 보험 변경 전 전문가 상담을 권장합니다.</p>
        </footer>

      </div>
    </main>
  )
}
