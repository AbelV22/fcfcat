import { notFound } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/PublicHeader'
import { getTeamBySlug, COMPETITION_NAMES, slugify } from '@/lib/data'
import { Users, Trophy, Shield, ChevronRight, Star, TrendingUp } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const team = getTeamBySlug(slug)
  const name = team?.type === 'registered' ? team.data.meta?.team : team?.data?.name
  if (!name) return { title: 'Equip | FCFCat' }
  return {
    title: `${name} | FCFCat`,
    description: `Estadístiques, resultats i jugadors de ${name}. Futbol català.`,
  }
}

function ScoreBadge({ home, away }: { home: number | null; away: number | null }) {
  if (home === null || away === null) return <span className="text-slate-500">-</span>
  const hw = home > away, aw = away > home
  return (
    <span className="font-bold tabular-nums">
      <span className={hw ? 'text-green-400' : aw ? 'text-red-400' : 'text-slate-300'}>{home}</span>
      <span className="text-slate-600 mx-1">-</span>
      <span className={aw ? 'text-green-400' : hw ? 'text-red-400' : 'text-slate-300'}>{away}</span>
    </span>
  )
}

function formatDate(d: string) {
  if (!d) return ''
  const [day, month] = d.split('-')
  const months = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des']
  return `${day} ${months[parseInt(month) - 1]}`
}

