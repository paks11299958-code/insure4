'use client'
import { useEffect, useState } from 'react'
import { Users, BarChart2, TrendingUp, FileText } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Area, AreaChart
} from 'recharts'

interface Stats {
  totalUsers: number
  totalAnalyses: number
  newUsersThisWeek: number
  signupChart: { date: string; count: number }[]
}

const formatDate = (d: string) => {
  const dt = new Date(d)
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const CARDS = stats ? [
    { label: '전체 가입자', value: stats.totalUsers.toLocaleString(), icon: <Users size={18} />, color: 'text-[#d4b483]', bg: 'bg-[#d4b483]/10', border: 'border-[#d4b483]/20' },
    { label: '전체 분석 수', value: stats.totalAnalyses.toLocaleString(), icon: <FileText size={18} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: '이번 주 신규', value: `+${stats.newUsersThisWeek}`, icon: <TrendingUp size={18} />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: '분석/유저 비율', value: stats.totalUsers > 0 ? (stats.totalAnalyses / stats.totalUsers).toFixed(1) + '회' : '-', icon: <BarChart2 size={18} />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  ] : []

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0ebe0]">대시보드</h1>
        <p className="text-sm text-[#5a5040] mt-1">서비스 전체 현황을 확인합니다</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#d4b483]/20 border-t-[#d4b483] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {CARDS.map(c => (
              <div key={c.label} className={`bg-[#1a1714] border ${c.border} rounded-2xl p-5`}>
                <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center ${c.color} mb-3`}>
                  {c.icon}
                </div>
                <div className={`text-2xl font-bold ${c.color} mb-1`}>{c.value}</div>
                <div className="text-xs text-[#5a5040]">{c.label}</div>
              </div>
            ))}
          </div>

          {/* 가입자 추이 차트 */}
          <div className="bg-[#1a1714] border border-[#d4b483]/10 rounded-2xl p-6">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-[#f0ebe0]">신규 가입자 추이</h2>
              <p className="text-xs text-[#5a5040] mt-0.5">최근 30일</p>
            </div>
            {stats && stats.signupChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={stats.signupChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4b483" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#d4b483" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2520" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fill: '#5a5040', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: '#5a5040', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1e1c1a', border: '1px solid #d4b48333', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: '#d4b483' }}
                    itemStyle={{ color: '#c4b49a' }}
                    labelFormatter={v => `날짜: ${v}`}
                    formatter={(v) => [`${v}명`, '신규 가입']}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#d4b483"
                    strokeWidth={2}
                    fill="url(#goldGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#d4b483' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-[#5a5040] text-sm">
                최근 30일 가입 데이터가 없습니다
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
