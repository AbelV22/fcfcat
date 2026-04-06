import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Users, ListOrdered, Shield, ArrowRight, Target, Clock,
  AlertTriangle, User, Footprints, Ruler, Weight,
  Instagram, Phone, Mail, CheckCircle2, Search,
} from 'lucide-react'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import PlayerShareCard from '@/components/PlayerShareCard'
import { getPlayerProfile, hasMinutesData, COMPETITIONS_WITHOUT_MINUTES, type PlayerProfileDB } from '@/lib/supabase-data'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const player = await getPlayerProfile(slug)
  if (!player) return { title: 'Jugador no trobat — NeoScout' }

  const pos = POSITION_LABELS[player.position || ''] || ''
  const title = `${player.displayName}${pos ? ` — ${pos}` : ''} | Estadístiques Futbol Català`
  const description = `Perfil de ${player.displayName}${pos ? ` (${pos})` : ''}: ${player.career.appearances} partits, ${player.career.goals} gols, ${player.career.yellowCards} targetes grogues. Estadístiques completes al futbol català.`
  return {
    title,
    description,
    keywords: [player.displayName, pos, 'jugador', 'futbol català', 'estadístiques', 'FCF'].filter(Boolean),
    alternates: { canonical: `https://neoscout.es/jugador/${slug}` },
    openGraph: { title, description, url: `https://neoscout.es/jugador/${slug}`, type: 'profile' },
  }
}

export const dynamic = 'force-dynamic'

const POSITION_LABELS: Record<string, string> = {
  porter: 'Porter',
  defensa: 'Defensa',
  migcampista: 'Migcampista',
  davanter: 'Davanter',
}

const POSITION_COLORS: Record<string, string> = {
  porter: 'from-yellow-600 to-amber-600',
  defensa: 'from-blue-600 to-indigo-600',
  migcampista: 'from-green-600 to-emerald-600',
  davanter: 'from-red-600 to-rose-600',
}

const POSITION_TEXT: Record<string, string> = {
  porter: 'text-yellow-400',
  defensa: 'text-blue-400',
  migcampista: 'text-green-400',
  davanter: 'text-red-400',
}

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-xl p-4 text-center">
      <div className={`text-2xl sm:text-3xl font-black mb-0.5 ${color}`}>{value}</div>
      <div className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</div>
    </div>
  )
}