export default async function EquipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const team = getTeamBySlug(slug)

  if (!team) {
    // Unknown team — show "claim" page
    return (
      <div className="min-h-screen bg-[#0f172a] text-white">
        <PublicHeader />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <Users size={32} className="text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Equip no trobat</h1>
          <p className="text-slate-400 mb-8">
            Aquest equip encara no està registrat a FCFCat. Si en formes part, pots afegir-lo gratis i accedir a estadístiques i informes arbitrals.
          </p>
          <Link href="/entrenador" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all">
            Afegeix el teu equip
          </Link>
        </div>
      </div>
    )
  }

  // PUBLIC team (derived from referee matches)
  if (team.type === 'public') {
    const { name, competition, matches } = team.data
    const compName = COMPETITION_NAMES[competition] || competition
    const played = matches.filter((m: any) => m.home_score !== null)
    let w = 0, d = 0, l = 0, gf = 0, ga = 0
    for (const m of played) {
      const isHome = slugify(m.home_team) === slug
      const myGoals = isHome ? m.home_score : m.away_score
      const theirGoals = isHome ? m.away_score : m.home_score
      gf += myGoals; ga += theirGoals
      if (myGoals > theirGoals) w++
      else if (myGoals === theirGoals) d++
      else l++
    }

    return (
      <div className="min-h-screen bg-[#0f172a] text-white">
        <PublicHeader />

        {/* Hero */}
        <div className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
              <Link href="/" className="hover:text-slate-300">Inici</Link>
              <ChevronRight size={14} />
              <Link href={`/competicio/${competition}`} className="hover:text-slate-300">{compName}</Link>
              <ChevronRight size={14} />
              <span className="text-white">{name}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 flex items-center justify-center text-2xl font-bold text-green-400">
                {name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">{name}</h1>
                <Link href={`/competicio/${competition}`} className="text-sm text-green-400 hover:text-green-300 transition-colors">{compName}</Link>
              </div>
            </div>

            {/* Mini stats */}
            <div className="flex gap-3 mt-6 flex-wrap">
              {[
                { label: 'Partits', value: played.length, color: 'text-white' },
                { label: 'Victòries', value: w, color: 'text-green-400' },
                { label: 'Empats', value: d, color: 'text-amber-400' },
                { label: 'Derrotes', value: l, color: 'text-red-400' },
                { label: 'Gols a favor', value: gf, color: 'text-cyan-400' },
                { label: 'Gols en contra', value: ga, color: 'text-slate-400' },
              ].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-center">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Matches */}
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-green-400" />
              Partits ({matches.length})
            </h2>
            <div className="space-y-2">
              {matches.slice(0, 25).map((m: any, i: number) => {
                const isHome = slugify(m.home_team) === slug
                const myScore = isHome ? m.home_score : m.away_score
                const theirScore = isHome ? m.away_score : m.home_score
                const rival = isHome ? m.away_team : m.home_team
                const rivalSlug = slugify(rival)
                const won = myScore !== null && myScore > theirScore
                const lost = myScore !== null && myScore < theirScore
                return (
                  <div key={i} className="bg-white/4 hover:bg-white/6 transition-colors rounded-xl border border-white/6 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${won ? 'bg-green-500/20 text-green-400' : lost ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>
                          {isHome ? 'LOCAL' : 'VISITA'}
                        </span>
                        <Link href={`/equip/${rivalSlug}`} className="text-sm text-slate-200 hover:text-white transition-colors font-medium">
                          vs {rival}
                        </Link>
                      </div>
                      <div className="flex items-center gap-4">
                        {m.main_referee && (
                          <Link href={`/arbitre/${slugify(m.main_referee)}`} className="hidden sm:block text-xs text-slate-500 hover:text-green-400 transition-colors">
                            {m.main_referee}
                          </Link>
                        )}
                        <ScoreBadge home={isHome ? m.home_score : m.away_score} away={isHome ? m.away_score : m.home_score} />
                        <span className="text-xs text-slate-600 w-16 text-right">{formatDate(m.date)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Coach CTA */}
          <div className="bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-500/20 rounded-2xl p-8 text-center">
            <Star size={28} className="mx-auto mb-3 text-green-400" />
            <h3 className="text-xl font-bold mb-2">Ets l'entrenador de {name}?</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Reclama el perfil del teu equip i accedeix a informes arbitrals complets, estadístiques detallades de jugadors i anàlisi de rivals.
            </p>
            <Link href="/entrenador" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-900/30">
              Reclama el perfil del teu equip — Gratis
            </Link>
          </div>
        </div>

        <footer className="border-t border-white/5 mt-8 py-8 text-center text-sm text-slate-600">
          <p>FCFCat · Estadístiques del futbol català · Temporada 2025/26</p>
        </footer>
      </div>
    )
  }

  // REGISTERED team — full data
  const data = team.data
  const meta = data.meta || {}
  const intelligence = data.data?.team_intelligence || {}
  const players = intelligence.players ? Object.entries(intelligence.players as Record<string, any>) : []
  const compName = COMPETITION_NAMES[meta.competition] || meta.competition_name || ''

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <PublicHeader />

      <div className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-300">Inici</Link>
            <ChevronRight size={14} />
            {meta.competition && <Link href={`/competicio/${meta.competition}`} className="hover:text-slate-300">{compName}</Link>}
            <ChevronRight size={14} />
            <span className="text-white">{meta.team}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 flex items-center justify-center text-2xl font-bold text-green-400">
              {(meta.team || 'E').charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{meta.team}</h1>
              {compName && <Link href={`/competicio/${meta.competition}`} className="text-sm text-green-400 hover:text-green-300">{compName}</Link>}
            </div>
            <div className="ml-auto">
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                Equip registrat
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Players */}
        {players.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-cyan-400" />
              Plantilla ({players.length} jugadors)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="text-left pb-3 font-medium">Jugador</th>
                    <th className="text-center pb-3 font-medium">Part.</th>
                    <th className="text-center pb-3 font-medium">Gols</th>
                    <th className="text-center pb-3 font-medium">🟨</th>
                    <th className="text-center pb-3 font-medium">🟥</th>
                    <th className="text-center pb-3 font-medium hidden sm:table-cell">Minuts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {players
                    .sort((a, b) => (b[1].appearances || 0) - (a[1].appearances || 0))
                    .slice(0, 20)
                    .map(([name, stats]: [string, any], i) => (
                      <tr key={i} className="hover:bg-white/3 transition-colors">
                        <td className="py-3 font-medium text-slate-200">{name}</td>
                        <td className="py-3 text-center text-slate-400">{stats.appearances || 0}</td>
                        <td className="py-3 text-center text-green-400 font-semibold">{stats.goals || 0}</td>
                        <td className="py-3 text-center text-amber-400">{stats.yellow_cards || 0}</td>
                        <td className="py-3 text-center text-red-400">{stats.red_cards || 0}</td>
                        <td className="py-3 text-center text-slate-500 hidden sm:table-cell">{stats.minutes_played || 0}'</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Coach CTA upgrade */}
        <div className="bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-500/20 rounded-2xl p-8 text-center">
          <Shield size={28} className="mx-auto mb-3 text-green-400" />
          <h3 className="text-xl font-bold mb-2">Accedeix als informes arbitrals complets</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Veu l'historial de tots els àrbitres que us han arbitrat, el seu perfil de targetes i molta més informació tàctica.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-900/30">
            Veure informes complets
          </Link>
        </div>
      </div>

      <footer className="border-t border-white/5 mt-8 py-8 text-center text-sm text-slate-600">
        <p>FCFCat · Estadístiques del futbol català · Temporada 2025/26</p>
      </footer>
    </div>
  )
}
