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

const riskColor = (level: string) => {
  if (level === '높음') return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  if (level === '중간') return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
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
            <h1 className="text-xl font-medium text-[#f0ebe0]">분석 내역</h1>
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
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a6050] hover:text-[#c4b49a] text-lg leading-none cursor-pointer"
              >×</button>
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
              return (
                <button
                  key={a.id}
                  onClick={() => setSelected(selected?.id === a.id ? null : a)}
                  className="w-full text-left bg-white/[0.03] border border-[#d4b483]/15 hover:border-[#d4b483]/35 rounded-2xl p-4 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[#f0ebe0] truncate">
                          {a.title || '제목 없음'}
                        </span>
                        {summary?.riskLevel && (
                          <span className={`text-[10px] border rounded-full px-2 py-0.5 font-medium ${riskColor(summary.riskLevel)}`}>
                            위험도 {summary.riskLevel}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {a.gender && <span className="text-xs text-[#7a7060]">{a.gender}</span>}
                        {a.age && <span className="text-xs text-[#7a7060]">{a.age}</span>}
                        {a.job && <span className="text-xs text-[#7a7060]">{a.job}</span>}
                        {a.fileNames && <span className="text-xs text-[#6a6050]">📎 {a.fileNames}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {summary && (
                        <div className="text-xs text-[#d4b483] font-medium mb-0.5">
                          월 {summary.estimatedMonthlySavings} 절약 가능
                        </div>
                      )}
                      <div className="text-[11px] text-[#5a5040] mb-1.5">{formatDate(a.createdAt)}</div>
                      <Link
                        href={`/report/${a.id}`}
                        target="_blank"
                        onClick={e => e.stopPropagation()}
                        className="text-[11px] text-[#d4b483] border border-[#d4b483]/30 rounded-lg px-2.5 py-1 hover:bg-[#d4b483]/10 transition-colors inline-block"
                      >
                        결과 보기
                      </Link>
                    </div>
                  </div>

                  {summary && (
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#d4b483]/10">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-[#f0ebe0]">{summary.totalPolicies}</div>
                        <div className="text-[10px] text-[#6a6050]">총 보험 수</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-rose-400">{summary.duplicateCount}</div>
                        <div className="text-[10px] text-[#6a6050]">중복 항목</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-emerald-400">{summary.estimatedMonthlySavings}</div>
                        <div className="text-[10px] text-[#6a6050]">절약 예상</div>
                      </div>
                    </div>
                  )}

                  {/* 펼쳐진 상세 내용 */}
                  {selected?.id === a.id && a.result && (
                    <div className="mt-4 pt-4 border-t border-[#d4b483]/15 text-left" onClick={e => e.stopPropagation()}>
                      {a.result.aiSummary && (
                        <div className="mb-3">
                          <div className="text-xs text-[#d4b483] font-medium mb-1">AI 요약</div>
                          <p className="text-xs text-[#c4b49a] leading-relaxed whitespace-pre-wrap">{a.result.aiSummary}</p>
                        </div>
                      )}
                      {a.result.recommendation && (
                        <div>
                          <div className="text-xs text-[#d4b483] font-medium mb-1">추천</div>
                          <p className="text-xs text-[#c4b49a] leading-relaxed whitespace-pre-wrap">{a.result.recommendation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </button>
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
