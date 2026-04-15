'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Shield, Zap, TrendingDown, CheckCircle2, BarChart3, FileText } from 'lucide-react'

/* ── 컬러 팔레트 ──────────────────────────────────
   BG:       #0C0D12 / #10111A  (중립 다크)
   카드:     rgba(20,21,30,.95) / rgba(13,14,22,.93)
   테두리:   rgba(255,255,255,.08) (중립 흰)
   CTA:      #F97316 → #C05610  (오렌지)
   포인트:   #6B9FFF / #4B7FD4  (블루 — 네비·링크·로고만)
   텍스트:   #E2E8F0 / #8A929E / #3A424E
──────────────────────────────────────────────── */

function AIPDEmblem({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="28" stroke="#4B7FD4" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.5" />
      <circle cx="30" cy="30" r="22" stroke="#2D5BE3" strokeWidth="0.8" opacity="0.3" />
      <line x1="30" y1="8" x2="48" y2="22" stroke="#4B7FD4" strokeWidth="0.9" opacity="0.6" />
      <line x1="30" y1="8" x2="12" y2="22" stroke="#4B7FD4" strokeWidth="0.9" opacity="0.6" />
      <line x1="48" y1="22" x2="48" y2="38" stroke="#4B7FD4" strokeWidth="0.9" opacity="0.6" />
      <line x1="12" y1="22" x2="12" y2="38" stroke="#4B7FD4" strokeWidth="0.9" opacity="0.6" />
      <line x1="48" y1="38" x2="30" y2="52" stroke="#4B7FD4" strokeWidth="0.9" opacity="0.6" />
      <line x1="12" y1="38" x2="30" y2="52" stroke="#4B7FD4" strokeWidth="0.9" opacity="0.6" />
      <line x1="30" y1="8" x2="30" y2="52" stroke="#2D5BE3" strokeWidth="0.6" opacity="0.3" />
      <line x1="12" y1="22" x2="48" y2="38" stroke="#2D5BE3" strokeWidth="0.6" opacity="0.3" />
      <line x1="48" y1="22" x2="12" y2="38" stroke="#2D5BE3" strokeWidth="0.6" opacity="0.3" />
      <circle cx="30" cy="8" r="2.5" fill="#306FFF" />
      <circle cx="48" cy="22" r="2" fill="#4B7FD4" />
      <circle cx="12" cy="22" r="2" fill="#4B7FD4" />
      <circle cx="48" cy="38" r="2" fill="#4B7FD4" />
      <circle cx="12" cy="38" r="2" fill="#4B7FD4" />
      <circle cx="30" cy="52" r="2" fill="#4B7FD4" />
      <polygon points="30,20 37,24 37,32 30,36 23,32 23,24" fill="#0F1828" stroke="#4B7FD4" strokeWidth="1.2" />
      <rect x="25.5" y="31" width="2" height="3" rx="0.5" fill="#4B7FD4" opacity="0.8" />
      <rect x="29" y="28" width="2" height="6" rx="0.5" fill="#306FFF" />
      <rect x="32.5" y="25" width="2" height="9" rx="0.5" fill="#D4AF37" />
      <circle cx="30" cy="30" r="1.5" fill="#D4AF37" />
    </svg>
  )
}

const MOCK_OVERLAPS: { label: string; severity: 'high' | 'medium' | 'low'; savings: number; bar: number }[] = [
  { label: '실손의료비', severity: 'high',   savings: 23000, bar: 78 },
  { label: '입원일당',   severity: 'medium', savings: 15000, bar: 56 },
  { label: '수술비',     severity: 'low',    savings: 9000,  bar: 38 },
]

const SEVERITY = {
  high:   { color: '#EF4444' },
  medium: { color: '#F59E0B' },
  low:    { color: '#22C55E' },
} as const

