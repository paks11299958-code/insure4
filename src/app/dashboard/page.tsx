'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

const riskStyle = (level: string) => {
  if (level === '높음') return {
    badge: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
    dot: 'bg-rose-400',
    glow: 'shadow-rose-500/10',
    border: 'hover:border-rose-500/30',
  }
  if (level === '중간') return {
    badge: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
    dot: 'bg-amber-400',
    glow: 'shadow-amber-500/10',
    border: 'hover:border-amber-500/30',
  }
  return {
    badge: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
    dot: 'bg-emerald-400',
    glow: 'shadow-emerald-500/10',
    border: 'hover:border-emerald-500/30',
  }
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const truncateFiles = (names: string) => {
  const list = names.split(',').map(s => s.trim())
  if (list.length <= 2) return names
  return `${list[0]}, ${list[1]} 외 ${list.length - 2}개`
}

export default function DashboardPage() {
  const router = useRouter()
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Analysis | null>(null)
  const [search, setSearch] = useState('')

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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#2c2a29] flex items-center justify-center">
        <div className="text-[#7a7060] text-sm">불러오는 중...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#2c2a29] px-4 py-6">
      <div className="max-w-4xl mx-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#f0ebe0]">분석 내역</h1>
            <p className="text-xs text-[#7a7060] mt-0.5">{authUser?.username || authUser?.email}님의 보험 분석 기록</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-[#d4b483] hover:underline">홈으로</Link>
            <button onClick={handleLogout} className="text-xs text-[#7a7060] hover:text-[#c4b49a] transition-colors cursor-pointer">로그아웃</button>
          </div>
        </div>

        {/* 검색창 */}
        {analyses.length > 0 && (
          <div className="relative mb-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="제목으로 검색..."
              className="w-full bg-white/[0.04] border border-[#d4b483]/20 rounded-xl px-4 py-2.5 text-sm text-[#c4b49a] placeholder:text-[#6a6050] outline-none focus:border-[#d4b483]/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a6050] hover:text-[#c4b49a] text-lg leading-none cursor-pointer">×</button>
            )}
          </div>
        )}

        {/* 목록 */}
        {analyses.length === 0 ? (
          <div className="bg-white/[0.03] border border-[#d4b483]/15 rounded-2xl p-12 text-center">
            <p className="text-[#7a7060] text-sm mb-3">저장된 분석 내역이 없습니다.</p>
            <Link href="/" className="text-xs text-[#d4b483] hover:underline">분석 시작하기</Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/[0.03] border border-[#d4b483]/15 rounded-2xl p-10 text-center">
            <p className="text-[#7a7060] text-sm">"{search}" 검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(a => {
              const summary = a.result?.summary
              const rs = summary ? riskStyle(summary.riskLevel) : null

              return (
                <div
                  key={a.id}
                  className={`bg-[#1e1c1a] border border-[#d4b483]/15 ${rs?.border ?? 'hover:border-[#d4b483]/35'} rounded-2xl overflow-hidden transition-all duration-200 shadow-lg ${rs?.glow ?? ''} hover:shadow-[#d4b483]/10 hover:-translate-y-px`}
                  style={{ boxShadow: '0 0 0 1px rgba(212,180,131,0.08), 0 4px 20px rgba(0,0,0,0.3)' }}
                >
                  {/* 메인 카드 */}
                  <div className="flex items-stretch gap-0">

                    {/* 왼쪽: 위험도 */}
                    <div className="flex flex-col items-center justify-center px-5 py-5 border-r border-[#d4b483]/10 min-w-[90px]">
                      {summary && rs ? (
                        <>
                          <div className={`w-3 h-3 rounded-full ${rs.dot} mb-2 animate-pulse`} />
                          <div className={`text-[10px] font-bold border rounded-lg px-2.5 py-1.5 text-center leading-tight ${rs.badge}`}>
                            위험도<br />{summary.riskLevel}
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-[#5a5040]">-</div>
                      )}
                    </div>

                    {/* 중앙: 세부 정보 + 지표 */}
                    <div className="flex-1 py-4 px-4 min-w-0">
                      {/* 제목 + 날짜 */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold text-[#f0ebe0] truncate">{a.title || '제목 없음'}</span>
                        <span className="text-[10px] text-[#5a5040] shrink-0">{formatDate(a.createdAt)}</span>
                      </div>
                      {/* 고객 정보 */}
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-3">
                        {a.gender && <span className="text-[11px] text-[#7a7060]">{a.gender}</span>}
                        {a.age && <span className="text-[11px] text-[#7a7060]">{a.age}</span>}
                        {a.job && <span className="text-[11px] text-[#7a7060]">{a.job}</span>}
                        {a.fileNames && (
                          <span className="text-[11px] text-[#5a5040]">📎 {truncateFiles(a.fileNames)}</span>
                        )}
                      </div>

                      {/* 핵심 지표 3개 */}
                      {summary && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white/[0.03] border border-[#d4b483]/10 rounded-xl py-2.5 px-3 text-center">
                            <div className="text-xl font-bold text-emerald-400 leading-tight">{summary.estimatedMonthlySavings}</div>
                            <div className="text-[10px] text-[#5a5040] mt-0.5">월 절약 예상</div>
                          </div>
                          <div className="bg-white/[0.03] border border-[#d4b483]/10 rounded-xl py-2.5 px-3 text-center">
                            <div className="text-xl font-bold text-rose-400 leading-tight">{summary.duplicateCount}</div>
                            <div className="text-[10px] text-[#5a5040] mt-0.5">중복 항목</div>
                          </div>
                          <div className="bg-white/[0.03] border border-[#d4b483]/10 rounded-xl py-2.5 px-3 text-center">
                            <div className="text-xl font-bold text-[#f0ebe0] leading-tight">{summary.totalPolicies}</div>
                            <div className="text-[10px] text-[#5a5040] mt-0.5">총 보험 수</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 오른쪽: 액션 */}
                    <div className="flex flex-col items-center justify-center gap-2 px-4 border-l border-[#d4b483]/10 shrink-0">
                      <Link
                        href={`/report/${a.id}`}
                        target="_blank"
                        className="text-xs text-[#d4b483] border border-[#d4b483]/40 rounded-xl px-3 py-2 hover:bg-[#d4b483]/10 transition-colors text-center whitespace-nowrap font-medium"
                      >
                        결과 보기
                      </Link>
                      <button
                        onClick={() => setSelected(selected?.id === a.id ? null : a)}
                        className="text-xs text-[#8a7a60] border border-[#8a7a60]/40 rounded-xl px-3 py-2 hover:bg-[#8a7a60]/10 hover:text-[#c4b49a] hover:border-[#c4b49a]/40 transition-colors text-center whitespace-nowrap font-medium cursor-pointer"
                      >
                        {selected?.id === a.id ? '접기 ▲' : 'AI 요약 ▼'}
                      </button>
                    </div>
                  </div>

                  {/* 펼쳐진 AI 요약 */}
                  {selected?.id === a.id && a.result && (
                    <div className="border-t border-[#d4b483]/10 px-5 py-4 bg-white/[0.02]">
                      {a.result.aiSummary && (
                        <div className="mb-3">
                          <div className="text-[11px] text-[#d4b483] font-bold mb-1.5">AI 요약</div>
                          <p className="text-xs text-[#c4b49a] leading-relaxed whitespace-pre-wrap">{a.result.aiSummary}</p>
                        </div>
                      )}
                      {a.result.recommendation && (
                        <div>
                          <div className="text-[11px] text-[#d4b483] font-bold mb-1.5">추천</div>
                          <p className="text-xs text-[#c4b49a] leading-relaxed whitespace-pre-wrap">{a.result.recommendation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs text-[#7a7060] mt-6">
          {search ? `${filtered.length}개 검색됨 (전체 ${analyses.length}개)` : `최근 ${analyses.length}개 내역 표시 (최대 100개)`}
        </p>
      </div>
    </main>
  )
}
