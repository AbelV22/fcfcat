'use client'

import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 className="text-xl font-medium text-white mb-2">Error al panell</h1>
      <p className="text-[#8a8f98] text-sm mb-6">
        No hem pogut carregar aquesta secció. Torna-ho a intentar o contacta suport.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#22c55e] hover:bg-[#34d399] text-white text-sm font-medium rounded-lg transition-all"
        >
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 border border-white/[0.06] hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-all"
        >
          Torna al panell
        </Link>
      </div>
    </div>
  )
}
