'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
}

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: 'Inici', shortLabel: 'Inici', href: '/dashboard' },
  { icon: BarChart3, label: "Intel·ligencia", shortLabel: 'Intel', href: '/dashboard/intel' },
  { icon: Users, label: 'Rival', shortLabel: 'Rival', href: '/dashboard/rival' },
  { icon: Shield, label: 'Arbitre', shortLabel: 'Arbit.', href: '/dashboard/arbitre-pro' },
  { icon: Calendar, label: 'Calendari', shortLabel: 'Calen.', href: '/dashboard/calendari' },
  { icon: ListOrdered, label: 'Classificacio', shortLabel: 'Class.', href: '/dashboard/classificacio' },
  { icon: ClipboardList, label: 'Apunts', shortLabel: 'Apunts', href: '/dashboard/apunts' },
  { icon: Settings, label: 'Plantilla', shortLabel: 'Plant.', href: '/dashboard/equip-gestio' },
]

// Bottom nav shows first 5 items + "Mes" for the rest
const BOTTOM_MAIN = [0, 1, 2, 4, 6] // Inici, Intel, Rival, Calendari, Apunts
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
      className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen z-50 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[220px]'}`}
      style={{ background: '#0f1011', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <Image src="/logo_neoscout.png" alt="NeoScout" width={28} height={28} style={{ borderRadius: 6, flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ fontWeight: 510, color: '#f7f8f8', fontSize: 14, fontFamily: 'var(--font-inter)' }}>
            Neo<span style={{ color: '#22c55e' }}>Scout</span>
          </span>
        )}
      </div>

      {/* Team info */}
      {!collapsed && teamName && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Equip</div>
          <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 510, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamName}</div>
          {isAdmin && (
            <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, padding: '1px 6px', background: 'rgba(255,255,255,0.06)', color: '#8a8f98', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999, fontWeight: 510 }}>
              ADMIN
            </span>
          )}
        </div>
      )}
      {collapsed && isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: '#8a8f98' }} title="Admin" />
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
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
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                margin: '0 8px 2px', padding: collapsed ? '10px 0' : '10px 12px',
                borderRadius: 6, textDecoration: 'none',
                justifyContent: collapsed ? 'center' : undefined,
                background: isActive ? 'rgba(34,197,94,0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid #22c55e' : '2px solid transparent',
                color: isActive ? '#f7f8f8' : '#8a8f98',
                transition: 'all 0.15s',
                fontFamily: 'var(--font-inter)',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#d0d6e0' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a8f98' } }}
            >
              <Icon size={18} style={{ color: isActive ? '#22c55e' : '#8a8f98', flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ fontSize: 13, fontWeight: 510, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 8, flexShrink: 0 }}>
        {!collapsed && (
          <Link
            href="/dashboard/setup"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              color: '#62666d', textDecoration: 'none', borderRadius: 6,
              transition: 'all 0.15s', fontFamily: 'var(--font-inter)',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#22c55e'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#62666d'; e.currentTarget.style.background = 'transparent' }}
          >
            <RefreshCw size={14} />
            <span style={{ fontSize: 12 }}>Canviar equip</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', padding: '8px 0', color: '#62666d', background: 'none',
            border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#8a8f98')}
          onMouseLeave={e => (e.currentTarget.style.color = '#62666d')}
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
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setMoreOpen(false)} />
          <div style={{
            position: 'absolute', bottom: 56, left: 0, right: 0,
            background: '#0f1011', borderTop: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px 8px 0 0', padding: 12,
          }}>
            {BOTTOM_MORE.map(idx => {
              const item = NAV_ITEMS[idx]
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    borderRadius: 6, textDecoration: 'none', marginBottom: 2,
                    background: isActive ? 'rgba(34,197,94,0.08)' : 'transparent',
                    color: isActive ? '#f7f8f8' : '#8a8f98',
                    transition: 'all 0.15s', fontFamily: 'var(--font-inter)',
                  }}
                >
                  <Icon size={18} style={{ color: isActive ? '#22c55e' : '#8a8f98' }} />
                  <span style={{ fontSize: 13, fontWeight: 510 }}>{item.label}</span>
                </Link>
              )
            })}
            <Link
              href="/dashboard/setup"
              onClick={() => setMoreOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderRadius: 6, textDecoration: 'none', color: '#62666d',
                transition: 'all 0.15s', fontFamily: 'var(--font-inter)',
              }}
            >
              <RefreshCw size={18} />
              <span style={{ fontSize: 13, fontWeight: 510 }}>Canviar equip</span>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40" style={{ background: '#0f1011', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: 56 }}>
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
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 2, padding: '4px 12px', borderRadius: 6, textDecoration: 'none',
                  color: isActive ? '#22c55e' : '#62666d',
                  transition: 'color 0.15s',
                }}
              >
                <Icon size={20} />
                <span style={{ fontSize: 10, fontWeight: 510 }}>{item.shortLabel}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 2, padding: '4px 12px', borderRadius: 6, background: 'none', border: 'none',
              color: moreOpen ? '#22c55e' : '#62666d', cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {moreOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
            <span style={{ fontSize: 10, fontWeight: 510 }}>Mes</span>
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

  const current = NAV_ITEMS.find(item =>
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href)
  )
  const isSetup = pathname.includes('/setup')

  return (
    <header
      className="lg:hidden sticky top-0 z-40"
      style={{ background: '#0f1011', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
    >
      <div style={{ padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/logo_neoscout.png" alt="NeoScout" width={26} height={26} style={{ borderRadius: 6 }} />
          <span style={{ fontWeight: 510, color: '#f7f8f8', fontSize: 14, fontFamily: 'var(--font-inter)' }}>
            Neo<span style={{ color: '#22c55e' }}>Scout</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAdmin && (
            <span style={{ fontSize: 10, padding: '1px 6px', background: 'rgba(255,255,255,0.06)', color: '#8a8f98', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999, fontWeight: 510 }}>
              ADMIN
            </span>
          )}
          {teamName && (
            <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 9999, fontWeight: 510, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {teamName}
            </span>
          )}
          <Link href="/" style={{ fontSize: 10, color: '#62666d', textDecoration: 'none' }}>
            Inici
          </Link>
        </div>
      </div>
    </header>
  )
}
