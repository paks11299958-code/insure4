'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Download, X, Loader2, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  onImported: (file: File) => void
}

type Step = 'idle' | 'modal' | 'loading' | 'success' | 'error'

export default function CodefImportButton({ onImported }: Props) {
  const [step, setStep]           = useState<Step>('idle')
  const [form, setForm]           = useState({ name: '', front: '', back: '' })
  const [errorMsg, setErrorMsg]   = useState('')
  const [hasLinked, setHasLinked] = useState(false)
  const [mounted, setMounted]     = useState(false)

  // Portal은 클라이언트에서만 사용 가능
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    fetch('/api/codef/connected')
      .then(r => r.json())
      .then(d => setHasLinked(d.hasConnectedId))
      .catch(() => {})
  }, [])

  // 모달 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    const open = step === 'modal' || step === 'loading' || step === 'error'
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [step])

  const reset = () => {
    setStep('idle')
    setForm({ name: '', front: '', back: '' })
    setErrorMsg('')
  }

  const handleImport = async () => {
    if (!form.name.trim())       { setErrorMsg('이름을 입력해 주세요.'); return }
    if (form.front.length !== 6) { setErrorMsg('앞 6자리를 확인해 주세요.'); return }
    if (form.back.length  !== 7) { setErrorMsg('뒤 7자리를 확인해 주세요.'); return }

    setStep('loading')
    setErrorMsg('')

    try {
      const res  = await fetch('/api/codef/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: form.name, ssnFront: form.front, ssnBack: form.back }),
      })
      const data = await res.json()

      if (res.status === 401 && data.error === 'REAUTH_REQUIRED') {
        setHasLinked(false)
        setErrorMsg(data.message ?? '인증이 만료되었습니다. 다시 입력해 주세요.')
        setStep('error')
        return
      }
      if (!res.ok) throw new Error(data.error || '보험 조회에 실패했습니다.')

      const blob = new Blob([data.text], { type: 'text/plain;charset=utf-8' })
      const file = new File([blob], data.fileName, { type: 'text/plain' })
      onImported(file)
      setHasLinked(true)
      setStep('success')
      setTimeout(() => setStep('idle'), 2500)
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : '오류가 발생했습니다.')
      setStep('error')
    }
  }

  const modalOpen = step === 'modal' || step === 'loading' || step === 'error'

  // ── Portal로 렌더링할 모달 JSX ──
  const modalJSX = (
    <>
      {/* 오버레이: viewport 기준 fixed, 클릭 시 닫힘 */}
      <div
        onClick={reset}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.68)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 모달 카드: 클릭 이벤트 버블링 차단 */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            margin: '16px',
            display: 'flex',
            flexDirection: 'column',
            background: '#0F1828',
            border: '1px solid rgba(75,127,212,0.25)',
            borderRadius: '20px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
            overflow: 'hidden',           /* 헤더 sticky를 위해 hidden */
          }}
        >
          {/* ── 고정 헤더 ── */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 16px',
              background: '#0F1828',
              borderBottom: '1px solid rgba(75,127,212,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(75,127,212,0.12)', border: '1px solid rgba(75,127,212,0.25)',
              }}>
                <ShieldCheck size={16} color="#6B9FFF" />
              </div>
              <div>
                <p style={{ margin: 0, color: '#E2E8F0', fontWeight: 700, fontSize: '15px' }}>내보험 가져오기</p>
                <p style={{ margin: 0, color: '#4E6888', fontSize: '11px' }}>
                  {hasLinked ? '기존 인증으로 재조회' : '코드에프 샌드박스 연동'}
                </p>
              </div>
            </div>
            <button
              onClick={reset}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4E6888', padding: '6px', borderRadius: '8px' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* ── 스크롤 본문 ── */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              paddingBottom: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* 안내 */}
            <div style={{
              background: 'rgba(75,127,212,0.06)',
              border: '1px solid rgba(75,127,212,0.15)',
              borderRadius: '12px', padding: '12px',
              color: '#4E6888', fontSize: '12px', lineHeight: '1.65',
            }}>
              🔒 주민등록번호는 RSA 암호화 후 조회에만 사용되며 서버에 저장되지 않습니다.
              조회 결과는 텍스트 파일로 변환되어 분석 목록에 자동 추가됩니다.
            </div>

            {/* 이름 */}
            <div>
              <label style={{ display: 'block', color: '#93B4FF', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                이름 <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text" placeholder="홍길동"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                disabled={step === 'loading'}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(75,127,212,0.25)',
                  borderRadius: '12px', padding: '11px 14px',
                  color: '#E2E8F0', fontSize: '14px', outline: 'none',
                }}
              />
            </div>

            {/* 주민번호 */}
            <div>
              <label style={{ display: 'block', color: '#93B4FF', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                주민등록번호 <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text" maxLength={6} placeholder="앞 6자리"
                  value={form.front}
                  onChange={e => setForm(p => ({ ...p, front: e.target.value.replace(/\D/g, '') }))}
                  disabled={step === 'loading'}
                  style={{
                    flex: 1, minWidth: 0,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(75,127,212,0.25)',
                    borderRadius: '12px', padding: '11px 10px',
                    color: '#E2E8F0', fontSize: '14px',
                    textAlign: 'center', outline: 'none',
                  }}
                />
                <span style={{ color: '#4E6888', fontSize: '18px', flexShrink: 0 }}>-</span>
                <input
                  type="password" maxLength={7} placeholder="뒤 7자리"
                  value={form.back}
                  onChange={e => setForm(p => ({ ...p, back: e.target.value.replace(/\D/g, '') }))}
                  disabled={step === 'loading'}
                  style={{
                    flex: 1, minWidth: 0,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(75,127,212,0.25)',
                    borderRadius: '12px', padding: '11px 10px',
                    color: '#E2E8F0', fontSize: '14px',
                    textAlign: 'center', outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* 에러 */}
            {(step === 'error' || errorMsg) && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '12px', padding: '10px 14px',
                color: '#F87171', fontSize: '12px',
              }}>
                <AlertCircle size={13} style={{ marginTop: '1px', flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 조회 버튼 */}
            <button
              type="button"
              onClick={handleImport}
              disabled={step === 'loading'}
              style={{
                width: '100%', padding: '14px',
                borderRadius: '16px', fontWeight: 700, fontSize: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: step === 'loading' ? 'rgba(45,91,227,0.5)' : 'linear-gradient(135deg, #2D5BE3, #1A3A80)',
                color: 'white', border: '1px solid rgba(75,127,212,0.4)',
                cursor: step === 'loading' ? 'not-allowed' : 'pointer',
                opacity: step === 'loading' ? 0.7 : 1,
              }}
            >
              {step === 'loading'
                ? <><Loader2 size={15} className="animate-spin" /> 보험 조회 중...</>
                : <><Download size={15} /> 조회 후 자동 첨부</>
              }
            </button>

            <p style={{ textAlign: 'center', fontSize: '11px', margin: 0, color: '#2D4060' }}>
              내보험다보여 서비스 (금융감독원) · 코드에프 샌드박스
            </p>
          </div>
        </div>
      </div>
    </>
  )

  // ── 성공 토스트 (Portal) ──
  const toastJSX = (
    <div style={{
      position: 'fixed', bottom: '24px',
      left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '12px 20px', borderRadius: '16px',
      background: '#0F1828',
      border: '1px solid rgba(34,197,94,0.3)',
      color: '#4ADE80', fontSize: '14px', fontWeight: 500,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      whiteSpace: 'nowrap',
    }}>
      ✅ 보험 내역을 분석 목록에 추가했습니다!
    </div>
  )

  return (
    <>
      {/* ── 트리거 버튼 ── */}
      <div className="flex items-center gap-4 my-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(75,127,212,0.15)' }} />
        <button
          type="button"
          onClick={() => setStep('modal')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer"
          style={{ borderColor: 'rgba(75,127,212,0.4)', color: '#6B9FFF', background: 'rgba(75,127,212,0.07)' }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background  = 'rgba(75,127,212,0.15)'
            el.style.borderColor = '#306FFF'
            el.style.boxShadow   = '0 0 20px rgba(48,111,255,0.2)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background  = 'rgba(75,127,212,0.07)'
            el.style.borderColor = 'rgba(75,127,212,0.4)'
            el.style.boxShadow   = 'none'
          }}
        >
          {hasLinked ? <RefreshCw size={15} /> : <Download size={15} />}
          내보험 가져오기
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
            CODEF
          </span>
        </button>
        <div className="flex-1 h-px" style={{ background: 'rgba(75,127,212,0.15)' }} />
      </div>

      {/* ── Portal: document.body에 직접 마운트 → 부모 컨테이너 완전 탈출 ── */}
      {mounted && modalOpen  && createPortal(modalJSX, document.body)}
      {mounted && step === 'success' && createPortal(toastJSX, document.body)}
    </>
  )
}
