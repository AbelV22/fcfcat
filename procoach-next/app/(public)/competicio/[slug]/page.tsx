import { notFound } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
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
  slugify,
} from '@/lib/data'
import {
  Trophy, Users, Calendar, Shield, ChevronRight, Star,
  TrendingUp, AlertTriangle, Zap, LogIn, BarChart2, Target, Clock,
} from 'lucide-react'

export async function generateStaticParams() {
  return Object.keys(COMPETITION_NAMES).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const name = COMPETITION_NAMES[slug]
  if (!name) return { title: 'Competició no trobada' }
  return {
    title: `${name} | FutLab — Estadístiques Futbol Català`,
    description: `Resultats, classificació, disciplina i àrbitres de la ${name}. Dades exclusives del futbol català.`,
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  adult: 'Futbol Amateur', juvenil: 'Futbol Juvenil',
  cadet: 'Futbol Cadet', infantil: 'Futbol Infantil',
}

function formatDate(d: string) {
  if (!d) return ''
  const [day, month, year] = d.split('-')
  const months = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des']
  return `${day} ${months[parseInt(month) - 1]}`
}

function ScoreBadge({ home, away }: { home: number | null; away: number | null }) {
  if (home === null || away === null) {
    return <span className="text-slate-500 text-xs">Pendent</span>
  }
  const homeWin = home > away, awayWin = away > home
  return (
    <span className="font-bold tabular-nums text-sm">
      <span className={homeWin ? 'text-green-400' : awayWin ? 'text-red-400' : 'text-slate-300'}>{home}</span>
      <span className="text-slate-600 mx-1">-</span>
      <span className={awayWin ? 'text-green-400' : homeWin ? 'text-red-400' : 'text-slate-300'}>{away}</span>
    </span>
  )
}

type TabId = 'resultats' | 'classificacio' | 'disciplina' | 'arbitres' | 'golejadors'

export default async function CompeticionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { slug } = await params
  const { tab: tabParam } = await searchParams
  const activeTab: TabId = (['resultats', 'classificacio', 'disciplina', 'arbitres', 'golejadors'].includes(tabParam || '') ? tabParam : 'resultats') as TabId

  const name = COMPETITION_NAMES[slug]
  if (!name) notFound()

  const category = COMPETITION_CATEGORY[slug] || 'adult'
  const matches = getCompetitionMatches(slug)
  const teams = getCompetitionTeams(slug)
  const discipline = getCompetitionDiscipline(slug)
  const standings = getCompetitionStandings(slug)
  const refereeRanking = getCompetitionRefereeRanking(slug)
  const scorers = getCompetitionScorers(slug)
  const calendar = getCompetitionCalendar(slug)
  const nextJornada = getCompetitionNextJornada(slug)
  const fcfStandings = getCompetitionFCFStandings(slug)
  // Upcoming: no score AND not marked as ACTA TANCADA (which means played but score not in calendar page)
  const today = new Date()
  const upcomingFixtures: any[] = calendar.filter(m => {
    if (m.home_score !== null && m.away_score !== null) return false
    if (m.status && (m.status.toUpperCase().includes('TANCADA'))) return false
    // If date is parseable and in the past, it's likely played
    if (m.date) {
      const [d, mo, y] = (m.date as string).split('-').map(Number)
      if (y && mo && d) {
        const matchDate = new Date(y, mo - 1, d)
        if (matchDate < today) return false
      }
    }
    return true
  })
  const nextJornadaFixtures: any[] = nextJornada !== null
    ? upcomingFixtures.filter(m => m.jornada === nextJornada)
    : upcomingFixtures.slice(0, 10)
  // Use FCF official standings when available; fall back to acta-computed
  const displayStandings = fcfStandings.length > 0 ? fcfStandings : standings

  const playedMatches = matches.filter(m => m.home_score !== null)
  const totalGoals = playedMatches.reduce((s, m) => s + (m.home_score as number) + (m.away_score as number), 0)
  const totalYellows = discipline.players.reduce((s, p) => s + p.yellows, 0)
  const totalReds = discipline.players.reduce((s, p) => s + p.reds, 0)
  const hasData = matches.length > 0

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'resultats', label: 'Resultats', icon: <Calendar size={14} />, count: playedMatches.length },
    { id: 'classificacio', label: 'Classificació', icon: <Trophy size={14} />, count: standings.length },
    { id: 'golejadors', label: 'Golejadors', icon: <Target size={14} />, count: scorers.length > 0 ? scorers.length : undefined },
    { id: 'disciplina', label: 'Disciplina', icon: <AlertTriangle size={14} />, count: discipline.riskPlayers.length > 0 ? discipline.riskPlayers.length : undefined },
    { id: 'arbitres', label: 'Àrbitres', icon: <Shield size={14} />, count: refereeRanking.length },
  ]

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <PublicHeader />

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-5">
            <Link href="/" className="hover:text-slate-300 transition-colors">Inici</Link>
            <ChevronRight size={12} />
            <span className="text-slate-400">{CATEGORY_LABEL[category] || 'Competició'}</span>
            <ChevronRight size={12} />
            <span className="text-white">{name}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                <Trophy size={24} className="text-green-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-0.5">{CATEGORY_LABEL[category]}</p>
                <h1 className="text-2xl sm:text-3xl font-bold">{name}</h1>
                <p className="text-xs text-slate-500 mt-1">Temporada 2025/26</p>
              </div>
            </div>

            {/* Stats pills */}
            {hasData && (
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Equips', value: teams.length, color: 'text-white' },
                  { label: 'Partits', value: playedMatches.length, color: 'text-cyan-400' },
                  { label: 'Gols', value: totalGoals, color: 'text-green-400' },
                  { label: '🟨 Grogues', value: totalYellows, color: 'text-amber-400' },
                  { label: '🟥 Vermelles', value: totalReds, color: 'text-red-400' },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-center min-w-[60px]">
                    <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coach CTA strip — ALWAYS visible */}
      <div className="bg-gradient-to-r from-green-900/40 to-cyan-900/40 border-b border-green-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-slate-300">
            <span className="text-green-400 font-semibold">Ets entrenador de {name}?</span>
            {' '}Accedeix als informes arbitrals del teu equip — gratis.
          </p>
          <Link
            href="/entrenador"
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-green-900/30"
          >
            <LogIn size={14} />
            Registra el teu equip
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {!hasData ? (
          <div className="text-center py-24 text-slate-500">
            <Calendar size={44} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-slate-400">Dades actualitzant-se</p>
            <p className="text-sm mt-2 max-w-sm mx-auto">Les dades d'aquesta competició estaran disponibles properament. Estem processant les actes del sistema FCF.</p>
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
              {tabs.map(t => (
                <Link
                  key={t.id}
                  href={`?tab=${t.id}`}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === t.id
                      ? 'bg-green-600 text-white shadow-lg shadow-green-900/30'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/8'
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === t.id ? 'bg-white/20' : 'bg-white/10'}`}>
                      {t.count}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* ─── TAB: RESULTATS ─── */}
            {activeTab === 'resultats' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Recent results */}
                <div className="lg:col-span-2">
                  <h2 className="text-base font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <Calendar size={16} className="text-green-400" />
                    Últims resultats
                  </h2>
                  <div className="space-y-2">
                    {matches.slice(0, 40).map((m, i) => (
                      <div key={i} className="bg-white/4 hover:bg-white/6 transition-colors rounded-xl border border-white/6 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <Link href={`/equip/${slugify(m.home_team)}`} className="text-sm text-slate-200 hover:text-white transition-colors font-medium truncate text-right">
                              {m.home_team}
                            </Link>
                            <ScoreBadge home={m.home_score} away={m.away_score} />
                            <Link href={`/equip/${slugify(m.away_team)}`} className="text-sm text-slate-200 hover:text-white transition-colors truncate">
                              {m.away_team}
                            </Link>
                          </div>
                          <div className="text-right shrink-0 hidden sm:block">
                            {m.main_referee && (
                              <Link href={`/arbitre/${slugify(m.main_referee)}`} className="block text-xs text-slate-500 hover:text-green-400 transition-colors truncate max-w-[120px]">
                                {m.main_referee}
                              </Link>
                            )}
                            <span className="text-[10px] text-slate-600">
                              {formatDate(m.date)}{m.jornada ? ` · J${m.jornada}` : ''}
                            </span>
                          </div>
                        </div>
                        {/* Mobile: date + referee below */}
                        <div className="flex justify-between mt-1.5 sm:hidden text-[10px] text-slate-600">
                          <span>{formatDate(m.date)}{m.jornada ? ` · J${m.jornada}` : ''}</span>
                          {m.main_referee && (
                            <Link href={`/arbitre/${slugify(m.main_referee)}`} className="hover:text-green-400 transition-colors">
                              {m.main_referee}
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Upcoming fixtures + Teams */}
                <div className="space-y-6">
                  {nextJornadaFixtures.length > 0 && (
                    <div>
                      <h2 className="text-base font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <Clock size={16} className="text-green-400" />
                        {nextJornada !== null ? `Proper Jornada — J${nextJornada}` : 'Pròxims Partits'}
                      </h2>
                      <div className="space-y-1.5">
                        {nextJornadaFixtures.map((m: any, i: number) => (
                          <div key={i} className="bg-green-900/10 border border-green-500/20 rounded-xl px-3 py-2.5">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                              <Link href={`/equip/${slugify(m.home_team)}`} className="text-xs text-slate-300 hover:text-white transition-colors font-medium truncate text-right">
                                {m.home_team}
                              </Link>
                              <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                {m.date ? m.date.slice(0, 5) : `J${m.jornada}`}{m.time ? ` ${m.time}` : ''}
                              </span>
                              <Link href={`/equip/${slugify(m.away_team)}`} className="text-xs text-slate-300 hover:text-white transition-colors truncate">
                                {m.away_team}
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <h2 className="text-base font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <Users size={16} className="text-cyan-400" />
                      Equips ({teams.length})
                    </h2>
                    <div className="space-y-1">
                      {teams.slice(0, 24).map((t, i) => (
                        <Link
                          key={i}
                          href={`/equip/${t.slug}`}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 hover:bg-white/6 transition-colors border border-white/5 group"
                        >
                          <span className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">{t.name}</span>
                          <span className="text-xs text-slate-600 shrink-0 ml-2">{t.played}J</span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Stat highlight */}
                  {playedMatches.length > 0 && (
                    <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
                      <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Estadístiques de la categoria</h3>
                      {[
                        { label: 'Gols per partit', value: (totalGoals / playedMatches.length).toFixed(2), color: 'text-green-400' },
                        { label: 'Grogues per partit', value: (totalYellows / playedMatches.length).toFixed(2), color: 'text-amber-400' },
                        { label: 'Vermelles per partit', value: (totalReds / playedMatches.length).toFixed(2), color: 'text-red-400' },
                        { label: 'Partits sense golejador', value: playedMatches.filter(m => (m.home_score as number) + (m.away_score as number) === 0).length, color: 'text-slate-400' },
                      ].map(s => (
                        <div key={s.label} className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
                          <span className="text-xs text-slate-400">{s.label}</span>
                          <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── TAB: CLASSIFICACIÓ ─── */}
            {activeTab === 'classificacio' && (
              <div>
                {displayStandings.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <BarChart2 size={40} className="mx-auto mb-4 opacity-30" />
                    <p>No hi ha prou dades per mostrar la classificació.</p>
                  </div>
                ) : (
                  <>
                  {fcfStandings.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 text-xs text-green-400">
                      <Trophy size={12} />
                      <span>Classificació oficial FCF</span>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/8 text-slate-500 text-xs uppercase tracking-wider">
                          <th className="text-left pb-3 pl-2 font-medium w-8">#</th>
                          <th className="text-left pb-3 font-medium">Equip</th>
                          <th className="text-center pb-3 font-medium">PJ</th>
                          <th className="text-center pb-3 font-medium hidden sm:table-cell">G</th>
                          <th className="text-center pb-3 font-medium hidden sm:table-cell">E</th>
                          <th className="text-center pb-3 font-medium hidden sm:table-cell">P</th>
                          <th className="text-center pb-3 font-medium hidden md:table-cell">GF</th>
                          <th className="text-center pb-3 font-medium hidden md:table-cell">GC</th>
                          <th className="text-center pb-3 font-medium hidden sm:table-cell">Dif.</th>
                          <th className="text-center pb-3 font-medium text-white">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {displayStandings.map((t: any, i: number) => (
                          <tr key={t.slug} className="hover:bg-white/3 transition-colors group">
                            <td className="py-3 pl-2 text-slate-600 text-xs font-medium">{i + 1}</td>
                            <td className="py-3">
                              <Link href={`/equip/${t.slug}`} className="font-medium text-slate-200 group-hover:text-white transition-colors">
                                {t.name}
                              </Link>
                            </td>
                            <td className="py-3 text-center text-slate-400">{t.played}</td>
                            <td className="py-3 text-center text-green-400 hidden sm:table-cell">{t.wins}</td>
                            <td className="py-3 text-center text-amber-400 hidden sm:table-cell">{t.draws}</td>
                            <td className="py-3 text-center text-red-400 hidden sm:table-cell">{t.losses}</td>
                            <td className="py-3 text-center text-slate-400 hidden md:table-cell">{t.goals_for}</td>
                            <td className="py-3 text-center text-slate-400 hidden md:table-cell">{t.goals_against}</td>
                            <td className="py-3 text-center text-slate-400 hidden sm:table-cell">
                              {t.goals_for - t.goals_against > 0 ? `+${t.goals_for - t.goals_against}` : t.goals_for - t.goals_against}
                            </td>
                            <td className="py-3 text-center font-bold text-white">{t.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-slate-600 mt-3 text-center">
                      {fcfStandings.length > 0
                        ? '* Classificació oficial FCF.'
                        : '* Classificació calculada a partir de les actes disponibles. Pot no reflectir la classificació oficial FCF.'}
                    </p>
                  </div>
                  </>
                )}
              </div>
            )}


            {/* ─── TAB: GOLEJADORS ─── */}
            {activeTab === 'golejadors' && (
              <div>
                {scorers.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <Target size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium text-slate-400">Golejadors no disponibles</p>
                    <p className="text-sm mt-2 max-w-sm mx-auto">
                      Les dades de gols s&apos;actualitzen amb les actes de partits. Executa{' '}
                      <code className="bg-white/10 px-1 rounded text-xs">python -m scraper.build_referee_db --competition {slug}</code>
                      {' '}per actualitzar.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-300 flex items-center gap-2">
                        <Target size={16} className="text-green-400" />
                        Taula de Golejadors
                      </h2>
                      <span className="text-xs text-slate-500">{scorers.length} jugadors amb gols</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/8 text-slate-500 text-xs uppercase tracking-wider">
                            <th className="text-left pb-3 pl-2 font-medium w-8">#</th>
                            <th className="text-left pb-3 font-medium">Jugador</th>
                            <th className="text-left pb-3 font-medium hidden sm:table-cell">Equip</th>
                            <th className="text-center pb-3 font-medium hidden md:table-cell">Partits</th>
                            <th className="text-center pb-3 font-medium text-green-400">Gols</th>
                            <th className="text-center pb-3 font-medium hidden sm:table-cell text-slate-400">G/P</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {scorers.slice(0, 30).map((s, i) => (
                            <tr key={i} className="hover:bg-white/3 transition-colors">
                              <td className="py-3 pl-2 text-slate-600 text-xs font-medium">{i + 1}</td>
                              <td className="py-3 font-medium text-slate-200">{s.name}</td>
                              <td className="py-3 text-slate-400 hidden sm:table-cell">
                                <Link href={`/equip/${slugify(s.team)}`} className="hover:text-white transition-colors truncate block max-w-[180px]">
                                  {s.team}
                                </Link>
                              </td>
                              <td className="py-3 text-center text-slate-500 hidden md:table-cell">{s.matches}</td>
                              <td className="py-3 text-center">
                                <span className="font-bold text-green-400 text-base">{s.goals}</span>
                              </td>
                              <td className="py-3 text-center text-slate-400 hidden sm:table-cell">
                                {s.goals_per_match > 0 ? s.goals_per_match.toFixed(2) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {scorers.length > 30 && (
                      <p className="text-xs text-slate-600 mt-3 text-center">
                        Mostrant els 30 primers de {scorers.length} golejadors.
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-3 text-center">
                      * Gols calculats a partir de les actes disponibles.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* ─── TAB: DISCIPLINA ─── */}
            {activeTab === 'disciplina' && (
              <div className="space-y-8">

                {/* Risc de sanció — highlight box */}
                {discipline.riskPlayers.length > 0 && (
                  <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle size={18} className="text-amber-400" />
                      <h2 className="font-bold text-amber-400">Risc de sanció — 4+ targetes grogues</h2>
                      <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                        {discipline.riskPlayers.length} jugadors
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {discipline.riskPlayers.slice(0, 18).map((p, i) => (
                        <div key={i} className="flex items-center justify-between bg-amber-900/20 border border-amber-500/20 rounded-xl px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{p.name}</p>
                            <p className="text-xs text-slate-500 truncate">{p.team}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-3">
                            <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                              🟨 {p.yellows}
                            </span>
                            {p.reds > 0 && (
                              <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                                🟥 {p.reds}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-amber-500/20 bg-amber-900/10 rounded-xl px-4 py-3">
                      <p className="text-xs text-amber-300/70">
                        <Zap size={12} className="inline mr-1" />
                        <strong>Vols rebre un avís automàtic</strong> quan un jugador rival acumuli targetes?{' '}
                        <Link href="/entrenador" className="underline text-amber-400 hover:text-amber-300">Registra el teu equip gratis →</Link>
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Most carded players */}
                  <div>
                    <h2 className="text-base font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-400" />
                      Jugadors amb més targetes
                    </h2>
                    <div className="space-y-2">
                      {discipline.players.slice(0, 15).map((p, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/4 border border-white/6 rounded-xl px-4 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-200 truncate">{p.name}</p>
                            <p className="text-xs text-slate-500 truncate">{p.team}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {p.yellows > 0 && (
                              <span className="text-xs font-bold text-amber-400">🟨 {p.yellows}</span>
                            )}
                            {p.reds > 0 && (
                              <span className="text-xs font-bold text-red-400">🟥 {p.reds}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Most carded teams */}
                  <div>
                    <h2 className="text-base font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <TrendingUp size={16} className="text-red-400" />
                      Equips més sancionats
                    </h2>
                    <div className="space-y-2">
                      {discipline.teams.slice(0, 15).map((t, i) => (
                        <Link
                          key={i}
                          href={`/equip/${t.slug}`}
                          className="flex items-center justify-between bg-white/4 hover:bg-white/6 transition-colors border border-white/6 rounded-xl px-4 py-2.5 group"
                        >
                          <span className="text-sm font-medium text-slate-200 group-hover:text-white truncate">{t.name}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {t.yellows > 0 && (
                              <span className="text-xs font-bold text-amber-400">🟨 {t.yellows}</span>
                            )}
                            {t.reds > 0 && (
                              <span className="text-xs font-bold text-red-400">🟥 {t.reds}</span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: ÀRBITRES ─── */}
            {activeTab === 'arbitres' && (
              <div className="space-y-6">
                {refereeRanking.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <Shield size={40} className="mx-auto mb-4 opacity-30" />
                    <p>No hi ha dades d'àrbitres per a aquesta competició.</p>
                  </div>
                ) : (
                  <>
                    {/* Key insight banner */}
                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-2xl p-4">
                      <p className="text-sm text-slate-300">
                        <Shield size={14} className="inline mr-2 text-blue-400" />
                        <strong className="text-blue-400">Informació exclusiva que FCF no publica.</strong>
                        {' '}Veu les estadístiques de targetes de cada àrbitre, els seus partits recents i el seu perfil de sancions.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/8 text-slate-500 text-xs uppercase tracking-wider">
                            <th className="text-left pb-3 font-medium">Àrbitre</th>
                            <th className="text-center pb-3 font-medium">Partits</th>
                            <th className="text-center pb-3 font-medium">🟨 Total</th>
                            <th className="text-center pb-3 font-medium">🟥 Total</th>
                            <th className="text-center pb-3 font-medium text-amber-400">G/Partit</th>
                            <th className="text-center pb-3 font-medium text-red-400">R/Partit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {refereeRanking.map((r, i) => (
                            <tr key={r.slug} className="hover:bg-white/3 transition-colors group">
                              <td className="py-3">
                                <Link href={`/arbitre/${r.slug}`} className="font-medium text-slate-200 group-hover:text-green-400 transition-colors">
                                  {r.name}
                                </Link>
                              </td>
                              <td className="py-3 text-center text-slate-400">{r.matches}</td>
                              <td className="py-3 text-center text-amber-400">{r.yellows}</td>
                              <td className="py-3 text-center text-red-400">{r.reds}</td>
                              <td className="py-3 text-center">
                                <span className={`font-bold text-sm ${r.yellows_per_match >= 4 ? 'text-red-400' : r.yellows_per_match >= 3 ? 'text-amber-400' : 'text-slate-300'}`}>
                                  {r.yellows_per_match}
                                </span>
                              </td>
                              <td className="py-3 text-center">
                                <span className={`font-bold text-sm ${r.reds_per_match >= 0.5 ? 'text-red-400' : 'text-slate-400'}`}>
                                  {r.reds_per_match}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* CTA referee reports */}
                    <div className="bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-500/20 rounded-2xl p-6 text-center">
                      <Shield size={28} className="mx-auto mb-3 text-green-400" />
                      <h3 className="text-lg font-bold mb-2">Vols saber qui t'arbitrarà el proper partit?</h3>
                      <p className="text-slate-400 text-sm mb-5 max-w-md mx-auto">
                        Registra el teu equip i rep un informe arbitral complet amb historial de targetes, tendències i comparativa amb la categoria.
                      </p>
                      <Link
                        href="/entrenador"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-900/30"
                      >
                        <Zap size={16} />
                        Registra el teu equip — Gratis
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}

          </>
        )}

        {/* Bottom coach CTA — always visible */}
        <div className="mt-12 bg-gradient-to-r from-[#0a1628] to-[#0f172a] border border-white/8 rounded-2xl p-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-semibold mb-4">
            <Zap size={12} />
            100% GRATIS · Sense targeta de crèdit
          </div>
          <h3 className="text-2xl font-bold mb-2">La plataforma per als entrenadors de {name}</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-lg mx-auto">
            Accedeix als informes arbitrals complets del teu equip, estadístiques detallades de jugadors i anàlisi de rivals. Tot en un sol lloc.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/entrenador"
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-900/30"
            >
              <LogIn size={16} />
              Afegeix el teu equip — Gratis
            </Link>
            <Link
              href="/cerca"
              className="flex items-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium rounded-xl transition-all"
            >
              <Users size={16} />
              Explorar jugadors
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/5 mt-8 py-8 text-center text-sm text-slate-600">
        <p>FutLab · Estadístiques del futbol català · Temporada 2025/26</p>
      </footer>
    </div>
  )
}
