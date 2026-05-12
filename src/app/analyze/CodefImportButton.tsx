'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Download, X, Loader2, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  onImported: (file: File) => void
}

// step1-sms: step1 진행 중 + SMS 입력창 동시 표시
type Step = 'idle' | 'modal' | 'loading' | 'step1-sms' | '2way' | 'success' | 'error'

interface TwoWayInfo {
  jobIndex:        number
  threadIndex:     number
  jti:             string
  twoWayTimestamp: number
  credit4uId?:     string
  credit4uPw?:     string
  phoneNo?:        string
  telecom?:        string
  isRegister?:     boolean
}

const TELECOM_OPTIONS = [
  { value: '0', label: 'SKT' },
  { value: '1', label: 'KT' },
  { value: '2', label: 'LG U+' },
  { value: '3', label: '알뜰폰(SKT)' },
  { value: '4', label: '알뜰폰(KT)' },
  { value: '5', label: '알뜰폰(LG U+)' },
]

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(75,127,212,0.25)',
  borderRadius: '12px', padding: '11px 14px',
  color: '#E2E8F0', fontSize: '14px', outline: 'none',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', color: '#93B4FF',
  fontSize: '12px', fontWeight: 600, marginBottom: '6px',
}

export default function CodefImportButton({ onImported }: Props) {
  const [step, setStep]             = useState<Step>('idle')
  const [form, setForm]             = useState({ name: '', front: '', back: '', phoneNo: '', telecom: '0' })
  const [smsCode, setSmsCode]       = useState('')
  const [twoWayInfo, setTwoWayInfo] = useState<TwoWayInfo | null>(null)
  const [errorMsg, setErrorMsg]     = useState('')
  const [isTimeout, setIsTimeout]   = useState(false)
  const [mounted, setMounted]       = useState(false)

  // step1 완료 시 즉시 step2 자동 실행을 위한 ref
  const smsCodeRef    = useRef('')
  const formRef       = useRef(form)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { smsCodeRef.current = smsCode }, [smsCode])
  useEffect(() => { formRef.current = form }, [form])

  useEffect(() => {
    const open = ['modal', 'loading', 'step1-sms', 'error', '2way'].includes(step)
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [step])

  const reset = () => {
    setStep('idle')
    setForm({ name: '', front: '', back: '', phoneNo: '', telecom: '0' })
    setSmsCode('')
    setTwoWayInfo(null)
    setErrorMsg('')
    setIsTimeout(false)
  }

  // ── step2 공통 실행 함수 ──
  const doStep2 = async (info: TwoWayInfo, code: string) => {
    setStep('loading')
    setErrorMsg('')

    try {
      const f = formRef.current
      const res = await fetch('/api/codef/step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName:        f.name,
          ssnFront:        f.front,
          ssnBack:         f.back,
          smsAuthNo:       code.trim(),
          jobIndex:        info.jobIndex,
          threadIndex:     info.threadIndex,
          jti:             info.jti,
          twoWayTimestamp: info.twoWayTimestamp,
          credit4uId:      info.credit4uId,
          credit4uPw:      info.credit4uPw,
          isRegister:      info.isRegister ?? false,
          phoneNo:         info.phoneNo,
          telecom:         info.telecom,
        }),
      })
      const data = await res.json()

      if (data.requiresTwoWay) {
        setTwoWayInfo({ ...data.twoWayInfo, isRegister: data.isRegister })
        setSmsCode('')
        setStep('2way')
        return
      }

      if (!res.ok) {
        setIsTimeout(!!data.timeout)
        throw new Error(data.error || '인증에 실패했습니다.')
      }

      const blob = new Blob([data.text], { type: 'text/plain;charset=utf-8' })
      const file = new File([blob], data.fileName, { type: 'text/plain' })
      onImported(file)
      setStep('success')
      setTimeout(() => setStep('idle'), 2500)

    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : '오류가 발생했습니다.')
      setStep('error')
    }
  }

  // ── 1차 요청 (step1) — SMS 입력창 동시 표시 ──
  const handleImport = async () => {
    if (!form.name.trim())        { setErrorMsg('이름을 입력해 주세요.'); return }
    if (form.front.length !== 6)  { setErrorMsg('주민등록번호 앞 6자리를 확인해 주세요.'); return }
    if (form.back.length  !== 7)  { setErrorMsg('주민등록번호 뒤 7자리를 확인해 주세요.'); return }
    if (!form.phoneNo.trim())     { setErrorMsg('휴대폰 번호를 입력해 주세요.'); return }

    setSmsCode('')
    setErrorMsg('')
    setStep('step1-sms') // SMS 입력창 즉시 표시

    try {
      const res = await fetch('/api/codef/step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: form.name,
          ssnFront: form.front,
          ssnBack:  form.back,
          phoneNo:  form.phoneNo.replace(/-/g, ''),
          telecom:  form.telecom,
        }),
      })
      const data = await res.json()

      if (data.requiresTwoWay) {
        const info: TwoWayInfo = { ...data.twoWayInfo, isRegister: data.isRegister }
        setTwoWayInfo(info)

        // step1 완료 시 이미 SMS 코드가 입력돼 있으면 즉시 step2 실행
        const code = smsCodeRef.current.trim()
        if (code) {
          await doStep2(info, code)
          return
        }

        setStep('2way')
        return
      }

      if (!res.ok) throw new Error(data.error || '보험 조회에 실패했습니다.')

      const blob = new Blob([data.text], { type: 'text/plain;charset=utf-8' })
      const file = new File([blob], data.fileName, { type: 'text/plain' })
      onImported(file)
      setStep('success')
      setTimeout(() => setStep('idle'), 2500)

    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : '오류가 발생했습니다.')
      setStep('error')
    }
  }

  // ── 2차 요청 — 사용자가 수동으로 제출할 때 ──
  const handleTwoWay = async () => {
    if (!smsCode.trim()) { setErrorMsg('SMS 인증번호를 입력해 주세요.'); return }
    if (!twoWayInfo)     return
    await doStep2(twoWayInfo, smsCode)
  }

  const modalOpen = ['modal', 'loading', 'step1-sms', 'error', '2way'].includes(step)

  // ── 모달 내부 콘텐츠 ──
  const renderBody = () => {
    // step1 진행 중 + SMS 입력창 동시 표시
    if (step === 'step1-sms') {
      return (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(75,127,212,0.06)',
            border: '1px solid rgba(75,127,212,0.15)',
            borderRadius: '12px', padding: '14px',
          }}>
            <Loader2 size={16} color="#6B9FFF" className="animate-spin" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, color: '#E2E8F0', fontSize: '13px', fontWeight: 600 }}>SMS 발송 중...</p>
              <p style={{ margin: 0, color: '#4E6888', fontSize: '12px', marginTop: '2px' }}>
                문자를 받으시면 바로 아래에 입력해 주세요
              </p>
            </div>
          </div>

          <div>
            <label style={LABEL_STYLE}>
              SMS 인증번호 <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              maxLength={8}
              placeholder="문자 수신 후 즉시 입력"
              value={smsCode}
              onChange={e => setSmsCode(e.target.value.replace(/\D/g, ''))}
              style={{ ...INPUT_STYLE, textAlign: 'center', letterSpacing: '0.2em', fontSize: '18px' }}
              autoFocus
            />
          </div>

          <p style={{ textAlign: 'center', fontSize: '11px', margin: 0, color: '#4E6888' }}>
            입력 즉시 자동으로 인증이 진행됩니다
          </p>
        </>
      )
    }

    // SMS 추가인증 단계 (step1 완료 후 코드 미입력 상태)
    if (step === '2way' || (step === 'error' && twoWayInfo)) {
      if (isTimeout) {
        return (
          <>
            <div style={{
              background: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: '12px', padding: '16px 14px',
              color: '#D97706', fontSize: '13px', lineHeight: '1.7', textAlign: 'center',
            }}>
              ⏱ SMS 인증 시간이 초과되었습니다.<br />
              <span style={{ fontSize: '12px', color: '#92400E' }}>SMS를 받으신 후 빠르게 입력해 주세요.</span>
            </div>
            <button
              type="button"
              onClick={() => { setTwoWayInfo(null); setSmsCode(''); setErrorMsg(''); setIsTimeout(false); setStep('modal') }}
              style={btnStyle(false)}
            >
              <RefreshCw size={15} /> 처음부터 다시 시도
            </button>
          </>
        )
      }

      return (
        <>
          <div style={{
            background: 'rgba(75,127,212,0.06)',
            border: '1px solid rgba(75,127,212,0.15)',
            borderRadius: '12px', padding: '12px',
            color: '#4E6888', fontSize: '12px', lineHeight: '1.65',
          }}>
            📱 입력하신 휴대폰으로 SMS 인증번호가 발송되었습니다.<br />
            수신한 인증번호를 아래에 입력해 주세요.
          </div>

          <div>
            <label style={LABEL_STYLE}>
              SMS 인증번호 <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              maxLength={8}
              placeholder="인증번호 입력"
              value={smsCode}
              onChange={e => setSmsCode(e.target.value.replace(/\D/g, ''))}
              style={{ ...INPUT_STYLE, textAlign: 'center', letterSpacing: '0.2em', fontSize: '18px' }}
              autoFocus
            />
          </div>

          {errorMsg && <ErrorBox msg={errorMsg} />}

          <button type="button" onClick={handleTwoWay} style={btnStyle(false)}>
            <ShieldCheck size={15} /> 인증 완료
          </button>

          <button
            type="button"
            onClick={() => { setTwoWayInfo(null); setStep('modal'); setErrorMsg(''); setIsTimeout(false) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4E6888', fontSize: '12px', textAlign: 'center', width: '100%' }}
          >
            ← 처음부터 다시 입력
          </button>
        </>
      )
    }

    // 기본 폼
    return (
      <>
        <div style={{
          background: 'rgba(75,127,212,0.06)',
          border: '1px solid rgba(75,127,212,0.15)',
          borderRadius: '12px', padding: '12px',
          color: '#4E6888', fontSize: '12px', lineHeight: '1.65',
        }}>
          🔒 주민등록번호는 RSA 암호화 후 조회에만 사용되며 서버에 저장되지 않습니다.
          SMS 인증 후 보험 계약정보를 가져옵니다.
        </div>

        <div>
          <label style={LABEL_STYLE}>이름 <span style={{ color: '#EF4444' }}>*</span></label>
          <input
            type="text" placeholder="홍길동"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            style={INPUT_STYLE}
          />
        </div>

        <div>
          <label style={LABEL_STYLE}>주민등록번호 <span style={{ color: '#EF4444' }}>*</span></label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text" maxLength={6} placeholder="앞 6자리"
              value={form.front}
              onChange={e => setForm(p => ({ ...p, front: e.target.value.replace(/\D/g, '') }))}
              style={{ ...INPUT_STYLE, textAlign: 'center' }}
            />
            <span style={{ color: '#4E6888', fontSize: '18px', flexShrink: 0 }}>-</span>
            <input
              type="password" maxLength={7} placeholder="뒤 7자리"
              value={form.back}
              onChange={e => setForm(p => ({ ...p, back: e.target.value.replace(/\D/g, '') }))}
              style={{ ...INPUT_STYLE, textAlign: 'center' }}
            />
          </div>
        </div>

        <div>
          <label style={LABEL_STYLE}>휴대폰 번호 <span style={{ color: '#EF4444' }}>*</span></label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={form.telecom}
              onChange={e => setForm(p => ({ ...p, telecom: e.target.value }))}
              style={{ ...INPUT_STYLE, width: 'auto', flexShrink: 0, cursor: 'pointer' }}
            >
              {TELECOM_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type="tel" placeholder="01012345678"
              value={form.phoneNo}
              onChange={e => setForm(p => ({ ...p, phoneNo: e.target.value.replace(/[^0-9-]/g, '') }))}
              style={INPUT_STYLE}
            />
          </div>
        </div>

        {errorMsg && <ErrorBox msg={errorMsg} />}

        <button
          type="button"
          onClick={handleImport}
          style={btnStyle(false)}
        >
          <Download size={15} /> 조회 후 자동 첨부
        </button>

        <p style={{ textAlign: 'center', fontSize: '11px', margin: 0, color: '#2D4060' }}>
          내보험다보여 서비스 (금융감독원) · 코드에프 샌드박스
        </p>
      </>
    )
  }

  const modalJSX = (
    <div
      onClick={reset}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.68)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '520px', maxHeight: '90vh',
          margin: '16px',
          display: 'flex', flexDirection: 'column',
          background: '#0F1828',
          border: '1px solid rgba(75,127,212,0.25)',
          borderRadius: '20px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          background: '#0F1828',
          borderBottom: '1px solid rgba(75,127,212,0.1)',
        }}>
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
                {step === 'step1-sms' ? 'SMS 발송 중' : step === '2way' ? 'SMS 추가인증' : '코드에프 연동'}
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

        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '20px 24px 2rem',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          {renderBody()}
        </div>
      </div>
    </div>
  )

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
          <RefreshCw size={15} />
          내보험 가져오기
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
            CODEF
          </span>
        </button>
        <div className="flex-1 h-px" style={{ background: 'rgba(75,127,212,0.15)' }} />
      </div>

      {mounted && modalOpen          && createPortal(modalJSX, document.body)}
      {mounted && step === 'success' && createPortal(toastJSX, document.body)}
    </>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '12px', padding: '10px 14px',
      color: '#F87171', fontSize: '12px',
    }}>
      <AlertCircle size={13} style={{ marginTop: '1px', flexShrink: 0 }} />
      <span>{msg}</span>
    </div>
  )
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '14px',
    borderRadius: '16px', fontWeight: 700, fontSize: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    background: disabled ? 'rgba(45,91,227,0.5)' : 'linear-gradient(135deg, #2D5BE3, #1A3A80)',
    color: 'white', border: '1px solid rgba(75,127,212,0.4)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
  }
}
