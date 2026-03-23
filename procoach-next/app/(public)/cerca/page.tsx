import type { Metadata } from 'next'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CercaClient from '@/components/CercaClient'
import { getAllReferees, getAllPlayers, getAllTeamsFromJSON } from '@/lib/data'
import { getAllRefereesDB, getAllTeamsDB, getAllPlayersDB } from '@/lib/supabase-data'
// Dynamic so new teams/referees added to the DB appear without a redeploy
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cerca Equips, Jugadors i Àrbitres — Futbol Català',
  description: 'Busca qualsevol equip, jugador o àrbitre de totes les categories del futbol català. Segona Catalana, Tercera Catalana, Preferent Juvenil i més. Dades oficials FCF.',
  keywords: ['cerca futbol català', 'equips futbol català', 'jugadors FCF', 'àrbitres FCF', 'buscar equip', 'buscar jugador'],
  alternates: { canonical: 'https://neoscout.es/cerca' },
}

export default async function CercaPage() {
  // Fetch from Supabase (all competitions), fall back to local files if unavailable
  const [refDB, teamsDB] = await Promise.all([getAllRefereesDB(), getAllTeamsDB()])

  const referees = refDB.length > 0 ? refDB : getAllReferees()

  // Primary source: Supabase standings (works in CF Workers).
  // Secondary: local JSON files (works in dev, fails silently in CF Workers via fs).
  // Only include teams with actual data pages to avoid 404s.
  const dbTeams = teamsDB.length > 0 ? teamsDB : getAllTeamsFromJSON()

  const teams = [...dbTeams].sort((a, b) => a.name.localeCompare(b.name))

  // Players from Supabase player_profiles (with fallback to local JSON)
  const playersDB = await getAllPlayersDB()
  const players = playersDB.length > 0 ? playersDB : getAllPlayers()

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
