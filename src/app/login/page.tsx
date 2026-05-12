'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

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

  const inputCls = 'w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm placeholder:text-[#9CA3AF] outline-none focus:border-[#111827] transition-all bg-white'

  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#F9FAFB' }}>

      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex flex-col items-center gap-3">
            <Image src="/logo2.png" alt="로고" width={56} height={56} style={{ borderRadius: 14 }} />
            <div className="text-center">
              <h1 className="text-2xl font-black mb-0.5" style={{ color: '#111827', letterSpacing: '-0.04em' }}>로그인</h1>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>AI 보험 중복 분석 서비스</p>
            </div>
          </Link>
        </div>

        {/* 폼 카드 */}
        <div className="rounded-2xl p-7 flex flex-col gap-5"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: '#374151' }}>이메일</label>
              <input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: '#374151' }}>비밀번호</label>
              <input
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className={inputCls}
              />
            </div>

            {error && (
              <p className="text-xs rounded-xl px-3 py-2.5"
                style={{ color: '#EF4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-extrabold text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#111827', color: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#1F2937' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#111827' }}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="flex flex-col gap-2 items-center pt-1">
            <Link href="/forgot-password" className="text-xs transition-colors"
              style={{ color: '#9CA3AF' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#374151'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#9CA3AF'}>
              비밀번호를 잊으셨나요?
            </Link>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              계정이 없으신가요?{' '}
              <Link href="/register" className="font-semibold transition-colors"
                style={{ color: '#111827' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.textDecoration = 'underline'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.textDecoration = 'none'}>
                회원가입
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#D1D5DB' }}>
          © 2025 AI Insurance Analytics
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F9FAFB' }}>
        <span className="text-sm" style={{ color: '#9CA3AF' }}>불러오는 중...</span>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
