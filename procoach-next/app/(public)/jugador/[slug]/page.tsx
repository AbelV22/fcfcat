import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ListOrdered, Target, User, Instagram, ArrowRight,
  CheckCircle2, Share2,
} from 'lucide-react'
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

export default async function JugadorPage({ params }: Props) {
  const { slug } = await params
  const player = await getPlayerProfile(slug)

  if (!player) notFound()

  // GDPR opt-out
  if (player.optedOut) {
    return (
      <div style={{ fontFamily: 'var(--font-inter)' }}>
        <main className="max-w-4xl mx-auto px-4 sm:px-6" style={{ paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <User size={22} style={{ color: '#62666d' }} />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 510, color: '#f7f8f8', marginBottom: 8 }}>Perfil no disponible</h1>
          <p style={{ fontSize: 13, color: '#8a8f98' }}>
            Aquest jugador ha sol·licitat que el seu perfil no sigui visible públicament.
          </p>
        </main>
      </div>
    )
  }

  const { career, seasons } = player
  const currentTeam = seasons[0]
  const posLabel = POSITION_LABELS[player.position || ''] || null

  const hasMinutes = seasons.some(s => s.minutesPlayed > 0 && !COMPETITIONS_WITHOUT_MINUTES.has(s.competition))
  const minutesPerGoal = hasMinutes && career.goals > 0 ? Math.round(career.minutesPlayed / career.goals) : null
  const goalsPer90 = hasMinutes && career.minutesPlayed > 0 ? (career.goals / career.minutesPlayed * 90).toFixed(2) : null
  const goalsPerMatch = career.goals > 0 && career.appearances > 0 ? (career.goals / career.appearances).toFixed(2) : null

  return (
    <div style={{ fontFamily: 'var(--font-inter)' }}>
      <main className="max-w-4xl mx-auto px-4 sm:px-6" style={{ paddingTop: 40, paddingBottom: 80 }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#62666d', marginBottom: 28 }}>
          <Link href="/" style={{ color: '#62666d', textDecoration: 'none' }} className="hover:text-[#d0d6e0]">Inici</Link>
          <span>/</span>
          <Link href="/cerca?type=jugador" style={{ color: '#62666d', textDecoration: 'none' }} className="hover:text-[#d0d6e0]">Jugadors</Link>
          <span>/</span>
          <span style={{ color: '#8a8f98' }}>{player.displayName}</span>
        </div>

        {/* ─── Unified Header Card ─────────────────────────────── */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '24px', marginBottom: 20 }}>

          {/* Top: Avatar + Name + Share */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {/* Avatar */}
            {player.photoUrl ? (
              <img src={player.photoUrl} alt={player.displayName} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 510, color: '#22c55e' }}>
                {player.displayName.split(' ')[0]?.[0] || '?'}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{player.displayName}</h1>
                {player.verified && <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0 }} />}
              </div>

              {/* Position + Team + Competition */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }}>
                {posLabel && (
                  <span style={{ fontSize: 11, fontWeight: 510, color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 9999, padding: '2px 8px' }}>
                    {posLabel}
                  </span>
                )}
                {currentTeam && (
                  <Link href={`/equip/${currentTeam.teamSlug}`} style={{ fontSize: 12, color: '#8a8f98', textDecoration: 'none' }} className="hover:text-[#22c55e]">
                    {currentTeam.teamName}
                  </Link>
                )}
                {currentTeam && <span style={{ fontSize: 12, color: '#62666d' }}>{currentTeam.competitionName}</span>}
              </div>

              {/* Meta badges + Instagram */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {player.lookingForTeam && (
                  <span style={{ fontSize: 11, fontWeight: 510, color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 9999, padding: '2px 8px' }}>Busco equip</span>
                )}
                {player.preferredFoot && (
                  <span style={{ fontSize: 11, color: '#62666d', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '2px 8px' }}>
                    Peu {player.preferredFoot}
                  </span>
                )}
                {player.heightCm && (
                  <span style={{ fontSize: 11, color: '#62666d', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '2px 8px' }}>
                    {player.heightCm} cm
                  </span>
                )}
                {player.birthYear && (
                  <span style={{ fontSize: 11, color: '#62666d', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '2px 8px' }}>
                    Nascut {player.birthYear}
                  </span>
                )}
                {player.instagram && (
                  <a href={`https://instagram.com/${player.instagram}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: '#8a8f98', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9999, padding: '2px 8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    className="hover:text-[#d0d6e0]"
                  >
                    <Instagram size={10} />
                    @{player.instagram}
                  </a>
                )}
              </div>

              {player.bio && <p style={{ fontSize: 13, color: '#8a8f98', marginTop: 10, lineHeight: 1.5 }}>{player.bio}</p>}
            </div>

            {/* Share button — ghost icon */}
            <div style={{ flexShrink: 0 }}>
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
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '20px 0 16px' }} />

          {/* Stats row — 4 key metrics */}
          <div className="grid grid-cols-4" style={{ gap: 8 }}>
            {[
              { value: career.appearances, label: 'Partits', highlight: false },
              { value: career.goals, label: 'Gols', highlight: career.goals > 0 },
              { value: career.yellowCards, label: 'Grogues', highlight: false },
              { value: hasMinutes ? (goalsPer90 || '–') : (goalsPerMatch || '–'), label: hasMinutes ? 'Gols/90\'' : 'Gols/P', highlight: true },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px' }}>
                <div style={{ fontSize: 20, fontWeight: 510, color: s.highlight ? '#22c55e' : '#f7f8f8', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 510, color: '#62666d', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Season Breakdown (full-width) ────────────────────── */}
        {seasons.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px', marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ListOrdered size={13} style={{ color: '#22c55e' }} />
              Historial per temporada
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Temporada', 'Equip', 'Competició', 'PJ', '⚽', '🟨', '🟥', hasMinutes ? 'Min' : 'Tit.'].map((h, i) => (
                      <th key={i} style={{ fontSize: 10, fontWeight: 510, color: '#62666d', letterSpacing: '0.04em', textTransform: 'uppercase', textAlign: i > 2 ? 'center' : 'left', paddingBottom: 8, paddingRight: i < 7 ? 12 : 0 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((s, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/[0.02]">
                      <td style={{ padding: '9px 12px 9px 0', fontSize: 11, color: '#62666d', fontVariantNumeric: 'tabular-nums' }}>{s.season}</td>
                      <td style={{ padding: '9px 12px 9px 0' }}>
                        <Link href={`/equip/${s.teamSlug}`} style={{ fontSize: 12, fontWeight: 510, color: '#d0d6e0', textDecoration: 'none' }} className="hover:text-[#22c55e]">{s.teamName}</Link>
                      </td>
                      <td style={{ padding: '9px 12px 9px 0', fontSize: 11, color: '#62666d' }}>{s.competitionName}</td>
                      <td style={{ padding: '9px 0', fontSize: 12, color: '#8a8f98', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{s.appearances || '–'}</td>
                      <td style={{ padding: '9px 0', fontSize: 12, fontWeight: s.goals > 0 ? 510 : 400, color: s.goals > 0 ? '#22c55e' : '#62666d', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{s.goals || '–'}</td>
                      <td style={{ padding: '9px 0', fontSize: 12, color: '#8a8f98', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{s.yellowCards || '–'}</td>
                      <td style={{ padding: '9px 0', fontSize: 12, color: s.redCards > 0 ? '#f87171' : '#62666d', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{s.redCards || '–'}</td>
                      <td style={{ padding: '9px 0', fontSize: 11, color: '#62666d', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                        {s.minutesPlayed > 0 && !COMPETITIONS_WITHOUT_MINUTES.has(s.competition) ? `${s.minutesPlayed}'` : (s.starts > 0 ? s.starts : s.appearances)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Bottom Row: Advanced Stats + Claim CTA ───────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16, marginBottom: 20 }}>

          {/* Advanced stats */}
          {career.appearances > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={13} style={{ color: '#8a8f98' }} />
                Estadístiques avançades
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ...(hasMinutes && minutesPerGoal ? [{ label: 'Min. per gol', value: `${minutesPerGoal}'` }] : []),
                  { label: 'Titularitats', value: career.starts > 0 ? `${career.starts} (${Math.round(career.starts / career.appearances * 100)}%)` : '–' },
                  ...(hasMinutes ? [{ label: 'Min. per partit', value: career.appearances > 0 ? `${Math.round(career.minutesPlayed / career.appearances)}'` : '–' }] : []),
                  { label: 'Targetes / partit', value: career.appearances > 0 ? ((career.yellowCards + career.redCards) / career.appearances).toFixed(2) : '–' },
                  { label: 'Vermelles', value: String(career.redCards) },
                  ...(career.penaltyGoals > 0 ? [{ label: 'Gols de penal', value: `${career.penaltyGoals} (${career.goals > 0 ? Math.round((career.penaltyGoals / career.goals) * 100) : 0}%)` }] : []),
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#8a8f98' }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Claim CTA */}
          {!player.claimed && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 8, padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <User size={16} style={{ color: '#22c55e' }} />
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', marginBottom: 6 }}>Ets tu?</h3>
              <p style={{ fontSize: 12, color: '#8a8f98', marginBottom: 14, lineHeight: 1.5 }}>
                Reclama el teu perfil per afegir foto, bio, highlights i que els entrenadors et puguin contactar.
              </p>
              <Link href={`/registre?claim=${slug}`} className="v2-btn-primary hover:bg-[#34d399]" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Reclama el teu perfil
              </Link>
            </div>
          )}
        </div>

        {/* ─── Highlight Video ──────────────────────────────────── */}
        {player.highlightUrl && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px', marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', marginBottom: 14 }}>Highlights</h2>
            <div style={{ aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', background: '#000' }}>
              <iframe src={getEmbedUrl(player.highlightUrl)} style={{ width: '100%', height: '100%' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          </div>
        )}

        {/* Data source */}
        <div style={{ fontSize: 10, color: '#62666d', textAlign: 'center', lineHeight: 1.6 }}>
          Estadístiques de les actes públiques de la{' '}
          <a href="https://www.fcf.cat" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>FCF</a>.{' '}
          <Link href="/privacitat" style={{ textDecoration: 'underline', color: '#62666d' }}>Privacitat</Link>.
        </div>
      </main>
    </div>
  )
}

/** Convert YouTube/Vimeo URLs to embed format */
function getEmbedUrl(url: string): string {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return url
}