export default async function JugadorPage({ params }: Props) {
  const { slug } = await params
  const player = await getPlayerProfile(slug)

  if (!player) notFound()

  // GDPR opt-out
  if (player.optedOut) {
    return (
      <div className="min-h-screen bg-[#0f172a]">
        <PublicHeader />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-slate-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Perfil no disponible</h1>
          <p className="text-slate-500 text-sm">
            Aquest jugador ha sol·licitat que el seu perfil no sigui visible públicament.
          </p>
        </main>
        <PublicFooter />
      </div>
    )
  }

  const { career, seasons } = player
  const currentTeam = seasons[0] // most recent season first
  const posLabel = POSITION_LABELS[player.position || ''] || null
  const posGradient = POSITION_COLORS[player.position || ''] || 'from-slate-600 to-slate-700'
  const posText = POSITION_TEXT[player.position || ''] || 'text-slate-400'

  // Check if any of the player's seasons have reliable minutes data
  const hasMinutes = seasons.some(s => s.minutesPlayed > 0 && !COMPETITIONS_WITHOUT_MINUTES.has(s.competition))
  const minutesPerGoal = hasMinutes && career.goals > 0 ? Math.round(career.minutesPlayed / career.goals) : null
  const goalsPer90 = hasMinutes && career.minutesPlayed > 0 ? (career.goals / career.minutesPlayed * 90).toFixed(2) : null

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <PublicHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-300 transition-colors">Inici</Link>
          <span>/</span>
          <Link href="/cerca?type=jugador" className="hover:text-slate-300 transition-colors">Jugadors</Link>
          <span>/</span>
          <span className="text-slate-300">{player.displayName}</span>
        </div>

        {/* ─── Header Card ───────────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-5 sm:p-8 mb-6">
          <div className="flex items-start gap-4 sm:gap-6">
            {/* Avatar */}
            {player.photoUrl ? (
              <img
                src={player.photoUrl}
                alt={player.displayName}
                className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl object-cover shrink-0"
              />
            ) : (
              <div className={`w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br ${posGradient} flex items-center justify-center text-2xl sm:text-4xl font-black text-white shrink-0`}>
                {player.displayName.split(' ')[0]?.[0] || '?'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-3xl font-black text-white leading-tight">{player.displayName}</h1>
                {player.verified && (
                  <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {posLabel && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-white/6 border border-white/10 ${posText}`}>
                    {posLabel}
                  </span>
                )}
                {currentTeam && (
                  <Link
                    href={`/equip/${currentTeam.teamSlug}`}
                    className="text-xs text-slate-400 hover:text-green-400 transition-colors flex items-center gap-1"
                  >
                    <ListOrdered size={11} className="text-green-400" />
                    {currentTeam.teamName}
                  </Link>
                )}
                {currentTeam && (
                  <span className="text-xs text-slate-600">
                    {currentTeam.competitionName}
                  </span>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {player.lookingForTeam && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400">
                    Busco equip
                  </span>
                )}
                {player.preferredFoot && (
                  <span className="text-[11px] px-2 py-0.5 bg-white/5 border border-white/8 rounded-full text-slate-400 flex items-center gap-1">
                    <Footprints size={10} />
                    Peu {player.preferredFoot}
                  </span>
                )}
                {player.heightCm && (
                  <span className="text-[11px] px-2 py-0.5 bg-white/5 border border-white/8 rounded-full text-slate-400 flex items-center gap-1">
                    <Ruler size={10} />
                    {player.heightCm} cm
                  </span>
                )}
                {player.weightKg && (
                  <span className="text-[11px] px-2 py-0.5 bg-white/5 border border-white/8 rounded-full text-slate-400 flex items-center gap-1">
                    <Weight size={10} />
                    {player.weightKg} kg
                  </span>
                )}
                {player.birthYear && (
                  <span className="text-[11px] px-2 py-0.5 bg-white/5 border border-white/8 rounded-full text-slate-400">
                    Nascut {player.birthYear}
                  </span>
                )}
              </div>

              {/* Bio */}
              {player.bio && (
                <p className="text-sm text-slate-400 mt-3 leading-relaxed max-w-xl">{player.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Share card */}
        <div className="mb-6 flex items-center gap-3">
          <PlayerShareCard
            name={player.displayName}
            slug={slug}
            position={player.position || undefined}
            currentTeam={currentTeam?.teamName}
            appearances={career.appearances}
            goals={career.goals}
            yellowCards={career.yellowCards}
            redCards={career.redCards}
          />
          <span className="text-xs text-slate-500">Comparteix les teves estadistiques</span>
        </div>

        {/* ─── Career Stats ──────────────────────────────────────── */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3 mb-6">
          <StatCard value={career.appearances} label="Partits" color="text-white" />
          <div className="stat-card p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-black mb-0.5 text-green-400">{career.goals}</div>
            <div className="text-[10px] sm:text-xs text-slate-400">Gols</div>
            {career.penaltyGoals > 0 && (
              <div className="text-[10px] text-cyan-400 mt-0.5">({career.penaltyGoals} pen.)</div>
            )}
          </div>
          {hasMinutes ? (
            <StatCard
              value={career.appearances > 0 && career.minutesPlayed > 0
                ? `${Math.round(career.minutesPlayed / (career.appearances * 90) * 100)}%`
                : '–'}
              label="% Minuts"
              color="text-cyan-400"
            />
          ) : (
            <StatCard value={career.starts} label="Titularitats" color="text-cyan-400" />
          )}
          <StatCard value={career.yellowCards} label="Grogues" color="text-yellow-400" />
          <StatCard value={career.redCards} label="Vermelles" color="text-red-400" />
          {hasMinutes ? (
            <StatCard
              value={goalsPer90 || '–'}
              label="Gols/90'"
              color="text-emerald-400"
            />
          ) : (
            <StatCard
              value={career.goals > 0 && career.appearances > 0
                ? (career.goals / career.appearances).toFixed(2)
                : '–'}
              label="Gols/Partit"
              color="text-emerald-400"
            />
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">

          {/* ─── Season Breakdown (main column) ──────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {seasons.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ListOrdered size={16} className="text-green-400" />
                  <h2 className="font-bold text-white text-sm">Historial per temporada</h2>
                </div>
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/8 text-slate-500 text-[11px] uppercase tracking-wider">
                        <th className="text-left pb-2.5 font-medium">Temporada</th>
                        <th className="text-left pb-2.5 font-medium">Equip</th>
                        <th className="text-left pb-2.5 font-medium">Competició</th>
                        <th className="text-center pb-2.5 font-medium w-10">PJ</th>
                        <th className="text-center pb-2.5 font-medium w-10">⚽</th>
                        <th className="text-center pb-2.5 font-medium w-10">🟨</th>
                        <th className="text-center pb-2.5 font-medium w-10">🟥</th>
                        <th className="text-center pb-2.5 font-medium w-14">{hasMinutes ? 'Min' : 'Tit.'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {seasons.map((s, i) => (
                        <tr key={i} className="hover:bg-white/3 transition-colors">
                          <td className="py-2.5 text-slate-400 text-xs font-mono">{s.season}</td>
                          <td className="py-2.5 pr-3">
                            <Link
                              href={`/equip/${s.teamSlug}`}
                              className="text-slate-200 hover:text-green-400 transition-colors text-xs font-medium"
                            >
                              {s.teamName}
                            </Link>
                          </td>
                          <td className="py-2.5 text-slate-500 text-xs">{s.competitionName}</td>
                          <td className="py-2.5 text-center text-slate-400 text-xs">{s.appearances || '–'}</td>
                          <td className="py-2.5 text-center">
                            {s.goals > 0
                              ? <span className="text-green-400 font-bold text-xs">{s.goals}</span>
                              : <span className="text-slate-600 text-xs">–</span>}
                          </td>
                          <td className="py-2.5 text-center text-slate-400 text-xs">{s.yellowCards || '–'}</td>
                          <td className="py-2.5 text-center">
                            {s.redCards > 0
                              ? <span className="text-red-400 font-bold text-xs">{s.redCards}</span>
                              : <span className="text-slate-600 text-xs">–</span>}
                          </td>
                          <td className="py-2.5 text-center text-slate-500 text-xs">
                            {s.minutesPlayed > 0 && !COMPETITIONS_WITHOUT_MINUTES.has(s.competition)
                              ? `${s.minutesPlayed}'`
                              : (s.starts > 0 ? s.starts : s.appearances)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Highlight video */}
            {player.highlightUrl && (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={16} className="text-purple-400" />
                  <h2 className="font-bold text-white text-sm">Highlights</h2>
                </div>
                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe
                    src={getEmbedUrl(player.highlightUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          {/* ─── Sidebar ─────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Contact (gated — placeholder for premium) */}
            {player.claimed && player.contactVisible && (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Phone size={16} className="text-green-400" />
                  <h3 className="font-bold text-white text-sm">Contacte</h3>
                </div>
                <div className="relative">
                  <div className="blur-sm pointer-events-none select-none space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Phone size={13} /> +34 6XX XXX XXX
                    </div>
                    {player.instagram && (
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Instagram size={13} /> @{player.instagram}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link
                      href="/registre"
                      className="text-xs font-semibold px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                    >
                      Pro per veure contacte
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Social links (public) */}
            {player.instagram && !player.contactVisible && (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Instagram size={16} className="text-pink-400" />
                  <h3 className="font-bold text-white text-sm">Xarxes socials</h3>
                </div>
                <a
                  href={`https://instagram.com/${player.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-pink-400 transition-colors"
                >
                  <Instagram size={14} />
                  @{player.instagram}
                  <ArrowRight size={12} className="ml-auto" />
                </a>
              </div>
            )}

            {/* Advanced stats */}
            {career.appearances > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} className="text-cyan-400" />
                  <h3 className="font-bold text-white text-sm">Estadístiques avançades</h3>
                </div>
                <div className="space-y-3">
                  {hasMinutes && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Min. per gol</span>
                      <span className="text-sm font-bold text-white">{minutesPerGoal ? `${minutesPerGoal}'` : '–'}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Titularitats</span>
                    <span className="text-sm font-bold text-white">
                      {career.starts > 0 ? `${career.starts} (${Math.round(career.starts / career.appearances * 100)}%)` : '–'}
                    </span>
                  </div>
                  {hasMinutes && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Min. per partit</span>
                      <span className="text-sm font-bold text-white">
                        {career.appearances > 0 ? `${Math.round(career.minutesPlayed / career.appearances)}'` : '–'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Targetes / partit</span>
                    <span className="text-sm font-bold text-white">
                      {career.appearances > 0
                        ? ((career.yellowCards + career.redCards) / career.appearances).toFixed(2)
                        : '–'}
                    </span>
                  </div>
                  {career.penaltyGoals > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Gols de penal</span>
                      <span className="text-sm font-bold text-cyan-400">
                        {career.penaltyGoals} ({career.goals > 0 ? Math.round((career.penaltyGoals / career.goals) * 100) : 0}% dels gols)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Claim CTA */}
            {!player.claimed && (
              <div className="glass-card rounded-2xl p-5 border-green-500/20">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                    <User size={18} className="text-green-400" />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-1">Ets tu?</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Reclama el teu perfil per afegir foto, bio, highlights i que els entrenadors et puguin contactar.
                  </p>
                  <Link
                    href={`/registre?claim=${slug}`}
                    className="block w-full text-center text-sm font-semibold px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-colors"
                  >
                    Reclama el teu perfil
                  </Link>
                </div>
              </div>
            )}

            {/* Data source */}
            <div className="text-[10px] text-slate-600 text-center leading-relaxed">
              Les estadístiques provenen de les actes públiques de la{' '}
              <a href="https://www.fcf.cat" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-500">FCF</a>.
              <br />
              Si vols modificar o eliminar les teves dades, contacta&apos;ns a{' '}
              <Link href="/privacitat" className="underline hover:text-slate-500">privacitat</Link>.
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

/** Convert YouTube/Vimeo URLs to embed format */
function getEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return url
}
