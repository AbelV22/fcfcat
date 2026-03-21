import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CampsForm from './CampsForm'
import { getAllTeamsFromJSON } from '@/lib/data'
import { getAllTeamsDB, getFieldsDB } from '@/lib/supabase-data'
import teamVenuesData from '@/data/team_venues_fcf.json'

// Must be dynamic — fetches teams and fields from Supabase at request time
export const dynamic = 'force-dynamic'

export default async function CampsPage() {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get('ns_admin')?.value === '1'
  if (!isAdmin) redirect('/admin/login')

  // Load fields from Supabase (replaces fields.json — works in Cloudflare Workers)
  const fields = await getFieldsDB()

  // Load teams from Supabase; fall back to local JSON in dev
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
            Els canvis es desen a Supabase i s&apos;apliquen immediatament.
          </p>
        </div>

        <CampsForm fields={fields} teams={teams} teamVenueMap={teamVenueMap} />
      </main>
    </div>
  )
}
