'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, ShieldCheck, LogOut, Home } from 'lucide-react'

const NAV = [
  { href: '/admin', icon: <LayoutDashboard size={16} />, label: '대시보드' },
  { href: '/admin/users', icon: <Users size={16} />, label: '사용자 관리' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#111009] text-[#c4b49a] flex">

      {/* 사이드바 */}
      <aside className="w-56 shrink-0 bg-[#1a1714] border-r border-[#d4b483]/10 flex flex-col">
        {/* 로고 */}
        <div className="px-5 py-5 border-b border-[#d4b483]/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c4974a] to-[#7a5c2e] flex items-center justify-center">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#f0ebe0]">AI 보험 분석</p>
              <p className="text-[10px] text-[#c4974a] font-semibold">ADMIN</p>
            </div>
          </div>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all
                ${pathname === item.href
                  ? 'bg-[#d4b483]/15 text-[#f5d28a] border border-[#d4b483]/20'
                  : 'text-[#7a7060] hover:text-[#c4b49a] hover:bg-white/[0.04]'}`}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 하단 버튼 */}
        <div className="px-3 py-4 border-t border-[#d4b483]/10 flex flex-col gap-1">
          <Link href="/"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-[#7a7060] hover:text-[#c4b49a] hover:bg-white/[0.04] transition-all">
            <Home size={16} /> 사이트로 이동
          </Link>
          <button onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-[#7a7060] hover:text-rose-400 hover:bg-rose-500/[0.05] transition-all cursor-pointer w-full text-left">
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      </aside>

      {/* 콘텐츠 */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
