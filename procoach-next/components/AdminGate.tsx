'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'

function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    setIsAdmin(document.cookie.split(';').some(c => c.trim() === 'ns_admin=1'))
  }, [])
  return isAdmin
}

/** Shows admin content if ns_admin cookie is set, otherwise fallback */
export function AdminGate({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const isAdmin = useIsAdmin()
  return isAdmin ? <>{children}</> : <>{fallback ?? null}</>
}

/** PRO badge by default; swaps to ADMIN badge when cookie present */
export function AdminBadge() {
  const isAdmin = useIsAdmin()
  if (isAdmin)
    return (
      <span className="ml-auto text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-semibold">
        ADMIN
      </span>
    )
  return (
    <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold">
      PRO
    </span>
  )
}

/** Blurred stat value; unblurs when admin cookie present */
export function AdminBlurValue({ value }: { value: string }) {
  const isAdmin = useIsAdmin()
  return (
    <span className={`text-xs font-bold text-slate-200 ${isAdmin ? '' : 'blur-sm select-none'}`}>
      {value}
    </span>
  )
}

/** "Desbloquejar" link; hidden when admin */
export function AdminUpgradeLink() {
  const isAdmin = useIsAdmin()
  if (isAdmin) return null
  return (
    <Link
      href="/entrenador"
      className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 text-xs font-semibold rounded-lg transition-all"
    >
      <Star size={11} /> Desbloquejar amb Pla Pro
    </Link>
  )
}
