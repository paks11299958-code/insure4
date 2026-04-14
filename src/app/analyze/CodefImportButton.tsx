'use client'
import { useState } from 'react'
import { Download, X, Loader2, ShieldCheck, AlertCircle } from 'lucide-react'

interface Props {
  onImported: (file: File) => void
}

type Step = 'idle' | 'modal' | 'loading' | 'success' | 'error'

export default function CodefImportButton({ onImported }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [ssn, setSsn] = useState({ front: '', back: '' })   // 주민번호 앞/뒤
  const [errorMsg, setErrorMsg] = useState('')

  const reset = () => {
    setStep('idle')
    setSsn({ front: '', back: '' })
    setErrorMsg('')
  }

  const handleImport = async () => {
    if (!ssn.front || !ssn.back) {
      setErrorMsg('주민등록번호를 입력해 주세요.')
      return
    }
    if (ssn.front.length !== 6 || ssn.back.length !== 7) {
      setErrorMsg('주민등록번호 형식이 올바르지 않습니다.')
      return
    }

    setStep('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/codef/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssnFront: ssn.front, ssnBack: ssn.back }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '가져오기에 실패했습니다.')
      }

      // 서버에서 PDF Blob 반환
      const blob = await res.blob()
      const file = new File([blob], '내보험_조회결과.pdf', { type: 'application/pdf' })
      onImported(file)
      setStep('success')
      setTimeout(() => setStep('idle'), 2500)
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : '오류가 발생했습니다.')
      setStep('error')
    }
  }

  return (
    <>
      {/* ── 버튼 ── */}
      <div className="flex items-center gap-4 my-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(75,127,212,0.15)' }} />
        <button
          type="button"
          disabled
          title="준비 중입니다"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold whitespace-nowrap opacity-35 cursor-not-allowed"
          style={{
            borderColor: 'rgba(75,127,212,0.4)',
            color: '#6B9FFF',
            background: 'rgba(75,127,212,0.07)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(75,127,212,0.15)'
            el.style.borderColor = '#306FFF'
            el.style.boxShadow = '0 0 20px rgba(48,111,255,0.2)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(75,127,212,0.07)'
            el.style.borderColor = 'rgba(75,127,212,0.4)'
            el.style.boxShadow = 'none'
          }}
        >
          <Download size={15} />
          내보험 가져오기
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
            CODEF
          </span>
        </button>
        <div className="flex-1 h-px" style={{ background: 'rgba(75,127,212,0.15)' }} />
      </div>

      {/* ── 모달 ── */}
      {(step === 'modal' || step === 'loading' || step === 'error') && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) reset() }}>
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 border"
            style={{ background: '#0F1828', borderColor: 'rgba(75,127,212,0.25)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>

            {/* 헤더 */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(75,127,212,0.12)', border: '1px solid rgba(75,127,212,0.25)' }}>
                  <ShieldCheck size={16} style={{ color: '#6B9FFF' }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#E2E8F0' }}>내보험 가져오기</p>
                  <p className="text-[11px]" style={{ color: '#4E6888' }}>코드에프 API 연동</p>
                </div>
              </div>
              <button onClick={reset} className="cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: '#4E6888' }}>
                <X size={18} />
              </button>
            </div>

            {/* 안내 문구 */}
            <div className="rounded-xl p-3 mb-5 text-xs leading-relaxed"
              style={{ background: 'rgba(75,127,212,0.06)', border: '1px solid rgba(75,127,212,0.15)', color: '#4E6888' }}>
              🔒 주민등록번호는 보험 조회 후 즉시 폐기되며 저장되지 않습니다.
              조회 결과는 PDF로 변환되어 분석 파일에 자동 첨부됩니다.
            </div>

            {/* 주민번호 입력 */}
            <div className="mb-4">
              <label className="text-xs font-semibold mb-2 block" style={{ color: '#93B4FF' }}>주민등록번호</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="앞 6자리"
                  value={ssn.front}
                  onChange={e => setSsn(p => ({ ...p, front: e.target.value.replace(/\D/g, '') }))}
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm text-center outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(75,127,212,0.25)', color: '#E2E8F0' }}
                  disabled={step === 'loading'}
                />
                <span style={{ color: '#4E6888' }}>-</span>
                <div className="flex-1 relative">
                  <input
                    type="password"
                    maxLength={7}
                    placeholder="뒤 7자리"
                    value={ssn.back}
                    onChange={e => setSsn(p => ({ ...p, back: e.target.value.replace(/\D/g, '') }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-center outline-none transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(75,127,212,0.25)', color: '#E2E8F0' }}
                    disabled={step === 'loading'}
                  />
                </div>
              </div>
            </div>

            {/* 에러 */}
            {(step === 'error' || errorMsg) && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4 text-xs"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                <AlertCircle size={13} />
                {errorMsg}
              </div>
            )}

            {/* 버튼 */}
            <button
              type="button"
              onClick={handleImport}
              disabled={step === 'loading'}
              className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #2D5BE3, #1A3A80)',
                color: 'white',
                border: '1px solid rgba(75,127,212,0.4)',
              }}
            >
              {step === 'loading'
                ? <><Loader2 size={15} className="animate-spin" /> 보험 조회 중...</>
                : <><Download size={15} /> 조회 후 자동 첨부</>
              }
            </button>

            <p className="text-center text-[11px] mt-3" style={{ color: '#2D4060' }}>
              내보험다보여 서비스(금융감독원) 기반
            </p>
          </div>
        </div>
      )}

      {/* ── 성공 토스트 ── */}
      {step === 'success' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl border text-sm font-medium"
          style={{ background: '#0F1828', borderColor: 'rgba(34,197,94,0.3)', color: '#4ADE80', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          ✅ 보험 내역을 PDF로 첨부했습니다!
        </div>
      )}
    </>
  )
}
