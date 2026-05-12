'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setStatus('loading')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setStatus('idle'); return }
      setStatus('done')
    } catch {
      setError('오류가 발생했습니다.')
      setStatus('idle')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#F9FAFB' }}>

      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex flex-col items-center gap-3">
            <Image src="/logo2.png" alt="로고" width={56} height={56} style={{ borderRadius: 14 }} />
            <div className="text-center">
              <h1 className="text-2xl font-black mb-0.5" style={{ color: '#111827', letterSpacing: '-0.04em' }}>비밀번호 찾기</h1>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>가입한 이메일로 재설정 링크를 보내드립니다</p>
            </div>
          </Link>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl p-7"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {status === 'done' ? (
            <div className="text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: '#F3F4F6' }}>📬</div>
              <div>
                <p className="font-bold mb-1" style={{ color: '#111827' }}>이메일이 발송되었습니다</p>
                <p className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>
                  <span style={{ color: '#374151', fontWeight: 600 }}>{email}</span> 로<br />
                  비밀번호 재설정 링크를 보내드렸습니다.<br />
                  링크는 30분간 유효합니다.
                </p>
              </div>
              <Link href="/login"
                className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: '#6B7280' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#111827'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#6B7280'}>
                <ArrowLeft size={14} /> 로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: '#374151' }}>이메일</label>
                <input
                  type="email"
                  placeholder="가입한 이메일 입력"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111827] text-sm placeholder:text-[#9CA3AF] outline-none focus:border-[#111827] transition-all bg-white"
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
                disabled={status === 'loading'}
                className="w-full py-3.5 rounded-xl font-extrabold text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#111827', color: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
                onMouseEnter={e => { if (status !== 'loading') (e.currentTarget as HTMLElement).style.background = '#1F2937' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#111827' }}>
                {status === 'loading' ? '발송 중...' : '재설정 링크 보내기'}
              </button>

              <Link href="/login"
                className="text-center text-xs transition-colors"
                style={{ color: '#9CA3AF' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#374151'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#9CA3AF'}>
                로그인으로 돌아가기
              </Link>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#D1D5DB' }}>
          © 2025 AI Insurance Analytics
        </p>
      </div>
    </main>
  )
}