export default function Hero() {
  const [mounted, setMounted] = useState(false)
  const [savings, setSavings] = useState(0)

  useEffect(() => {
    setMounted(true)
    const target = 47000
    const step = 16
    const increment = (target / 1800) * step
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) { setSavings(target); clearInterval(timer) }
      else setSavings(Math.floor(current))
    }, step)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes floatY {
          0%,100% { transform:translateY(0px); }
          50%     { transform:translateY(-10px); }
        }
        @keyframes orbDrift {
          0%,100% { transform:translate(0,0) scale(1); }
          33%     { transform:translate(28px,-18px) scale(1.04); }
          66%     { transform:translate(-16px,10px) scale(.97); }
        }
        @keyframes pulseRing {
          0%   { box-shadow:0 0 0 0   rgba(249,115,22,.5); }
          70%  { box-shadow:0 0 0 8px rgba(249,115,22,0); }
          100% { box-shadow:0 0 0 0   rgba(249,115,22,0); }
        }
        @keyframes shimmer {
          0%   { background-position:-200% center; }
          100% { background-position:200% center; }
        }

        .fu-1 { animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .10s both; }
        .fu-2 { animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .25s both; }
        .fu-3 { animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .40s both; }
        .fu-4 { animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .55s both; }
        .fu-5 { animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .70s both; }
        .fu-6 { animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .85s both; }
        .card-anim {
          animation:
            fadeUp .9s cubic-bezier(.22,1,.36,1) .45s both,
            floatY 6s ease-in-out 1.5s infinite;
        }
        .chip-1 { animation:fadeUp .6s cubic-bezier(.22,1,.36,1) 1.1s both; }
        .chip-2 { animation:fadeUp .6s cubic-bezier(.22,1,.36,1) 1.3s both; }
        .spring { transition:all .4s cubic-bezier(.34,1.56,.64,1); }
      `}</style>

      <section
        className="relative min-h-[calc(100vh-64px)] flex flex-col justify-center overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#0C0D12 0%,#10111A 55%,#0C0E14 100%)' }}
      >

        {/* ── BG 1: 중립 그리드 ── */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)
          `,
          backgroundSize: '56px 56px',
        }} />

        {/* ── BG 2: 매우 미세한 앰비언트 글로우 ── */}
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[500px] pointer-events-none"
          style={{ animation: 'orbDrift 14s ease-in-out infinite' }}>
          <div style={{
            width: '100%', height: '100%',
            background: 'radial-gradient(ellipse at 65% 20%,rgba(249,115,22,.06) 0%,transparent 65%)',
          }} />
        </div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[450px] h-[360px] pointer-events-none"
          style={{ animation: 'orbDrift 18s ease-in-out 5s infinite' }}>
          <div style={{
            width: '100%', height: '100%',
            background: 'radial-gradient(ellipse at 20% 80%,rgba(75,127,212,.07) 0%,transparent 60%)',
          }} />
        </div>

        {/* ── BG 3: 버티컬 스트림 ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[10, 26, 45, 64, 80].map((pct, i) => (
            <div key={i} className="absolute top-0 bottom-0" style={{
              left: `${pct}%`, width: '1px',
              background: `linear-gradient(180deg,transparent 0%,rgba(255,255,255,${.02 + i * .007}) 30%,rgba(255,255,255,${.035 + i * .01}) 50%,rgba(255,255,255,${.02 + i * .007}) 70%,transparent 100%)`,
            }} />
          ))}
        </div>

        {/* ════ 본문 ════ */}
        <div className="relative z-10 max-w-[1200px] mx-auto w-full px-6 py-16 md:py-24">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-10">

            {/* ── LEFT ── */}
            <div className="flex-[55] flex flex-col items-start max-w-[600px]">

              {/* 배지 */}
              <div className="fu-1 flex items-center gap-2.5 mb-7 px-4 py-2 rounded-full border"
                style={{
                  background: 'rgba(249,115,22,.07)',
                  borderColor: 'rgba(249,115,22,.2)',
                  backdropFilter: 'blur(10px)',
                }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full"
                    style={{ background: '#F97316', animation: 'pulseRing 2.2s cubic-bezier(.4,0,.6,1) infinite' }} />
                  <span className="relative rounded-full h-2 w-2" style={{ background: '#FB923C' }} />
                </span>
                <span className="text-[11px] font-semibold tracking-[.2em] uppercase" style={{ color: '#FB923C' }}>
                  AI Insurance Premier Diagnostics
                </span>
              </div>

              {/* AIPD 로고 + 텍스트 */}
              <div className="fu-2 flex items-center gap-5 mb-5">
                <AIPDEmblem size={72} />
                <div className="text-[64px] md:text-[80px] font-black tracking-[-4px] leading-none select-none"
                  style={{
                    background: 'linear-gradient(135deg,#FFFFFF 0%,#CBD5E1 25%,#A0B0C8 60%,#8090A8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                  AIPD
                </div>
              </div>

              {/* 구분선 */}
              <div className="fu-2 w-full max-w-[340px] h-px mb-7" style={{
                background: 'linear-gradient(90deg,rgba(255,255,255,.15) 0%,rgba(255,255,255,.04) 65%,transparent 100%)',
              }} />

              {/* 헤드라인 */}
              <h1
                className="fu-3 text-[32px] md:text-[40px] lg:text-[46px] font-bold leading-[1.22] tracking-tight mb-5"
                style={{ color: '#E2E8F0', wordBreak: 'keep-all' }}
              >
                보험 중복보장,
                <br />
                <span style={{
                  background: 'linear-gradient(90deg,#FB923C 0%,#FDBA74 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>AI가 찾아서</span>{' '}
                절감해 드립니다
              </h1>

              {/* 설명 */}
              <p
                className="fu-3 text-sm md:text-[15px] leading-[1.9] mb-9 max-w-[460px]"
                style={{ color: '#8A929E', wordBreak: 'keep-all' }}
              >
                복잡한 보험 서류를 AI에게 맡기세요.<br />
                수초 안에 중복 항목을 탐지하고, 매달 절감할 수 있는 금액과<br />
                맞춤 최적화 전략을 즉시 리포트로 제공합니다.
              </p>

              {/* CTA 버튼 */}
              <div className="fu-4 flex flex-wrap items-center gap-3 mb-9">
                {/* 프라이머리 — 오렌지 */}
                <Link
                  href="/analyze"
                  className="spring group relative flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg,#F97316 0%,#C05610 100%)',
                    color: '#FFF7ED',
                    boxShadow: '0 0 28px rgba(249,115,22,.35), inset 0 1px 0 rgba(255,255,255,.12)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.boxShadow = '0 0 52px rgba(249,115,22,.6), inset 0 1px 0 rgba(255,255,255,.15)'
                    el.style.transform = 'scale(1.05) translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.boxShadow = '0 0 28px rgba(249,115,22,.35), inset 0 1px 0 rgba(255,255,255,.12)'
                    el.style.transform = 'scale(1) translateY(0)'
                  }}
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg,transparent 35%,rgba(255,255,255,.1) 50%,transparent 65%)',
                      backgroundSize: '200% 100%',
                      transition: 'opacity .3s',
                      animation: 'shimmer 1.6s linear infinite',
                    }} />
                  <span className="relative">무료로 분석 시작하기</span>
                  <ArrowRight size={15} className="relative transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                {/* 세컨더리 — 중립 테두리 */}
                <Link
                  href="/dashboard"
                  className="spring flex items-center gap-1.5 px-5 py-3.5 rounded-full text-sm font-medium border"
                  style={{ color: '#8A929E', borderColor: 'rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)' }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'rgba(255,255,255,.22)'
                    el.style.background = 'rgba(255,255,255,.08)'
                    el.style.color = '#E2E8F0'
                    el.style.transform = 'scale(1.04)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'rgba(255,255,255,.12)'
                    el.style.background = 'rgba(255,255,255,.04)'
                    el.style.color = '#8A929E'
                    el.style.transform = 'scale(1)'
                  }}
                >
                  내 분석 내역
                </Link>
              </div>

              {/* 소셜 프루프 */}
              <div className="fu-5 flex items-center gap-4 flex-wrap">
                <div className="flex items-center">
                  {(['#2D5BE3', '#1A6B4A', '#8B2FC9', '#C94A2F'] as const).map((c, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: c, borderColor: '#0C0D12', marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i }}>
                      {['K', 'L', 'M', 'J'][i]}
                    </div>
                  ))}
                  <span className="ml-3 text-[11px]" style={{ color: '#3A424E' }}>이미 분석 중</span>
                </div>
                <div className="h-6 w-px" style={{ background: 'rgba(255,255,255,.08)' }} />
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: '🔒', text: '보안 분석' },
                    { icon: '⚡', text: '즉시 결과' },
                    { icon: '📊', text: '맞춤 리포트' },
                  ].map((b, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-1 rounded-full border"
                      style={{ borderColor: 'rgba(255,255,255,.07)', color: '#64707E', background: 'rgba(255,255,255,.03)' }}>
                      {b.icon} {b.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT: 분석 프리뷰 카드 ── */}
            <div className="flex-[45] w-full flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[400px]">

                {/* 플로팅 칩: 중복 건수 */}
                <div className="chip-1 absolute -top-5 -right-3 z-20 flex items-center gap-2 px-3.5 py-2 rounded-full"
                  style={{
                    background: 'rgba(239,68,68,.1)',
                    border: '1px solid rgba(239,68,68,.28)',
                    backdropFilter: 'blur(10px)',
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#EF4444' }} />
                  <span className="text-[11px] font-semibold" style={{ color: '#FCA5A5' }}>중복 3건 발견</span>
                </div>

                {/* 플로팅 칩: 절감액 */}
                <div className="chip-2 absolute -bottom-5 -left-3 z-20 flex items-center gap-2 px-3.5 py-2 rounded-full"
                  style={{
                    background: 'rgba(34,197,94,.08)',
                    border: '1px solid rgba(34,197,94,.22)',
                    backdropFilter: 'blur(10px)',
                  }}>
                  <TrendingDown size={12} color="#4ADE80" />
                  <span className="text-[11px] font-semibold" style={{ color: '#4ADE80' }}>
                    월 ₩{mounted ? savings.toLocaleString() : '0'} 절감 가능
                  </span>
                </div>

                {/* ── Double-Bezel 카드 (중립 테두리) ── */}
                <div
                  className="card-anim spring w-full rounded-2xl"
                  style={{
                    padding: '1px',
                    background: 'linear-gradient(135deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.05) 60%,rgba(255,255,255,.02) 100%)',
                    boxShadow: '0 28px 64px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.boxShadow = '0 36px 80px rgba(0,0,0,.7), 0 0 32px rgba(249,115,22,.1)'
                    el.style.transform = 'translateY(-6px) scale(1.01)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.boxShadow = '0 28px 64px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)'
                    el.style.transform = 'translateY(0) scale(1)'
                  }}
                >
                  {/* 아우터 베젤 */}
                  <div className="rounded-2xl" style={{ background: 'rgba(20,21,30,.97)', backdropFilter: 'blur(20px)', padding: '1px' }}>
                    {/* 이너 베젤 */}
                    <div className="rounded-[14px]"
                      style={{ background: 'linear-gradient(135deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.02) 100%)', padding: '1px' }}>
                      {/* 콘텐츠 */}
                      <div className="rounded-[13px] overflow-hidden" style={{ background: 'rgba(13,14,22,.94)' }}>

                        {/* 헤더 */}
                        <div className="px-5 py-4 flex items-center justify-between border-b"
                          style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(249,115,22,.12)', border: '1px solid rgba(249,115,22,.22)' }}>
                              <BarChart3 size={16} color="#FB923C" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold" style={{ color: '#E2E8F0' }}>AI 분석 완료</div>
                              <div className="text-[10px] mt-0.5" style={{ color: '#64707E' }}>홍길동님 · 보험 3개 분석</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                            style={{ background: 'rgba(34,197,94,.09)', border: '1px solid rgba(34,197,94,.2)' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} />
                            <span className="text-[10px] font-medium" style={{ color: '#4ADE80' }}>완료</span>
                          </div>
                        </div>

                        {/* 스탯 3칸 */}
                        <div className="grid grid-cols-3 border-b" style={{ borderColor: 'rgba(255,255,255,.04)' }}>
                          {[
                            { value: '3건',      label: '중복 발견', color: '#EF4444' },
                            { value: '₩47,000', label: '월 절감',   color: '#4ADE80' },
                            { value: '99.2%',   label: '정확도',    color: '#FB923C' },
                          ].map((s, i) => (
                            <div key={i} className="flex flex-col items-center py-4 border-r last:border-r-0"
                              style={{ borderColor: 'rgba(255,255,255,.04)' }}>
                              <span className="text-sm font-bold leading-none" style={{ color: s.color }}>{s.value}</span>
                              <span className="text-[10px] mt-1" style={{ color: '#3A424E' }}>{s.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* 중복 항목 리스트 */}
                        <div className="px-5 py-4 flex flex-col gap-3">
                          <div className="text-[10px] font-semibold tracking-[.2em] uppercase" style={{ color: '#3A424E' }}>
                            중복 보장 항목
                          </div>
                          {MOCK_OVERLAPS.map((item, i) => {
                            const cfg = SEVERITY[item.severity]
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                                <span className="text-xs flex-1 font-medium" style={{ color: '#A0A8B4' }}>{item.label}</span>
                                <div className="w-[88px] h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.06)' }}>
                                  <div className="h-full rounded-full"
                                    style={{
                                      width: mounted ? `${item.bar}%` : '0%',
                                      background: cfg.color,
                                      opacity: .75,
                                      transition: `width ${1.2 + i * .25}s cubic-bezier(.22,1,.36,1)`,
                                    }} />
                                </div>
                                <span className="text-[10px] font-semibold w-[54px] text-right" style={{ color: cfg.color }}>
                                  ₩{item.savings.toLocaleString()}
                                </span>
                              </div>
                            )
                          })}
                        </div>

                        {/* 구분선 */}
                        <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,.05)' }} />

                        {/* 카드 푸터 */}
                        <div className="px-5 py-3.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Shield size={11} color="#64707E" />
                            <span className="text-[10px]" style={{ color: '#3A424E' }}>보안 분석 완료</span>
                          </div>
                          <Link href="/analyze"
                            className="flex items-center gap-1 text-[10px] font-semibold spring"
                            style={{ color: '#FB923C' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FDBA74' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#FB923C' }}>
                            리포트 보기 <ArrowRight size={10} />
                          </Link>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ── 하단 스탯 바 ── */}
          <div className="fu-6 mt-16 rounded-2xl"
            style={{
              padding: '1px',
              background: 'linear-gradient(90deg,rgba(255,255,255,.1) 0%,rgba(255,255,255,.04) 50%,rgba(255,255,255,.1) 100%)',
            }}>
            <div className="rounded-[14px] px-8 py-5 flex flex-col sm:flex-row gap-6 sm:gap-0"
              style={{ background: 'rgba(13,14,22,.9)', backdropFilter: 'blur(12px)' }}>
              {[
                { value: 'PDF · JPG · PNG', label: '지원 파일 형식', color: '#6B9FFF',  icon: <FileText size={14} /> },
                { value: '99.2%',           label: 'AI 분석 정확도', color: '#22C55E',  icon: <CheckCircle2 size={14} /> },
                { value: '즉시',             label: '결과 확인',      color: '#FB923C',  icon: <Zap size={14} /> },
              ].map((s, i) => (
                <div key={i} className="flex-1 flex items-center justify-center gap-3 sm:border-r last:border-r-0"
                  style={{ borderColor: 'rgba(255,255,255,.05)' }}>
                  <span style={{ color: s.color, opacity: .65 }}>{s.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold leading-none" style={{ color: s.color }}>{s.value}</span>
                    <span className="text-[11px] mt-1" style={{ color: '#3A424E' }}>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </>
  )
}
