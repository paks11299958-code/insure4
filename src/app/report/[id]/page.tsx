'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const severityStyle = (s: string) => {
  if (s === '높음') return 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
  if (s === '중간') return 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
  return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
}

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
  const [modalItem, setModalItem] = useState<Duplicate | null>(null)

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
            <button onClick={() => window.print()}
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
                    <th className="text-left py-2 px-3 text-[#d4b483] font-medium">심각도</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicates.map((d, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#d4b483]/08 cursor-pointer hover:bg-white/[0.03] transition-colors"
                      onClick={() => setModalItem(d)}
                    >
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
                      <td className="py-2.5 px-3">
                        <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-md ${severityStyle(d.severity)}`}>
                          {d.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 절감 금액 차트 */}
        {duplicates.some(d => d.monthlySavings && d.monthlySavings !== '-') && (() => {
          const parseAmount = (s: string) => {
            const m = s.match(/[\d.]+/)
            return m ? parseFloat(m[0]) : 0
          }
          const chartData = duplicates
            .map(d => ({ label: d.item, value: parseAmount(d.monthlySavings), raw: d.monthlySavings }))
            .filter(d => d.value > 0)
          const maxVal = Math.max(...chartData.map(d => d.value), 1)
          return chartData.length > 0 ? (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-[#d4b483] mb-3 pb-2 border-b border-[#d4b483]/15">보험별 절감 예상액</h2>
              <div className="bg-white/[0.03] border border-[#d4b483]/15 rounded-xl p-4 space-y-3">
                {chartData.map((d, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#c4b49a] truncate max-w-[60%]">{d.label}</span>
                      <span className="text-amber-400 font-medium">{d.raw}</span>
                    </div>
                    <div className="print-bar-bg w-full bg-white/[0.05] rounded-full h-2">
                      <div
                        className="print-bar-fill bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(d.value / maxVal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        })()}

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

      {/* 중복 항목 상세 모달 */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setModalItem(null)}
        >
          <div
            className="w-full max-w-md bg-[#1e1c1a] border border-[#d4b483]/25 rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-[#f0ebe0]">{modalItem.item}</h3>
                <p className="text-xs text-[#7a7060] mt-0.5">{modalItem.type}</p>
              </div>
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg ${severityStyle(modalItem.severity)}`}>
                {modalItem.severity}
              </span>
            </div>

            {/* 보험사 비교 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <div className="text-[10px] text-blue-400 font-medium mb-1">보험 A</div>
                <div className="text-xs text-[#c4b49a] leading-relaxed">{modalItem.coverageA}</div>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                <div className="text-[10px] text-orange-400 font-medium mb-1">보험 B</div>
                <div className="text-xs text-[#c4b49a] leading-relaxed">{modalItem.coverageB}</div>
              </div>
            </div>

            {/* 해당 보험 + 절약 */}
            <div className="flex items-center justify-between bg-white/[0.03] border border-[#d4b483]/15 rounded-xl px-4 py-3 mb-4">
              <div>
                <div className="text-[10px] text-[#7a7060]">해당 보험</div>
                <div className="text-sm text-[#c4b49a]">{modalItem.policies}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#7a7060]">월 절약 가능</div>
                <div className="text-sm font-semibold text-amber-400">{modalItem.monthlySavings}</div>
              </div>
            </div>

            {/* 권고 조치 */}
            <div className="bg-[#d4b483]/[0.06] border border-[#d4b483]/20 rounded-xl px-4 py-3 mb-5">
              <div className="text-[10px] text-[#d4b483] font-medium mb-1">권고 조치</div>
              <p className="text-xs text-[#c4b49a] leading-relaxed">{modalItem.action}</p>
            </div>

            <button
              onClick={() => setModalItem(null)}
              className="w-full py-2.5 border border-[#d4b483]/30 rounded-xl text-[#d4b483] text-sm hover:bg-[#d4b483]/10 transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
