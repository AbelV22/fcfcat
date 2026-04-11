import { notFound } from 'next/navigation'
import Link from 'next/link'
import CompetitionTabs from '@/components/CompetitionTabs'
import {
  COMPETITION_NAMES,
  COMPETITION_CATEGORY,
} from '@/lib/data'
import {
  getCompetitionCalendarDB,
  getCompetitionMatchesDB,
  getCompetitionFCFStandingsDB,
  getCompetitionTeamsDB,
  getCompetitionScorersDB,
  getCompetitionDisciplineDB,
  getCompetitionRefereeRankingDB,
  getCompetitionPenaltyRankingDB,
  getFieldsDB,
} from '@/lib/supabase-data'
import { AlertTriangle, ChevronRight } from 'lucide-react'

// SSR — rendered on each request so data is always fresh
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const name = COMPETITION_NAMES[slug]
  if (!name) return { title: 'Competició no trobada' }
  const category = COMPETITION_CATEGORY[slug] || 'adult'
  const catLabel = CATEGORY_LABEL[category] || 'Futbol Català'
  const title = `${name} 2025/26 — Classificació, Resultats i Estadístiques`
  const description = `Classificació actualitzada, resultats, golejadors, disciplina i àrbitres de la ${name} 2025/26. ${catLabel} — Federació Catalana de Futbol. Dades oficials FCF.`
  return {
    title,
    description,
    keywords: [name, 'classificació', 'resultats', 'golejadors', 'àrbitres', 'futbol català', 'FCF', catLabel, '2025/26'],
    alternates: { canonical: `https://neoscout.es/competicio/${slug}` },
    openGraph: {
      title: `${name} — Classificació i Resultats 2025/26`,
      description,
      url: `https://neoscout.es/competicio/${slug}`,
      type: 'website',
    },
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  adult: 'Futbol Amateur', juvenil: 'Futbol Juvenil',
  cadet: 'Futbol Cadet', infantil: 'Futbol Infantil',
}

