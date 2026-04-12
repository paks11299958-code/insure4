'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Duplicate {
  item: string; policies: string; coverageA: string; coverageB: string
  type: string; monthlySavings: string; severity: string; action: string
}
interface AnalysisResult {
  summary?: { totalPolicies: number; duplicateCount: number; estimatedMonthlySavings: string; riskLevel: string }
  duplicates?: Duplicate[]
  aiSummary?: string
  recommendation?: string
  disclaimer?: string
}
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
  result: AnalysisResult | null
  createdAt: string
}

const riskColor = (level: string) => {
  if (level === '높음') return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' }
  if (level === '중간') return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' }
  return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function ReportPage() {
  const { id } = useParams()
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/report/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setAnalysis(data)
      })
      .catch(() => setError('불러오기 실패'))
      .finally(() => setLoading(false))
  }, [id])

  const exportTxt = () => {
    if (!analysis) return
    const result = analysis.result
    const summary = result?.summary
    const duplicates = result?.duplicates || []
    const rows = duplicates.map(d => `${d.item}\t${d.policies}\t${d.type}\t${d.monthlySavings}\t${d.severity}`).join('\n')
    const txt = [
      '보험 중복 보장 분석 보고서',
      '='.repeat(44),
      `제목: ${analysis.title || ''}`,
      `분석 일시: ${formatDate(analysis.createdAt)}`,
      `파일: ${analysis.fileNames || ''}`,
      '',
      '[고객 정보]',
      `• 성별: ${analysis.gender || ''}  연령: ${analysis.age || ''}  직업: ${analysis.job || ''}`,
      `• 건강상태: ${analysis.health || ''}  예산: ${analysis.budget || ''}  목적: ${analysis.purpose || ''}`,
      '',
      '[요약]',
      `• 분석 보험: ${summary?.totalPolicies ?? ''}개`,
      `• 중복 항목: ${summary?.duplicateCount ?? ''}개`,
      `• 절감 예상: ${summary?.estimatedMonthlySavings ?? ''}`,
      `• 위험도: ${summary?.riskLevel ?? ''}`,
      '',
      '[AI 요약]',
      result?.aiSummary || '',
      '',
      '[중복 상세]',
      '항목\t보험\t유형\t절감\t심각도',
      rows,
      '',
      '[권고사항]',
      result?.recommendation || '',
      '',
      '[안내]',
      result?.disclaimer || '',
    ].join('\n')

    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }))
    a.download = `${analysis.title || '보험중복분석'}_${new Date().toLocaleDateString('ko-KR').replace(/\.\s*/g, '-').replace(/-$/, '')}.txt`
    a.click()
  }

  const exportPdf = () => {
    if (!analysis) return
    const result = analysis.result
    const summary = result?.summary
    const duplicates = result?.duplicates || []
    const date = formatDate(analysis.createdAt)
    const sevClass = (s: string) => s === '높음' ? 'badge-high' : s === '중간' ? 'badge-mid' : 'badge-low'
    const dupRows = duplicates.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:#888;padding:8mm 0">중복 보장 항목이 발견되지 않았습니다</td></tr>`
      : duplicates.map(d => `
        <tr>
          <td><strong>${d.item}</strong><br/><span style="color:#888;font-size:8pt">${d.action}</span></td>
          <td>${d.policies}</td>
          <td><span class="cov-a">A: ${d.coverageA}</span><br/><span class="cov-b">B: ${d.coverageB}</span></td>
          <td>${d.type}</td>
          <td style="color:#92400e;font-weight:500">${d.monthlySavings}</td>
          <td><span class="badge ${sevClass(d.severity)}">${d.severity}</span></td>
        </tr>`).join('')

    const infoRows = [
      analysis.gender ? `<span>성별: <strong>${analysis.gender}</strong></span>` : '',
      analysis.age ? `<span>연령: <strong>${analysis.age}</strong></span>` : '',
      analysis.job ? `<span>직업: <strong>${analysis.job}</strong></span>` : '',
      analysis.health ? `<span>건강: <strong>${analysis.health}</strong></span>` : '',
      analysis.budget ? `<span>예산: <strong>${analysis.budget}</strong></span>` : '',
      analysis.purpose ? `<span>목적: <strong>${analysis.purpose}</strong></span>` : '',
    ].filter(Boolean).join(' &nbsp;|&nbsp; ')

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${analysis.title || '보험 중복 분석 보고서'}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Noto Sans KR',sans-serif;background:#fff;color:#1a1a1a;padding:18mm 20mm;font-size:10.5pt;line-height:1.6}
  .title-row{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #c4974a;padding-bottom:3mm;margin-bottom:4mm}
  .title-row h1{font-size:17pt;font-weight:700;color:#1a1a1a}
  .title-row .meta{font-size:8.5pt;color:#888;text-align:right;line-height:1.8}
  .info-row{font-size:9pt;color:#555;margin-bottom:5mm;padding:2.5mm 4mm;background:#fdf8f0;border-radius:5px;border:1px solid #e8d8b0}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-bottom:6mm}
  .card{border:1px solid #e0d8c8;border-radius:6px;padding:3.5mm 4mm;text-align:center}
  .card .val{font-size:16pt;font-weight:700;color:#1a1a1a}
  .card .val.red{color:#b91c1c}.card .val.amber{color:#92400e}.card .val.risk-high{color:#b91c1c}.card .val.risk-mid{color:#92400e}.card .val.risk-low{color:#166534}
  .card .lbl{font-size:8pt;color:#888;margin-top:1mm}
  .section-title{font-size:9pt;font-weight:600;color:#7a5c2e;letter-spacing:0.08em;margin-bottom:2.5mm;margin-top:5mm}
  .ai-box{background:#fdf8f0;border:1px solid #e8d8b0;border-left:3px solid #c4974a;border-radius:6px;padding:4mm 5mm;font-size:9.5pt;line-height:1.8;color:#444;margin-bottom:5mm;white-space:pre-wrap}
  table{width:100%;border-collapse:collapse;margin-bottom:5mm;font-size:8.5pt}
  th{background:#f5f2ec;border:1px solid #e0d8c8;padding:2mm 3mm;text-align:left;font-weight:600;color:#555;white-space:nowrap}
  td{border:1px solid #e0d8c8;padding:2.5mm 3mm;vertical-align:top;color:#333}
  tr:nth-child(even) td{background:#fafaf8}
  .badge{display:inline-block;padding:0.5mm 2.5mm;border-radius:3px;font-size:8pt;font-weight:500}
  .badge-high{background:#fee2e2;color:#991b1b}.badge-mid{background:#fef3c7;color:#92400e}.badge-low{background:#d1fae5;color:#065f46}
  .cov-a{color:#7a5c2e;display:block}.cov-b{color:#666;display:block}
  .rec-box{background:#fdf8f0;border:1px solid #e8d8b0;border-left:3px solid #c4974a;border-radius:6px;padding:4mm 5mm;font-size:9.5pt;line-height:1.9;color:#444;margin-bottom:4mm;white-space:pre-wrap}
  .disc{font-size:8pt;color:#999;border:1px solid #eee;border-radius:5px;padding:3mm 4mm}
  @media print{body{padding:12mm 14mm}@page{margin:10mm}}
</style>
</head>
<body>
<div class="title-row">
  <h1>${analysis.title || '보험 중복 보장 분석 보고서'}</h1>
  <div class="meta">분석 일시: ${date}<br/>파일: ${analysis.fileNames || ''}</div>
</div>

${infoRows ? `<div class="info-row">${infoRows}</div>` : ''}

${summary ? `
<div class="cards">
  <div class="card"><div class="val red">${summary.duplicateCount}</div><div class="lbl">중복 보장 항목</div></div>
  <div class="card"><div class="val">${summary.totalPolicies}</div><div class="lbl">분석 보험 수</div></div>
  <div class="card"><div class="val amber">${summary.estimatedMonthlySavings}</div><div class="lbl">절감 예상액</div></div>
  <div class="card"><div class="val risk-${summary.riskLevel === '높음' ? 'high' : summary.riskLevel === '중간' ? 'mid' : 'low'}">${summary.riskLevel}</div><div class="lbl">중복 위험도</div></div>
</div>` : ''}

${result?.aiSummary ? `<div class="section-title">⬡ AI 분석 요약</div><div class="ai-box">${result.aiSummary}</div>` : ''}

<div class="section-title">중복 보장 상세 목록</div>
<table>
  <thead><tr><th>중복 항목</th><th>해당 보험</th><th>보장 내용 비교</th><th>중복 유형</th><th>절감 예상</th><th>심각도</th></tr></thead>
  <tbody>${dupRows}</tbody>
</table>

${result?.recommendation ? `<div class="section-title">AI 권고사항</div><div class="rec-box">${result.recommendation}</div>` : ''}
${result?.disclaimer ? `<div class="disc">${result.disclaimer}</div>` : ''}

<script>window.addEventListener('load', () => setTimeout(() => window.print(), 500))</script>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  if (loading) return (
    <main className="min-h-screen bg-[#2c2a29] flex items-center justify-center">
      <div className="text-[#7a7060] text-sm">불러오는 중...</div>
    </main>
  )

  if (error || !analysis) return (
    <main className="min-h-screen bg-[#2c2a29] flex items-center justify-center">
      <div className="text-center">
        <p className="text-rose-400 text-sm mb-3">{error || '분석 결과를 찾을 수 없습니다.'}</p>
        <Link href="/dashboard" className="text-xs text-[#d4b483] hover:underline">대시보드로</Link>
      </div>
    </main>
  )

  const result = analysis.result
  const summary = result?.summary
  const duplicates = result?.duplicates || []
  const risk = summary ? riskColor(summary.riskLevel) : null

  return (
    <main className="min-h-screen bg-[#2c2a29] text-[#c4b49a] px-4 py-8">
      <div className="max-w-3xl mx-auto">

        {/* 헤더 */}
        <div className="text-center mb-8 pb-6 border-b border-[#d4b483]/15">
          <h1 className="text-2xl font-medium text-[#f0ebe0] mb-2">{analysis.title || '보험 중복 분석 결과'}</h1>
          <p className="text-xs text-[#7a7060] mb-3">{formatDate(analysis.createdAt)}</p>
          {risk && summary && (
            <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full border ${risk.text} ${risk.bg} ${risk.border}`}>
              위험도 {summary.riskLevel}
            </span>
          )}
          {/* 버튼 */}
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={exportTxt}
              className="px-4 py-1.5 bg-transparent border border-[#d4b483]/30 rounded-lg text-[#d4b483] text-xs hover:bg-[#d4b483]/10 transition-colors cursor-pointer">
              📄 TXT 저장
            </button>
            <button onClick={exportPdf}
              className="px-4 py-1.5 bg-transparent border border-[#d4b483]/30 rounded-lg text-[#d4b483] text-xs hover:bg-[#d4b483]/10 transition-colors cursor-pointer">
              📑 PDF 저장
            </button>
            <button onClick={() => window.print()}
              className="px-4 py-1.5 bg-transparent border border-[#d4b483]/30 rounded-lg text-[#d4b483] text-xs hover:bg-[#d4b483]/10 transition-colors cursor-pointer">
              🖨️ 인쇄
            </button>
          </div>
        </div>

        {/* 고객 정보 */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: '성별', value: analysis.gender },
            { label: '연령', value: analysis.age },
            { label: '직업', value: analysis.job },
            { label: '건강상태', value: analysis.health },
            { label: '예산', value: analysis.budget },
            { label: '목적', value: analysis.purpose },
          ].filter(i => i.value).map(item => (
            <div key={item.label} className="bg-white/[0.03] border border-[#d4b483]/15 rounded-xl p-3">
              <div className="text-[10px] text-[#7a7060] mb-1">{item.label}</div>
              <div className="text-sm font-medium text-[#f0ebe0]">{item.value}</div>
            </div>
          ))}
        </div>

        {/* 요약 수치 */}
        {summary && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/[0.03] border border-[#d4b483]/15 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-[#f0ebe0]">{summary.totalPolicies}</div>
              <div className="text-[11px] text-[#6a6050] mt-1">총 보험 수</div>
            </div>
            <div className="bg-white/[0.03] border border-[#d4b483]/15 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-rose-400">{summary.duplicateCount}</div>
              <div className="text-[11px] text-[#6a6050] mt-1">중복 항목</div>
            </div>
            <div className="bg-white/[0.03] border border-[#d4b483]/15 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-emerald-400">{summary.estimatedMonthlySavings}</div>
              <div className="text-[11px] text-[#6a6050] mt-1">월 절약 예상</div>
            </div>
          </div>
        )}

        {/* 중복 보장 항목 */}
        {duplicates.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-[#d4b483] mb-3 pb-2 border-b border-[#d4b483]/15">중복 보장 항목</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#d4b483]/15">
                    <th className="text-left py-2 px-3 text-[#d4b483] font-medium">항목</th>
                    <th className="text-left py-2 px-3 text-[#d4b483] font-medium">보험사</th>
                    <th className="text-left py-2 px-3 text-[#d4b483] font-medium">보장금액</th>
                    <th className="text-left py-2 px-3 text-[#d4b483] font-medium">유형</th>
                    <th className="text-left py-2 px-3 text-[#d4b483] font-medium">절약가능</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicates.map((d, i) => (
                    <tr key={i} className="border-b border-[#d4b483]/08">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#f0ebe0]">{d.item}</div>
                        <div className="text-[10px] text-[#6a6050] mt-0.5">{d.action}</div>
                      </td>
                      <td className="py-2.5 px-3 text-[#c4b49a]">{d.policies}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-blue-400">A: {d.coverageA}</div>
                        <div className="text-orange-400">B: {d.coverageB}</div>
                      </td>
                      <td className="py-2.5 px-3 text-[#c4b49a]">{d.type}</td>
                      <td className="py-2.5 px-3 text-amber-400 font-medium">{d.monthlySavings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI 요약 */}
        {result?.aiSummary && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-[#d4b483] mb-3 pb-2 border-b border-[#d4b483]/15">AI 분석 요약</h2>
            <div className="bg-white/[0.03] border border-[#d4b483]/15 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {result.aiSummary}
            </div>
          </div>
        )}

        {/* 추천 */}
        {result?.recommendation && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-[#d4b483] mb-3 pb-2 border-b border-[#d4b483]/15">맞춤 추천</h2>
            <div className="bg-white/[0.03] border border-[#d4b483]/15 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {result.recommendation}
            </div>
          </div>
        )}

        {/* 첨부 파일 */}
        {analysis.fileNames && (
          <p className="text-[11px] text-[#5a5040] mb-4">📎 분석 파일: {analysis.fileNames}</p>
        )}

        {/* 면책 */}
        {result?.disclaimer && (
          <p className="text-[10px] text-[#4a4035] leading-relaxed mb-4">{result.disclaimer}</p>
        )}

        <div className="text-center pt-4 border-t border-[#d4b483]/10">
          <Link href="/dashboard" className="text-xs text-[#d4b483] hover:underline">← 분석 내역으로</Link>
        </div>
      </div>
    </main>
  )
}
