'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, Users, Shield, Calendar, ListOrdered,
  ClipboardList, Settings, Home, MoreHorizontal,
  X, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react'

type NavItem = {
  icon: React.ElementType
  label: string
  shortLabel: string
  href: string
  color: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: 'Inici', shortLabel: 'Inici', href: '/dashboard', color: 'text-white' },
  { icon: BarChart3, label: "Intel·ligencia", shortLabel: 'Intel', href: '/dashboard/intel', color: 'text-green-400' },
  { icon: Users, label: 'Rival', shortLabel: 'Rival', href: '/dashboard/rival', color: 'text-cyan-400' },
  { icon: Shield, label: 'Arbitre', shortLabel: 'Arbit.', href: '/dashboard/arbitre-pro', color: 'text-purple-400' },
  { icon: Calendar, label: 'Calendari', shortLabel: 'Calen.', href: '/dashboard/calendari', color: 'text-amber-400' },
  { icon: ListOrdered, label: 'Classificacio', shortLabel: 'Class.', href: '/dashboard/classificacio', color: 'text-yellow-400' },
  { icon: ClipboardList, label: 'Apunts', shortLabel: 'Apunts', href: '/dashboard/apunts', color: 'text-emerald-400' },
  { icon: Settings, label: 'Plantilla', shortLabel: 'Plant.', href: '/dashboard/equip-gestio', color: 'text-slate-400' },
]

// Bottom nav shows first 5 items (Inici, Intel, Rival, Calendari, Apunts) + "Mes" for the rest
const BOTTOM_MAIN = [0, 1, 2, 4, 6] // indices: Inici, Intel, Rival, Calendari, Apunts
const BOTTOM_MORE = [3, 5, 7] // Arbitre, Classificacio, Plantilla

export function DashboardSidebar({
  teamName,
  isAdmin,
}: {
  teamName: string | null
  isAdmin: boolean
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen z-50
        bg-[#0a1628]/95 backdrop-blur-xl border-r border-white/8
        transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[220px]'}`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-4 border-b border-white/8 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center shrink-0">
          <ListOrdered size={14} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-sm truncate">
            Neo<span className="text-green-400">Scout</span>
          </span>
        )}
      </div>

      {/* Team info */}
      {!collapsed && teamName && (
        <div className="px-4 py-3 border-b border-white/5">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Equip</div>
          <div className="text-xs text-green-400 font-semibold truncate">{teamName}</div>
          {isAdmin && (
            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-full font-bold">
              ADMIN
            </span>
          )}
        </div>
      )}
      {collapsed && isAdmin && (
        <div className="flex justify-center py-2 border-b border-white/5">
          <span className="w-2 h-2 rounded-full bg-amber-400" title="Admin" />
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-hide">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 mx-2 mb-0.5 rounded-xl transition-all duration-200
                ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                ${isActive
                  ? 'bg-green-500/10 border-l-2 border-green-400 text-white'
                  : 'border-l-2 border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Icon size={18} className={isActive ? 'text-green-400' : item.color} />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/8 p-2 shrink-0 space-y-1">
        {!collapsed && (
          <Link
            href="/dashboard/setup"
            className="flex items-center gap-2.5 px-3 py-2 text-slate-500 hover:text-green-400 transition-colors rounded-lg hover:bg-white/5"
          >
            <RefreshCw size={14} />
            <span className="text-xs">Canviar equip</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 text-slate-600 hover:text-slate-400 transition-colors rounded-lg hover:bg-white/5"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  )
}

export function DashboardBottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      {/* More overlay */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-16 left-0 right-0 bg-[#0a1628] border-t border-white/10 rounded-t-2xl p-4 space-y-1">
            {BOTTOM_MORE.map(idx => {
              const item = NAV_ITEMS[idx]
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                    ${isActive ? 'bg-green-500/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Icon size={18} className={isActive ? 'text-green-400' : item.color} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
            <Link
              href="/dashboard/setup"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-green-400 hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={18} />
              <span className="text-sm font-medium">Canviar equip</span>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a1628]/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {BOTTOM_MAIN.map(idx => {
            const item = NAV_ITEMS[idx]
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition-colors
                  ${isActive ? 'text-green-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.shortLabel}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition-colors
              ${moreOpen ? 'text-green-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {moreOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
            <span className="text-[10px] font-medium">Mes</span>
          </button>
        </div>
      </nav>
    </>
  )
}

export function DashboardTopBar({
  teamName,
  isAdmin,
}: {
  teamName: string | null
  isAdmin: boolean
}) {
  const pathname = usePathname()

  // Find current page title
  const current = NAV_ITEMS.find(item =>
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href)
  )
  const isSetup = pathname.includes('/setup')
  const pageTitle = isSetup ? 'Configuracio' : current?.label || 'Dashboard'
  const PageIcon = isSetup ? Settings : current?.icon || Home

  return (
    <header className="lg:hidden border-b border-white/8 bg-[#0a1628]/90 backdrop-blur-xl sticky top-0 z-40">
      <div className="px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
            <ListOrdered size={12} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm">
            Neo<span className="text-green-400">Scout</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-full font-bold">
              ADMIN
            </span>
          )}
          {teamName && (
            <span className="text-[10px] px-2 py-0.5 bg-green-500/15 text-green-400 border border-green-500/20 rounded-full font-medium truncate max-w-[120px]">
              {teamName}
            </span>
          )}
          <Link href="/" className="text-[10px] text-slate-600 hover:text-slate-400">
            Inici
          </Link>
        </div>
      </div>
    </header>
  )
}