const PRIORITY_COMPETITIONS = new Set([
  'lliga-elit', 'primera-catalana',
  'segona-catalana', 'tercera-catalana',
  'preferent-juvenils', 'juvenil-primera-divisio',
  'divisio-honor-juvenil', 'lliga-nacional-juvenil',
  'divisio-honor-cadet-s16', 'divisio-honor-cadet-s15',
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

  // All data fetched from Supabase at build time (parallel queries)
  const [calendar, fcfStandings, scorers, matches, discipline, refereeRanking, teams, penaltyRanking] =
    await Promise.all([
      getCompetitionCalendarDB(slug),
      getCompetitionFCFStandingsDB(slug),
      getCompetitionScorersDB(slug),
      getCompetitionMatchesDB(slug),
      getCompetitionDisciplineDB(slug),
      getCompetitionRefereeRankingDB(slug),
      getCompetitionTeamsDB(slug),
      getCompetitionPenaltyRankingDB(slug),
    ])

  // Fetch fields separately (non-blocking — don't break page if it fails)
  let competitionFields: { name: string; team: string | null; length_m: number; width_m: number }[] = []
  try {
    const allFields = await getFieldsDB()
    const teamNames = new Set(teams.map((t: any) => t.name))
    competitionFields = allFields
      .filter(f => f.team && teamNames.has(f.team) && f.length_m && f.width_m)
      .map(f => ({ name: f.name, team: f.team, length_m: f.length_m, width_m: f.width_m }))
  } catch {
    // Fields data is optional — continue without it
  }

  // Compute next jornada from calendar
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

  const nextJornada: number | null =
    upcomingFixtures.length > 0
      ? Math.min(...upcomingFixtures.map((m: any) => m.jornada as number))
      : null

  const nextJornadaFixtures = nextJornada !== null
    ? upcomingFixtures.filter((m: any) => m.jornada === nextJornada)
    : upcomingFixtures.slice(0, 10)

  // fcfStandings from DB is authoritative; standings (acta-computed) no longer needed
  const displayStandings = fcfStandings

  const playedMatches = matches.filter((m: any) => m.home_score !== null)
  const totalGoals = playedMatches.reduce(
    (s: number, m: any) => s + (m.home_score as number) + (m.away_score as number), 0
  )
  const totalYellows = discipline.players.reduce((s: number, p: any) => s + p.yellows, 0)
  const totalReds = discipline.players.reduce((s: number, p: any) => s + p.reds, 0)

  // JSON-LD structured data for this competition
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${name} 2025/26`,
    description: `Classificació i resultats de la ${name}, temporada 2025/26. Futbol català — Federació Catalana de Futbol.`,
    sport: "Football",
    url: `https://neoscout.es/competicio/${slug}`,
    location: { "@type": "Place", name: "Catalunya", address: { "@type": "PostalAddress", addressRegion: "Catalunya", addressCountry: "ES" } },
    organizer: { "@type": "SportsOrganization", name: "Federació Catalana de Futbol", url: "https://www.fcf.cat" },
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "NeoScout", item: "https://neoscout.es" },
      { "@type": "ListItem", position: 2, name: name, item: `https://neoscout.es/competicio/${slug}` },
    ],
  }

  return (
    <div style={{ fontFamily: 'var(--font-inter)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Beta disclaimer for non-priority competitions */}
      {!isPriority && (
        <div style={{ background: 'rgba(251,191,36,0.06)', borderBottom: '1px solid rgba(251,191,36,0.12)' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6" style={{ paddingTop: 10, paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={13} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#fbbf24' }}>
              <span style={{ fontWeight: 510 }}>Fase beta:</span>{' '}
              En aquesta primera fase, NeoScout prioritza les categories Segona Catalana, Tercera Catalana, Preferent Juvenil i Primera Divisió Juvenil. Les dades d&apos;aquesta competició poden no estar completament actualitzades.
            </p>
          </div>
        </div>
      )}

      {/* Hero */}
      <div style={{ background: '#0f1011', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6" style={{ paddingTop: 32, paddingBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#62666d', marginBottom: 20 }}>
            <Link href="/" className="hover:text-[#d0d6e0]" style={{ color: '#62666d', textDecoration: 'none' }}>Inici</Link>
            <ChevronRight size={11} />
            <span style={{ color: '#8a8f98' }}>{CATEGORY_LABEL[category] || 'Competició'}</span>
            <ChevronRight size={11} />
            <span style={{ color: '#f7f8f8' }}>{name}</span>
          </div>

          <p style={{ fontSize: 10, color: '#62666d', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 510, marginBottom: 6 }}>{CATEGORY_LABEL[category]}</p>
          <h1 style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{name}</h1>
          <p style={{ fontSize: 11, color: '#62666d', marginTop: 4, marginBottom: playedMatches.length > 0 ? 16 : 0 }}>Temporada 2025/26</p>

          {playedMatches.length > 0 && (
            <p style={{ fontSize: 13, color: '#8a8f98', lineHeight: 1.6 }}>
              <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{teams.length}</span> equips
              <span style={{ color: '#62666d', margin: '0 6px' }}>·</span>
              <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{playedMatches.length}</span> partits
              <span style={{ color: '#62666d', margin: '0 6px' }}>·</span>
              <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{totalGoals}</span> gols
              <span style={{ color: '#62666d', margin: '0 6px' }}>·</span>
              <span style={{ color: '#f7f8f8', fontWeight: 510 }}>{(totalGoals / playedMatches.length).toFixed(1)}</span>{' '}
              <span style={{ fontSize: 12 }}>gols/p</span>
            </p>
          )}
        </div>
      </div>

      {/* Client component handles all tab state and content */}
      <CompetitionTabs
        slug={slug}
        name={name}
        matches={matches}
        teams={teams}
        discipline={discipline}
        standings={fcfStandings}
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
        fields={competitionFields}
        penaltyRanking={penaltyRanking}
      />

    </div>
  )
}
