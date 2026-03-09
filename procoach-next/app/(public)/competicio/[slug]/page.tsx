import { notFound } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import {
  COMPETITION_NAMES,
  COMPETITION_CATEGORY,
  getCompetitionMatches,
  getCompetitionTeams,
  getAllReferees,
  slugify,
} from '@/lib/data'
import { Trophy, Users, Calendar, Shield, ChevronRight, Star } from 'lucide-react'

export async function generateStaticParams() {
  return Object.keys(COMPETITION_NAMES).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const name = COMPETITION_NAMES[slug]
  if (!name) return { title: 'Competició no trobada' }
  return {
    title: `${name} | FCFCat`,
    description: `Resultats, equips i àrbitres de la ${name}. Estadístiques del futbol català.`,
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
  return `${day} ${months[parseInt(month) - 1]} ${year}`
}

function ScoreBadge({ home, away }: { home: number | null; away: number | null }) {
  if (home === null || away === null) {
    return <span className="text-slate-500 text-sm">Pendent</span>
  }
  const homeWin = home > away, awayWin = away > home
  return (
    <div className="flex items-center gap-2 font-bold tabular-nums">
      <span className={homeWin ? 'text-green-400' : awayWin ? 'text-red-400' : 'text-slate-300'}>{home}</span>
      <span className="text-slate-600">-</span>
      <span className={awayWin ? 'text-green-400' : homeWin ? 'text-red-400' : 'text-slate-300'}>{away}</span>
    </div>
  )
}

export default async function CompeticionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const name = COMPETITION_NAMES[slug]
  if (!name) notFound()

  const category = COMPETITION_CATEGORY[slug] || 'adult'
  const matches = getCompetitionMatches(slug)
  const teams = getCompetitionTeams(slug)

  // Referees active in this competition
  const allRefs = getAllReferees()
  const compRefs = allRefs.filter(r => r.competitions.includes(slug))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 20)

  const playedMatches = matches.filter(m => m.home_score !== null)
  const totalGoals = playedMatches.reduce((s, m) => s + (m.home_score as number) + (m.away_score as number), 0)
  const hasData = matches.length > 0

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <PublicHeader />

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-300 transition-colors">Inici</Link>
            <ChevronRight size={14} />
            <span className="text-slate-400">{CATEGORY_LABEL[category] || 'Competició'}</span>
            <ChevronRight size={14} />
            <span className="text-white">{name}</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 flex items-center justify-center">
                  <Trophy size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{CATEGORY_LABEL[category]}</p>
                  <h1 className="text-2xl sm:text-3xl font-bold">{name}</h1>
                </div>
              </div>
            </div>
            <div className="flex gap-4 text-center">
              <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/8">
                <div className="text-2xl font-bold text-green-400">{teams.length}</div>
                <div className="text-xs text-slate-500 mt-0.5">Equips</div>
              </div>
              <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/8">
                <div className="text-2xl font-bold text-cyan-400">{playedMatches.length}</div>
                <div className="text-xs text-slate-500 mt-0.5">Partits</div>
              </div>
              <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/8">
                <div className="text-2xl font-bold text-amber-400">{totalGoals}</div>
                <div className="text-xs text-slate-500 mt-0.5">Gols</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {!hasData && (
          <div className="text-center py-20 text-slate-500">
            <Calendar size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-slate-400">Dades actualitzant-se</p>
            <p className="text-sm mt-2">Les dades d'aquesta competició estaran disponibles properament.</p>
          </div>
        )}

        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left: Recent results */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calendar size={18} className="text-green-400" />
                Últims resultats
              </h2>
              <div className="space-y-2">
                {matches.slice(0, 30).map((m, i) => (
                  <div key={i} className="bg-white/4 hover:bg-white/6 transition-colors rounded-xl border border-white/6 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-slate-200 truncate font-medium">{m.home_team}</span>
                          <ScoreBadge home={m.home_score} away={m.away_score} />
                          <span className="text-sm text-slate-200 truncate font-medium text-right">{m.away_team}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                          <span>{formatDate(m.date)}{m.jornada ? ` · J${m.jornada}` : ''}{m.group && m.group !== 'grup-unic' ? ` · ${m.group.replace('grup-', 'G')}` : ''}</span>
                          {m.main_referee && (
                            <Link href={`/arbitre/${slugify(m.main_referee)}`} className="hover:text-green-400 transition-colors truncate max-w-[160px]">
                              {m.main_referee}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Teams + Referees */}
            <div className="space-y-8">
              {/* Teams */}
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Users size={18} className="text-cyan-400" />
                  Equips ({teams.length})
                </h2>
                <div className="space-y-1">
                  {teams.slice(0, 20).map((t, i) => (
                    <Link
                      key={i}
                      href={`/equip/${t.slug}`}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 hover:bg-white/6 transition-colors border border-white/5 group"
                    >
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">{t.name}</span>
                      <span className="text-xs text-slate-600 shrink-0 ml-2">{t.played} J</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Top referees */}
              {compRefs.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Shield size={18} className="text-amber-400" />
                    Àrbitres actius
                  </h2>
                  <div className="space-y-1">
                    {compRefs.slice(0, 10).map((r, i) => (
                      <Link
                        key={i}
                        href={`/arbitre/${r.slug}`}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 hover:bg-white/6 transition-colors border border-white/5 group"
                      >
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors truncate">{r.name}</span>
                        <span className="text-xs text-slate-500 shrink-0 ml-2">{r.matches} partits</span>
                      </Link>
                    ))}
                    <Link href={`/cerca?type=arbitre`} className="block text-center text-xs text-green-400 hover:text-green-300 py-2 transition-colors">
                      Veure tots els àrbitres →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coach CTA */}
        <div className="bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-500/20 rounded-2xl p-8 text-center">
          <Star size={28} className="mx-auto mb-3 text-green-400" />
          <h3 className="text-xl font-bold mb-2">Ets entrenador d'un equip de {name}?</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Afegeix el teu equip i accedeix a informes arbitrals detallats, estadístiques de jugadors i anàlisi tàctica de rivals.
          </p>
          <Link
            href="/entrenador"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-900/30"
          >
            Afegeix el teu equip — És gratis
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-16 py-8 text-center text-sm text-slate-600">
        <p>FCFCat · Estadístiques del futbol català · Temporada 2025/26</p>
      </footer>
    </div>
  )
}
