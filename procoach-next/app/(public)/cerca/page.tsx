import type { Metadata } from 'next'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CercaClient from '@/components/CercaClient'
import { getAllReferees, getAllPlayers, getAllTeams, getAllTeamsFromJSON } from '@/lib/data'
import { getAllRefereesDB, getAllTeamsDB } from '@/lib/supabase-data'

// Force static rendering — search filtering happens client-side in CercaClient.tsx
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Cerca — Equips, Jugadors i Àrbitres',
  description: 'Busca qualsevol equip, jugador o àrbitre del futbol català.',
}

export default async function CercaPage() {
  // Fetch from Supabase (all competitions), fall back to local files if unavailable
  const [refDB, teamsDB] = await Promise.all([getAllRefereesDB(), getAllTeamsDB()])

  const referees = refDB.length > 0 ? refDB : getAllReferees()

  // JSON files are the authoritative source for competition labels (meta.competition).
  // DB/global_referees assigns competition from the first match found, which can be wrong
  // (e.g. a team that played a cup match in a different competition).
  // Strategy: JSON teams first, then add any DB/ref teams not already covered by JSON.
  const jsonTeams = getAllTeamsFromJSON()
  const allRefTeams = teamsDB.length > 0 ? teamsDB : getAllTeams()
  const jsonSlugs = new Set(jsonTeams.map(t => t.slug))
  const extraRefTeams = allRefTeams.filter((t: { slug: string }) => !jsonSlugs.has(t.slug))
  const teams = [...jsonTeams, ...extraRefTeams].sort((a, b) => a.name.localeCompare(b.name))
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
