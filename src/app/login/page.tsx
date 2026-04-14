'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      router.push(returnTo)
      router.refresh()
    } catch {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #3a2e1a 0%, #1e1a14 40%, #111009 100%)' }}>

      {/* 배경 격자 패턴 */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'linear-gradient(#d4b483 1px, transparent 1px), linear-gradient(90deg, #d4b483 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* 배경 빛 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#c4974a] opacity-10 blur-[80px] rounded-full pointer-events-none" />

      {/* 모서리 장식 */}
      <div className="absolute top-6 left-6 w-12 h-12 border-l-2 border-t-2 border-[#d4b483]/30 rounded-tl-lg" />
      <div className="absolute top-6 right-6 w-12 h-12 border-r-2 border-t-2 border-[#d4b483]/30 rounded-tr-lg" />
      <div className="absolute bottom-6 left-6 w-12 h-12 border-l-2 border-b-2 border-[#d4b483]/30 rounded-bl-lg" />
      <div className="absolute bottom-6 right-6 w-12 h-12 border-r-2 border-b-2 border-[#d4b483]/30 rounded-br-lg" />

      {/* 카드 */}
      <div className="relative w-full max-w-sm">

        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c4974a] to-[#7a5c2e] flex items-center justify-center mb-4 shadow-lg shadow-[#c4974a]/30">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#f0ebe0] mb-1 tracking-wide">로그인</h1>
          <p className="text-sm text-[#8a7a60]">보험 중복 분석 서비스</p>
        </div>

        {/* 폼 카드 */}
        <div className="relative rounded-2xl p-[1px]"
          style={{ background: 'linear-gradient(135deg, #d4b48344, #5a440822, #d4b48322)' }}>
          <form onSubmit={handleSubmit}
            className="rounded-2xl p-7 flex flex-col gap-5"
            style={{ background: 'linear-gradient(160deg, #1e1a14ee, #111009ee)' }}>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-[#e8c97a] font-bold tracking-wide">이메일</label>
              <input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white/[0.05] border border-[#d4b483]/30 rounded-xl px-4 py-3 text-[#f0ebe0] text-sm placeholder:text-[#5a4e38] outline-none focus:border-[#d4b483]/70 focus:bg-[#d4b483]/[0.06] transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-[#e8c97a] font-bold tracking-wide">비밀번호</label>
              <input
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-white/[0.05] border border-[#d4b483]/30 rounded-xl px-4 py-3 text-[#f0ebe0] text-sm placeholder:text-[#5a4e38] outline-none focus:border-[#d4b483]/70 focus:bg-[#d4b483]/[0.06] transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* 로그인 버튼 */}
            <div className="relative group mt-1">
              <div className="absolute inset-0 rounded-xl bg-[#c4974a] opacity-20 group-hover:opacity-40 blur-[8px] transition-all duration-300 pointer-events-none" />
              <button
                type="submit"
                disabled={loading}
                className="relative w-full py-3.5 bg-gradient-to-b from-[#f5d060] via-[#e8b840] to-[#c4892a] hover:from-[#fde878] hover:via-[#f0c840] hover:to-[#d49a30] hover:scale-[1.01] hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 rounded-xl border border-[#f5d060]/50 text-[#1e1408] font-extrabold text-sm tracking-wide transition-all duration-200 cursor-pointer shadow-md shadow-[#c4892a]/30"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </div>

            <div className="flex flex-col gap-2 items-center">
              <Link href="/forgot-password" className="text-xs text-[#7a7060] hover:text-[#d4b483] transition-colors">
                비밀번호를 잊으셨나요?
              </Link>
              <p className="text-xs text-[#6a5e48]">
                계정이 없으신가요?{' '}
                <Link href="/register" className="text-[#d4b483] hover:text-[#f5d060] hover:underline transition-colors font-medium">
                  회원가입
                </Link>
              </p>
            </div>
          </form>
        </div>

      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#111009] flex items-center justify-center text-[#7a7060] text-sm">불러오는 중...</div>}>
      <LoginForm />
    </Suspense>
  )
}
