import Link from 'next/link'
import { Lock, Share2 } from 'lucide-react'

/** Inline blur for individual stat values */
export function ProBlurValue({
  value,
  blurred,
  className = '',
}: {
  value: string | number
  blurred: boolean
  className?: string
}) {
  return (
    <span className={`${className} ${blurred ? 'blur-sm select-none' : ''}`}>
      {value}
    </span>
  )
}

/** Wraps a section with blur overlay + CTA when blurred */
export function ProBlurSection({
  children,
  blurred,
  ctaHref,
  ctaText,
  ctaLabel,
}: {
  children: React.ReactNode
  blurred: boolean
  ctaHref: string
  ctaText: string
  ctaLabel: string
}) {
  if (!blurred) return <>{children}</>

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="blur-[6px] pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent rounded-2xl">
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/25 flex items-center justify-center">
            <Lock size={20} className="text-purple-400" />
          </div>
          <p className="text-sm text-slate-300 max-w-xs">{ctaText}</p>
          <Link
            href={ctaHref}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all"
          >
            <Share2 size={14} />
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Sticky PRO unlock banner for dashboard */
export function ProUnlockBanner() {
  return (
    <div className="glass-card rounded-2xl p-5 mb-5 border-purple-500/25 bg-gradient-to-r from-purple-950/40 to-indigo-950/40">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
          <Lock size={18} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm">Informe bloquejat</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Convida 3 entrenadors per desbloquejar l&apos;Informe PRO d&apos;Arbitre complet.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all"
        >
          <Share2 size={12} />
          Compartir i desbloquejar
        </Link>
      </div>
    </div>
  )
}
