'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-client'
import WizardShell from '@/components/apunts/WizardShell'
import type { WizardState } from '@/lib/match-notes-types'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

function NouApuntInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [clubName, setClubName] = useState('')
  const [teamSlug, setTeamSlug] = useState('')

  // Read search params once and memoize
  const prefill = useMemo<Partial<WizardState> | undefined>(() => {
    const opponent = searchParams.get('opponent')
    const date = searchParams.get('date')
    const home = searchParams.get('home')
    if (!opponent || !date) return undefined

    const [y, mo, d] = date.split('-')
    const matchDate = `${d}-${mo}-${y}`
    const gf = searchParams.get('gf')
    const ga = searchParams.get('ga')

    return {
      step: 1,
      matchData: {
        opponent,
        match_date: matchDate,
        is_home: home === '1',
        goals_for: gf !== null ? parseInt(gf) : null,
        goals_against: ga !== null ? parseInt(ga) : null,
        jornada: searchParams.get('jornada') ? parseInt(searchParams.get('jornada')!) : null,
        competition: searchParams.get('comp') || null,
        group_name: searchParams.get('group') || null,
      },
    }
  }, [searchParams])

  useEffect(() => {
    async function checkAuth() {
      const isAdmin = getCookie('ns_admin') === '1'
      if (isAdmin) {
        // In admin mode, use real team name from cookie set in /dashboard/setup
        const teamName = getCookie('ns_team_name')
        const teamSlugCookie = getCookie('ns_team_slug')
        setClubName(teamName ? decodeURIComponent(teamName) : '')
        setTeamSlug(teamSlugCookie ? decodeURIComponent(teamSlugCookie) : '')
      } else {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }
        setClubName(user.user_metadata?.club_name || '')
        const slug = (user.user_metadata?.club_name || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
        setTeamSlug(slug)
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <WizardShell clubName={clubName} teamSlug={teamSlug} prefill={prefill} />
}

export default function NouApuntPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NouApuntInner />
    </Suspense>
  )
}
