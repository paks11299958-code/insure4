'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputCls = 'w-full bg-white/[0.04] border border-[#d4b483]/20 rounded-xl px-4 py-3 text-[#c4b49a] text-sm placeholder:text-[#6a6050] outline-none focus:border-[#d4b483]/50 transition-colors'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/')
      router.refresh()
    } catch {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#2c2a29] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium text-[#f0ebe0] mb-1">로그인</h1>
          <p className="text-sm text-[#7a7060]">보험 중복 분석 서비스</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-[#d4b483]/20 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#d4b483] font-medium">이메일</label>
            <input type="email" className={inputCls} placeholder="example@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#d4b483] font-medium">비밀번호</label>
            <input type="password" className={inputCls} placeholder="비밀번호 입력"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#7a5c2e] to-[#c4974a] hover:brightness-110 disabled:opacity-50 rounded-xl text-[#f0ebe0] font-medium text-sm transition-all cursor-pointer">
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <p className="text-center text-xs text-[#7a7060]">
            계정이 없으신가요?{' '}
            <Link href="/register" className="text-[#d4b483] hover:underline">회원가입</Link>
          </p>
        </form>
      </div>
    </main>
  )
}
