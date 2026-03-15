import type { Metadata } from 'next'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CercaClient from '@/components/CercaClient'
import { getAllReferees, getAllPlayers, getAllTeams } from '@/lib/data'
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
  const teams = teamsDB.length > 0 ? teamsDB : getAllTeams()
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
