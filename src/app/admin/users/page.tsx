'use client'
import { useEffect, useState } from 'react'
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface User {
  id: number
  email: string
  username: string | null
  role: string
  createdAt: string
  _count: { analyses: number }
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'asc' | 'desc'>('desc')
  const [searchInput, setSearchInput] = useState('')

  const fetchUsers = (q: string, s: 'asc' | 'desc') => {
    setLoading(true)
    fetch(`/api/admin/users?search=${encodeURIComponent(q)}&sort=${s}`)
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchUsers(search, sort) }, [search, sort])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const toggleSort = () => {
    setSort(s => s === 'desc' ? 'asc' : 'desc')
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#f0ebe0]">사용자 관리</h1>
        <p className="text-sm text-[#5a5040] mt-1">전체 가입자 목록을 조회하고 관리합니다</p>
      </div>

      {/* 검색 + 정렬 */}
      <div className="flex items-center gap-3 mb-6">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a5040]" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="이메일로 검색"
            className="w-full bg-[#1a1714] border border-[#d4b483]/15 rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#f0ebe0] placeholder:text-[#5a5040] outline-none focus:border-[#d4b483]/40 transition-colors"
          />
        </form>
        {searchInput && (
          <button onClick={() => { setSearchInput(''); setSearch('') }}
            className="text-xs text-[#5a5040] hover:text-rose-400 border border-[#d4b483]/15 rounded-xl px-3 py-2.5 transition-colors cursor-pointer">
            초기화
          </button>
        )}
        <button onClick={toggleSort}
          className="flex items-center gap-1.5 text-xs text-[#7a7060] hover:text-[#d4b483] border border-[#d4b483]/15 rounded-xl px-3 py-2.5 transition-colors cursor-pointer ml-auto">
          {sort === 'desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
          가입일 {sort === 'desc' ? '최신순' : '오래된순'}
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-[#1a1714] border border-[#d4b483]/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0">
          {/* 헤더 */}
          <div className="contents">
            {['이메일', '이름', '분석 수', '권한', '가입일'].map(h => (
              <div key={h} className="px-5 py-3.5 text-xs font-semibold text-[#5a5040] bg-[#111009] border-b border-[#d4b483]/10">
                {h}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="col-span-5 py-16 text-center text-[#5a5040] text-sm">
              불러오는 중...
            </div>
          ) : users.length === 0 ? (
            <div className="col-span-5 py-16 text-center text-[#5a5040] text-sm">
              {search ? `"${search}" 검색 결과가 없습니다` : '가입자가 없습니다'}
            </div>
          ) : (
            users.map((u, i) => (
              <div key={u.id} className="contents group">
                <div className={`px-5 py-4 text-sm text-[#d9cfc0] border-b border-[#d4b483]/[0.07] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''} flex items-center gap-2`}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c4974a] to-[#7a5c2e] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                    {u.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{u.email}</span>
                </div>
                <div className={`px-5 py-4 text-sm text-[#7a7060] border-b border-[#d4b483]/[0.07] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''} flex items-center`}>
                  {u.username || <span className="text-[#3a3530]">-</span>}
                </div>
                <div className={`px-5 py-4 text-sm text-[#7a7060] border-b border-[#d4b483]/[0.07] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''} flex items-center justify-center`}>
                  {u._count.analyses}
                </div>
                <div className={`px-5 py-4 border-b border-[#d4b483]/[0.07] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''} flex items-center`}>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                    u.role === 'ADMIN'
                      ? 'bg-[#d4b483]/15 text-[#d4b483] border border-[#d4b483]/30'
                      : 'bg-white/[0.05] text-[#5a5040] border border-white/[0.07]'
                  }`}>
                    {u.role}
                  </span>
                </div>
                <div className={`px-5 py-4 text-xs text-[#5a5040] border-b border-[#d4b483]/[0.07] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''} flex items-center`}>
                  {formatDate(u.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 푸터 */}
        {!loading && users.length > 0 && (
          <div className="px-5 py-3 text-xs text-[#5a5040] border-t border-[#d4b483]/10">
            총 {users.length}명
          </div>
        )}
      </div>
    </div>
  )
}
