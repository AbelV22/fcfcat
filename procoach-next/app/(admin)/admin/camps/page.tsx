import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CampsForm from './CampsForm'
import { getAllTeamsFromJSON } from '@/lib/data'
import { getAllTeamsDB } from '@/lib/supabase-data'
import fieldsData from '@/data/fields.json'
import teamVenuesData from '@/data/team_venues_fcf.json'

// Must be dynamic — fetches teams from Supabase at request time
export const dynamic = 'force-dynamic'

interface FieldEntry {
  name: string
  fcf_venue: string | null
  team: string | null
  city: string
  address: string | null
  length_m: number
  width_m: number
  confirmed: boolean
  notes: string
}

export default async function CampsPage() {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get('ns_admin')?.value === '1'
  if (!isAdmin) redirect('/admin/login')

  const fields: FieldEntry[] = Array.isArray(fieldsData.fields) ? fieldsData.fields : []

  // Use Supabase DB (works in production); fall back to local JSON files
  const teamsDB = await getAllTeamsDB()
  const teamsFromDB = teamsDB.length > 0 ? teamsDB : getAllTeamsFromJSON()

  const teamVenueMap: Record<string, string> = teamVenuesData as Record<string, string>

  // Merge venue map team names into the team list so all teams with known
  // venues are always searchable — even if Supabase returns partial results
  // or the local JSON fallback fails (Cloudflare has no filesystem).
  const dbNames = new Set(teamsFromDB.map(t => t.name))
  const venueOnlyTeams = Object.keys(teamVenueMap)
    .filter(name => !dbNames.has(name))
    .map(name => ({
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      name,
      competition: '',
      competitionName: 'Actes FCF',
      group: '',
      season: '2526',
    }))
  const teams = [...teamsFromDB, ...venueOnlyTeams].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Top nav */}
      <nav className="border-b border-white/8 bg-[#0a1120]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Admin
          </Link>
          <span className="text-white/10">|</span>
          <span className="font-bold text-white text-sm">Gestió de Camps</span>
          <div className="ml-auto">
            <Link href="/" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              ← Lloc
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-black text-white mb-1">Gestió de Camps</h1>
          <p className="text-sm text-slate-500">
            Afegeix i edita les dimensions dels camps. Busca un equip per assignar-li automàticament el seu estadi.
          </p>
        </div>

        <CampsForm fields={fields} teams={teams} teamVenueMap={teamVenueMap} />

        {/* Warning note */}
        <div className="px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
          <p className="text-xs text-amber-400/80">
            <span className="font-semibold text-amber-400">⚠️ Nota:</span>{' '}
            Les dades es guarden a <code className="font-mono text-amber-300">procoach-next/data/fields.json</code>. Fes commit i push per publicar els canvis al servidor.
          </p>
        </div>
      </main>
    </div>
  )
}
