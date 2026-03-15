import type { Metadata } from 'next'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CercaClient from '@/components/CercaClient'
import { getAllReferees, getAllPlayers, getAllTeams } from '@/lib/data'

// Force static rendering — search filtering happens client-side in CercaClient.tsx
// to avoid searchParams making this page dynamic (which breaks file reads on Worker).
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Cerca — Equips, Jugadors i Àrbitres',
  description: 'Busca qualsevol equip, jugador o àrbitre del futbol català.',
}

export default async function CercaPage() {
  // All data loaded at build time; client component handles filtering
  const referees = getAllReferees()
  const players = getAllPlayers()
  const teams = getAllTeams()

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
