'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { LogOut, LogIn, UserPlus, Menu, X, ArrowLeft, Download, Printer } from 'lucide-react'
import Image from 'next/image'

const severityStyle = (s: string) => {
  if (s === '높음') return { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' }
  if (s === '중간') return { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' }
  return { color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' }
}
const riskStyle = (level: string) => {
  if (level === '높음') return { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' }
  if (level === '중간') return { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' }
  return { color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' }
}
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

interface Duplicate {
  item: string; policies: string; coverageA: string; coverageB: string
  type: string; monthlySavings: string; severity: string; action: string
}
interface AnalysisResult {
  summary?: { totalPolicies: number; duplicateCount: number; estimatedMonthlySavings: string; riskLevel: string }
  duplicates?: Duplicate[]; aiSummary?: string; recommendation?: string; disclaimer?: string
}
interface Analysis {
  id: number; title: string | null; gender: string | null; age: string | null
  job: string | null; health: string | null; purpose: string | null; budget: string | null
  fileNames: string | null; result: AnalysisResult | null; createdAt: string
}
interface AuthUser { id: number; email: string; username?: string }

const NAV_ITEMS = [
  { href: '/', label: '홈' },
  { href: '/analyze', label: 'AI 분석' },
  { href: '/dashboard', label: '분석 내역' },
]

export default function ReportPage() {
  const { id } = useParams()
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalItem, setModalItem] = useState<Duplicate | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(u => { if (u?.id) setAuthUser(u) }).catch(() => {})
  }, [])

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); setAuthUser(null) }

  useEffect(() => {
    fetch(`/api/report/${id}`)
      .then(r => r.json())
      .then(data => { if (data.error) { setError(data.error); return }; setAnalysis(data) })
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
      '보험 중복 보장 분석 보고서', '='.repeat(44),
      `제목: ${analysis.title || ''}`, `분석 일시: ${formatDate(analysis.createdAt)}`, `파일: ${analysis.fileNames || ''}`, '',
      '[고객 정보]',
      `• 성별: ${analysis.gender || ''}  연령: ${analysis.age || ''}  직업: ${analysis.job || ''}`,
      `• 건강상태: ${analysis.health || ''}  예산: ${analysis.budget || ''}  목적: ${analysis.purpose || ''}`, '',
      '[요약]', `• 분석 보험: ${summary?.totalPolicies ?? ''}개`, `• 중복 항목: ${summary?.duplicateCount ?? ''}개`,
      `• 절감 예상: ${summary?.estimatedMonthlySavings ?? ''}`, `• 위험도: ${summary?.riskLevel ?? ''}`, '',
      '[AI 요약]', result?.aiSummary || '', '', '[중복 상세]', '항목\t보험\t유형\t절감\t심각도', rows, '',
      '[권고사항]', result?.recommendation || '', '', '[안내]', result?.disclaimer || '',
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }))
    a.download = `${analysis.title || '보험중복분석'}_${new Date().toLocaleDateString('ko-KR').replace(/\.\s*/g, '-').replace(/-$/, '')}.txt`
    a.click()
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#F9FAFB' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#E5E7EB', borderTopColor: '#111827' }} />
        <span className="text-sm" style={{ color: '#9CA3AF' }}>불러오는 중...</span>
      </div>
    </main>
  )

  if (error || !analysis) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#F9FAFB' }}>
      <div className="text-center">
        <p className="text-sm mb-3" style={{ color: '#EF4444' }}>{error || '분석 결과를 찾을 수 없습니다.'}</p>
        <Link href="/dashboard" className="text-xs font-medium" style={{ color: '#374151' }}>← 대시보드로</Link>
      </div>
    </main>
  )

  const result = analysis.result
  const summary = result?.summary
  const duplicates = result?.duplicates || []
  const risk = summary ? riskStyle(summary.riskLevel) : null

  return (
    <main className="min-h-screen" style={{ background: '#F9FAFB', color: '#111827' }}>

      {/* GNB */}
      <nav className="print:hidden sticky top-0 z-50"
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
                style={{ color: '#6B7280' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#111827'; el.style.background = '#F3F4F6' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#6B7280'; el.style.background = 'transparent' }}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            {authUser ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: '#111827', color: 'white' }}>
                    {(authUser.username || authUser.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#374151' }}>{authUser.username || authUser.email}</span>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all"
                  style={{ border: '1px solid #E5E7EB', color: '#9CA3AF' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#374151'; el.style.borderColor = '#D1D5DB' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#9CA3AF'; el.style.borderColor = '#E5E7EB' }}>
                  <LogOut size={11} /> 로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2 rounded-xl text-[13px] font-medium transition-all"
                  style={{ color: '#6B7280' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#111827'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#6B7280'}>
                  <span className="flex items-center gap-1.5"><LogIn size={13} />로그인</span>
                </Link>
                <Link href="/register" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold transition-all"
                  style={{ background: '#111827', color: 'white' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1F2937'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#111827'}>
                  <UserPlus size={13} /> 무료 시작
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden cursor-pointer p-2 rounded-xl" style={{ border: '1px solid #E5E7EB', color: '#374151' }}
            onClick={() => setMobileMenuOpen(v => !v)}>
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t px-5 py-4 flex flex-col gap-1" style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}>
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                className="px-4 py-3 rounded-xl text-sm font-medium" style={{ color: '#374151' }}
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
      <div className="px-4 py-8">
        <div className="max-w-3xl mx-auto">

          {/* 리포트 헤더 */}
          <div className="rounded-2xl p-6 mb-6 text-center"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <h1 className="text-xl font-bold mb-1" style={{ color: '#111827' }}>{analysis.title || '보험 중복 분석 결과'}</h1>
            <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>{formatDate(analysis.createdAt)}</p>
            {risk && summary && (
              <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full border"
                style={{ color: risk.color, background: risk.bg, borderColor: risk.border }}>
                위험도 {summary.riskLevel}
              </span>
            )}
            <div className="flex justify-center gap-2 mt-4 print:hidden flex-wrap">
              {[
                { label: 'TXT 저장', icon: <Download size={12} />, fn: exportTxt },
                { label: 'PDF 저장', icon: <Printer size={12} />, fn: () => window.print() },
                { label: '인쇄', icon: <Printer size={12} />, fn: () => window.print() },
              ].map((b, i) => (
                <button key={i} onClick={b.fn}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all"
                  style={{ border: '1px solid #E5E7EB', color: '#374151', background: '#FFFFFF' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#F3F4F6'; el.style.borderColor = '#D1D5DB' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#FFFFFF'; el.style.borderColor = '#E5E7EB' }}>
                  {b.icon} {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* 고객 정보 */}
          {[analysis.gender, analysis.age, analysis.job, analysis.health, analysis.budget, analysis.purpose].some(Boolean) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
              {[
                { label: '성별', value: analysis.gender },
                { label: '연령', value: analysis.age },
                { label: '직업', value: analysis.job },
                { label: '건강상태', value: analysis.health },
                { label: '예산', value: analysis.budget },
                { label: '목적', value: analysis.purpose },
              ].filter(i => i.value).map(item => (
                <div key={item.label} className="rounded-xl p-3"
                  style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div className="text-[10px] mb-1" style={{ color: '#9CA3AF' }}>{item.label}</div>
                  <div className="text-sm font-medium" style={{ color: '#111827' }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* 요약 수치 */}
          {summary && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { value: summary.totalPolicies, label: '총 보험 수', color: '#111827' },
                { value: summary.duplicateCount, label: '중복 항목', color: '#EF4444' },
                { value: summary.estimatedMonthlySavings, label: '월 절약 예상', color: '#22C55E' },
              ].map((m, i) => (
                <div key={i} className="rounded-2xl p-4 text-center"
                  style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div className="text-2xl font-black mb-1" style={{ color: m.color, letterSpacing: '-0.02em' }}>{m.value}</div>
                  <div className="text-[11px]" style={{ color: '#9CA3AF' }}>{m.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* 중복 보장 항목 */}
          {duplicates.length > 0 && (
            <div className="mb-5">
              <h2 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>중복 보장 항목</h2>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#FFFFFF' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                        {['항목', '보험사', '보장금액', '유형', '절약가능', '심각도'].map(h => (
                          <th key={h} className="text-left py-3 px-3 font-semibold whitespace-nowrap" style={{ color: '#6B7280' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {duplicates.map((d, i) => {
                        const sv = severityStyle(d.severity)
                        return (
                          <tr key={i} className="cursor-pointer transition-colors"
                            style={{ borderBottom: '1px solid #F3F4F6' }}
                            onClick={() => setModalItem(d)}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                            <td className="py-3 px-3">
                              <div className="font-semibold" style={{ color: '#111827' }}>{d.item}</div>
                              <div className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>{d.action}</div>
                            </td>
                            <td className="py-3 px-3" style={{ color: '#6B7280' }}>{d.policies}</td>
                            <td className="py-3 px-3">
                              <div style={{ color: '#374151' }}>A: {d.coverageA}</div>
                              <div style={{ color: '#6B7280' }}>B: {d.coverageB}</div>
                            </td>
                            <td className="py-3 px-3" style={{ color: '#6B7280' }}>{d.type}</td>
                            <td className="py-3 px-3 font-semibold" style={{ color: '#F59E0B' }}>{d.monthlySavings}</td>
                            <td className="py-3 px-3">
                              <span className="inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full border"
                                style={{ color: sv.color, background: sv.bg, borderColor: sv.border }}>
                                {d.severity}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 절감 금액 차트 */}
          {duplicates.some(d => d.monthlySavings && d.monthlySavings !== '-') && (() => {
            const parseAmount = (s: string) => { const m = s.match(/[\d.]+/); return m ? parseFloat(m[0]) : 0 }
            const chartData = duplicates.map(d => ({ label: d.item, value: parseAmount(d.monthlySavings), raw: d.monthlySavings })).filter(d => d.value > 0)
            const maxVal = Math.max(...chartData.map(d => d.value), 1)
            return chartData.length > 0 ? (
              <div className="mb-5">
                <h2 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>보험별 절감 예상액</h2>
                <div className="rounded-2xl p-5 space-y-3" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  {chartData.map((d, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="truncate max-w-[60%]" style={{ color: '#374151' }}>{d.label}</span>
                        <span className="font-semibold" style={{ color: '#F59E0B' }}>{d.raw}</span>
                      </div>
                      <div className="w-full rounded-full h-2" style={{ background: '#F3F4F6' }}>
                        <div className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(d.value / maxVal) * 100}%`, background: '#111827' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          })()}

          {/* AI 요약 */}
          {result?.aiSummary && (
            <div className="mb-5">
              <h2 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>AI 분석 요약</h2>
              <div className="rounded-2xl p-5 text-sm leading-relaxed whitespace-pre-wrap"
                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#374151' }}>
                {result.aiSummary}
              </div>
            </div>
          )}

          {/* 추천 */}
          {result?.recommendation && (
            <div className="mb-5">
              <h2 className="text-sm font-bold mb-3" style={{ color: '#111827' }}>맞춤 추천</h2>
              <div className="rounded-2xl p-5 text-sm leading-relaxed whitespace-pre-wrap"
                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderLeft: '3px solid #111827', color: '#374151' }}>
                {result.recommendation}
              </div>
            </div>
          )}

          {analysis.fileNames && (
            <p className="text-[11px] mb-4" style={{ color: '#D1D5DB' }}>📎 분석 파일: {analysis.fileNames}</p>
          )}
          {result?.disclaimer && (
            <p className="text-[10px] leading-relaxed mb-4" style={{ color: '#D1D5DB' }}>{result.disclaimer}</p>
          )}

          <div className="text-center pt-5" style={{ borderTop: '1px solid #E5E7EB' }}>
            <Link href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{ color: '#6B7280' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#111827'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#6B7280'}>
              <ArrowLeft size={14} /> 분석 내역으로
            </Link>
          </div>
        </div>
      </div>

      {/* 중복 항목 상세 모달 */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setModalItem(null)}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold" style={{ color: '#111827' }}>{modalItem.item}</h3>
                <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{modalItem.type}</p>
              </div>
              {(() => {
                const sv = severityStyle(modalItem.severity)
                return (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                    style={{ color: sv.color, background: sv.bg, borderColor: sv.border }}>
                    {modalItem.severity}
                  </span>
                )
              })()}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-3" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <div className="text-[10px] font-semibold mb-1" style={{ color: '#6B7280' }}>보험 A</div>
                <div className="text-xs leading-relaxed" style={{ color: '#374151' }}>{modalItem.coverageA}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <div className="text-[10px] font-semibold mb-1" style={{ color: '#6B7280' }}>보험 B</div>
                <div className="text-xs leading-relaxed" style={{ color: '#374151' }}>{modalItem.coverageB}</div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-4"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div>
                <div className="text-[10px]" style={{ color: '#9CA3AF' }}>해당 보험</div>
                <div className="text-sm" style={{ color: '#374151' }}>{modalItem.policies}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px]" style={{ color: '#9CA3AF' }}>월 절약 가능</div>
                <div className="text-sm font-bold" style={{ color: '#F59E0B' }}>{modalItem.monthlySavings}</div>
              </div>
            </div>
            <div className="rounded-xl px-4 py-3 mb-5"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderLeft: '3px solid #111827' }}>
              <div className="text-[10px] font-semibold mb-1" style={{ color: '#374151' }}>권고 조치</div>
              <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>{modalItem.action}</p>
            </div>
            <button onClick={() => setModalItem(null)}
              className="w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all"
              style={{ border: '1px solid #E5E7EB', color: '#374151', background: '#FFFFFF' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#F9FAFB' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#FFFFFF' }}>
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
