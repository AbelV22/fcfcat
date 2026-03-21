import type { Metadata } from 'next'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CercaClient from '@/components/CercaClient'
import { getAllReferees, getAllPlayers, getAllTeamsFromJSON } from '@/lib/data'
import { getAllRefereesDB, getAllTeamsDB } from '@/lib/supabase-data'
import teamVenuesData from '@/data/team_venues_fcf.json'

// Dynamic so new teams/referees added to the DB appear without a redeploy
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cerca — Equips, Jugadors i Àrbitres',
  description: 'Busca qualsevol equip, jugador o àrbitre del futbol català.',
}

export default async function CercaPage() {
  // Fetch from Supabase (all competitions), fall back to local files if unavailable
  const [refDB, teamsDB] = await Promise.all([getAllRefereesDB(), getAllTeamsDB()])

  const referees = refDB.length > 0 ? refDB : getAllReferees()

  // Primary source: Supabase standings (776 unique teams, works in CF Workers).
  // Secondary: local JSON files (works in dev, fails silently in CF Workers via fs).
  // Tertiary: venue map import (493 teams from actas, always available via static import).
  // Strategy: merge all three, deduplicate by slug, keep first occurrence (best source wins).
  const dbTeams = teamsDB.length > 0 ? teamsDB : getAllTeamsFromJSON()
  const dbSlugs = new Set(dbTeams.map(t => t.slug))

  // Add any teams from the venue map not already covered by standings
  const teamVenueMap = teamVenuesData as Record<string, string>
  const venueOnlyTeams = Object.keys(teamVenueMap)
    .filter(name => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      return !dbSlugs.has(slug)
    })
    .map(name => ({
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      name,
      competition: '',
      competitionName: 'Actes FCF',
      group: '',
      season: '2526',
    }))

  const teams = [...dbTeams, ...venueOnlyTeams].sort((a, b) => a.name.localeCompare(b.name))

  // Players still come from local team JSON files (fcf_player_stats is empty)
  const players = getAllPlayers()

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <PublicHeader />
      <CercaClient
        referees={referees}
        players={players}
        teams={teams}
      />
      <PublicFooter />
    </div>
  )
}
