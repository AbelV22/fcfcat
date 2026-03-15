import { notFound } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import CompetitionTabs from '@/components/CompetitionTabs'
import {
  COMPETITION_NAMES,
  COMPETITION_CATEGORY,
  getCompetitionMatches,
  getCompetitionTeams,
  getCompetitionDiscipline,
  getCompetitionStandings,
  getCompetitionRefereeRanking,
  getCompetitionScorers,
  getCompetitionCalendar,
  getCompetitionNextJornada,
  getCompetitionFCFStandings,
} from '@/lib/data'
import { Trophy, AlertTriangle, LogIn, ChevronRight, Zap } from 'lucide-react'

// Force static rendering — data is baked in at build time from local JSON files.
// Tabs are handled client-side in CompetitionTabs.tsx to avoid searchParams
// making this page dynamic (which would break file-system reads on the Worker).
export const dynamic = 'force-static'

export async function generateStaticParams() {
  return Object.keys(COMPETITION_NAMES).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const name = COMPETITION_NAMES[slug]
  if (!name) return { title: 'Competició no trobada' }
  return {
    title: `${name} | NeoScout — Estadístiques Futbol Català`,
    description: `Resultats, classificació, disciplina i àrbitres de la ${name}. Dades exclusives del futbol català.`,
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  adult: 'Futbol Amateur', juvenil: 'Futbol Juvenil',
  cadet: 'Futbol Cadet', infantil: 'Futbol Infantil',
}

const PRIORITY_COMPETITIONS = new Set([
  'segona-catalana', 'tercera-catalana',
  'preferent-juvenils', 'juvenil-primera-divisio',
])

export default async function CompeticionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const name = COMPETITION_NAMES[slug]
  if (!name) notFound()

  const category = COMPETITION_CATEGORY[slug] || 'adult'
  const isPriority = PRIORITY_COMPETITIONS.has(slug)

  // All data fetched at build time from local JSON files
  const matches = getCompetitionMatches(slug)
  const teams = getCompetitionTeams(slug)
  const discipline = getCompetitionDiscipline(slug)
  const standings = getCompetitionStandings(slug)
  const refereeRanking = getCompetitionRefereeRanking(slug)
  const scorers = getCompetitionScorers(slug)
  const calendar = getCompetitionCalendar(slug)
  const nextJornada = getCompetitionNextJornada(slug)
  const fcfStandings = getCompetitionFCFStandings(slug)

  const today = new Date()
  const upcomingFixtures = calendar.filter((m: any) => {
    if (m.home_score !== null && m.away_score !== null) return false
    if (m.status && m.status.toUpperCase().includes('TANCADA')) return false
    if (m.date) {
      const [d, mo, y] = (m.date as string).split('-').map(Number)
      if (y && mo && d) {
        const matchDate = new Date(y, mo - 1, d)
        if (matchDate < today) return false
      }
    }
    return true
  })
  const nextJornadaFixtures = nextJornada !== null
    ? upcomingFixtures.filter((m: any) => m.jornada === nextJornada)
    : upcomingFixtures.slice(0, 10)
  const displayStandings = fcfStandings.length > 0 ? fcfStandings : standings

  const playedMatches = matches.filter((m: any) => m.home_score !== null)
  const totalGoals = playedMatches.reduce((s: number, m: any) => s + (m.home_score as number) + (m.away_score as number), 0)
  const totalYellows = discipline.players.reduce((s: number, p: any) => s + p.yellows, 0)
  const totalReds = discipline.players.reduce((s: number, p: any) => s + p.reds, 0)

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <PublicHeader />

      {/* Beta disclaimer for non-priority competitions */}
      {!isPriority && (
        <div className="bg-amber-500/10 border-b border-amber-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2.5">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300/80">
              <span className="font-semibold text-amber-300">Fase beta:</span>{' '}
              En aquesta primera fase, NeoScout prioritza les categories Segona Catalana, Tercera Catalana, Preferent Juvenil i Primera Divisió Juvenil. Les dades d&apos;aquesta competició poden no estar completament actualitzades.
            </p>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-5">
            <Link href="/" className="hover:text-slate-300 transition-colors">Inici</Link>
            <ChevronRight size={12} />
            <span className="text-slate-400">{CATEGORY_LABEL[category] || 'Competició'}</span>
            <ChevronRight size={12} />
            <span className="text-white">{name}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                <Trophy size={22} className="text-green-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-0.5">{CATEGORY_LABEL[category]}</p>
                <h1 className="text-xl sm:text-3xl font-bold leading-tight">{name}</h1>
                <p className="text-xs text-slate-500 mt-0.5">Temporada 2025/26</p>
              </div>
            </div>

            {playedMatches.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0">
                {[
                  { label: 'Equips', value: teams.length, color: 'text-white' },
                  { label: 'Partits', value: playedMatches.length, color: 'text-cyan-400' },
                  { label: 'Gols', value: totalGoals, color: 'text-green-400' },
                  { label: '🟨', value: totalYellows, color: 'text-amber-400' },
                  { label: '🟥', value: totalReds, color: 'text-red-400' },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-center shrink-0 min-w-[52px]">
                    <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coach CTA strip */}
      <div className="bg-gradient-to-r from-green-900/40 to-cyan-900/40 border-b border-green-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <p className="text-sm text-slate-300">
            <span className="text-green-400 font-semibold">Ets entrenador de {name}?</span>
            {' '}<span className="text-slate-400">Accedeix als informes arbitrals — gratis.</span>
          </p>
          <Link
            href="/entrenador"
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-green-900/30 self-start sm:self-auto"
          >
            <LogIn size={14} />
            Registra el teu equip
          </Link>
        </div>
      </div>

      {/* Client component handles all tab state and content */}
      <CompetitionTabs
        slug={slug}
        name={name}
        matches={matches}
        teams={teams}
        discipline={discipline}
        standings={standings}
        refereeRanking={refereeRanking}
        scorers={scorers}
        nextJornadaFixtures={nextJornadaFixtures}
        nextJornada={nextJornada}
        fcfStandings={fcfStandings}
        displayStandings={displayStandings}
        playedMatches={playedMatches}
        totalGoals={totalGoals}
        totalYellows={totalYellows}
        totalReds={totalReds}
      />

      <footer className="border-t border-white/5 mt-8 py-8 text-center text-sm text-slate-600">
        <p>NeoScout · Estadístiques del futbol català · Temporada 2025/26</p>
      </footer>
    </div>
  )
}
