import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), '..', 'data')
const TEAMS_DIR = path.join(DATA_DIR, 'teams')

/** Load global_referees.json — returns parsed object or empty dict */
export function loadGlobalReferees(): Record<string, any> {
  try {
    const filePath = path.join(DATA_DIR, 'global_referees.json')
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/** Count unique referees and total matches */
export async function getRefereeStats() {
  const refs = loadGlobalReferees()
  const matchCount = Object.keys(refs).length

  const refereeNames = new Set<string>()
  for (const match of Object.values(refs)) {
    const m = match as any
    if (Array.isArray(m.referees) && m.referees.length > 0) {
      refereeNames.add(m.referees[0]) // Only main referee
    }
  }

  return {
    refereeCount: refereeNames.size,
    matchCount,
  }
}

/** Count registered teams */
export async function getTeamCount() {
  try {
    const files = fs.readdirSync(TEAMS_DIR).filter(f => f.endsWith('.json'))
    return files.length
  } catch {
    return 9 // Fallback
  }
}

/** Get all unique referees with aggregated stats */
export function getAllReferees() {
  const refs = loadGlobalReferees()
  const refMap: Record<string, {
    name: string
    slug: string
    matches: number
    yellows: number
    reds: number
    competitions: Set<string>
    lastMatch: string
  }> = {}

  for (const match of Object.values(refs)) {
    const m = match as any
    if (!Array.isArray(m.referees) || m.referees.length === 0) continue
    const mainRef = m.referees[0]
    const slug = slugify(mainRef)

    if (!refMap[slug]) {
      refMap[slug] = {
        name: mainRef,
        slug,
        matches: 0,
        yellows: 0,
        reds: 0,
        competitions: new Set(),
        lastMatch: m.date || '',
      }
    }

    const r = refMap[slug]
    r.matches++
    r.yellows += (m.yellow_cards || []).filter((c: any) => c.recipient_type === 'player').length
    r.reds += (m.red_cards || []).filter((c: any) => c.recipient_type === 'player').length
    r.competitions.add(m.competition)
    if ((m.date || '') > r.lastMatch) r.lastMatch = m.date
  }

  return Object.values(refMap).map(r => ({
    ...r,
    competitions: Array.from(r.competitions),
    yellows_per_match: r.matches > 0 ? +(r.yellows / r.matches).toFixed(2) : 0,
    reds_per_match: r.matches > 0 ? +(r.reds / r.matches).toFixed(2) : 0,
  })).sort((a, b) => b.matches - a.matches)
}

/** Get single referee by slug */
export function getRefereeBySlug(slug: string) {
  const refs = loadGlobalReferees()
  const matches: any[] = []

  for (const match of Object.values(refs)) {
    const m = match as any
    if (!Array.isArray(m.referees) || m.referees.length === 0) continue
    if (slugify(m.referees[0]) === slug) {
      matches.push(m)
    }
  }

  if (matches.length === 0) return null

  const refName = matches[0].referees[0]
  const yellows = matches.flatMap((m: any) =>
    (m.yellow_cards || []).filter((c: any) => c.recipient_type === 'player')
  )
  const reds = matches.flatMap((m: any) =>
    (m.red_cards || []).filter((c: any) => c.recipient_type === 'player')
  )
  const staffCards = matches.flatMap((m: any) =>
    [...(m.yellow_cards || []), ...(m.red_cards || [])].filter((c: any) => c.recipient_type === 'technical_staff')
  )

  const matchesSorted = [...matches].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  )

  return {
    name: refName,
    slug,
    matches: matches.length,
    yellows: yellows.length,
    reds: reds.length,
    staffCards: staffCards.length,
    yellows_per_match: matches.length > 0 ? +(yellows.length / matches.length).toFixed(2) : 0,
    reds_per_match: matches.length > 0 ? +(reds.length / matches.length).toFixed(2) : 0,
    competitions: [...new Set(matches.map(m => m.competition))],
    recentMatches: matchesSorted.slice(0, 10).map(m => ({
      date: m.date,
      home_team: m.home_team,
      away_team: m.away_team,
      home_score: m.home_score,
      away_score: m.away_score,
      yellows: (m.yellow_cards || []).filter((c: any) => c.recipient_type === 'player').length,
      reds: (m.red_cards || []).filter((c: any) => c.recipient_type === 'player').length,
      competition: m.competition,
      group: m.group,
      jornada: m.jornada,
    })),
  }
}

/** Load a team JSON file */
export function loadTeamData(slug: string): any | null {
  try {
    const filePath = path.join(TEAMS_DIR, `${slug}.json`)
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Get all teams list */
export function getAllTeams() {
  try {
    return fs.readdirSync(TEAMS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const slug = f.replace('.json', '')
        try {
          const raw = fs.readFileSync(path.join(TEAMS_DIR, f), 'utf-8')
          const data = JSON.parse(raw)
          return {
            slug,
            name: data.meta?.team || slug,
            competition: data.meta?.competition || '',
            competitionName: data.meta?.competition_name || '',
            group: data.meta?.group || '',
            season: data.meta?.season || '2526',
          }
        } catch {
          return { slug, name: slug, competition: '', competitionName: '', group: '', season: '2526' }
        }
      })
  } catch {
    return []
  }
}

/** Get recent results from all global_referees matches */
export function getRecentResults(limit = 20) {
  const refs = loadGlobalReferees()
  return Object.values(refs)
    .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, limit)
    .map((m: any) => ({
      id: m.id,
      date: m.date,
      jornada: m.jornada,
      home_team: m.home_team,
      away_team: m.away_team,
      home_score: m.home_score,
      away_score: m.away_score,
      competition: m.competition,
      group: m.group,
    }))
}

/** Extract all players from team intelligence */
export function getAllPlayers() {
  const teams = getAllTeams()
  const players: any[] = []

  for (const team of teams) {
    const data = loadTeamData(team.slug)
    if (!data?.data?.team_intelligence?.players) continue

    for (const [name, stats] of Object.entries(data.data.team_intelligence.players as Record<string, any>)) {
      players.push({
        slug: slugify(name),
        name,
        team: team.name,
        teamSlug: team.slug,
        competition: team.competition,
        appearances: stats.appearances || 0,
        goals: stats.goals || 0,
        yellow_cards: stats.yellow_cards || 0,
        red_cards: stats.red_cards || 0,
        minutes_played: stats.minutes_played || 0,
      })
    }
  }

  return players.sort((a, b) => b.appearances - a.appearances)
}

/** Simple slug generator */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/** Competition display names — slugs verified against fcf.cat */
export const COMPETITION_NAMES: Record<string, string> = {
  // Adult
  'tercera-federacio':           'Tercera Federació',
  'lliga-elit':                  'Lliga Elit',
  'primera-catalana':            'Primera Catalana',
  'segona-catalana':             'Segona Catalana',
  'tercera-catalana':            'Tercera Catalana',
  'quarta-catalana':             'Quarta Catalana',
  // Juvenil
  'divisio-honor-juvenil':       "Divisió d'Honor Juvenil",
  'lliga-nacional-juvenil':      'Lliga Nacional Juvenil',
  'preferent-juvenil':           'Preferent Juvenil',
  'primera-divisio-juvenil':     'Juvenil Primera Divisió',
  'segona-catalana-juvenil':     'Juvenil Segona Divisió',
  'tercera-catalana-juvenil':    'Juvenil Tercera Divisió',
  // Cadet S16
  'divisio-honor-cadet-s16':     "Divisió d'Honor Cadet S16",
  'preferent-cadet-s16':         'Preferent Cadet S16',
  'cadet-primera-divisio-s16':   'Cadet Primera Divisió S16',
  'cadet-segona-divisio-s16':    'Cadet Segona Divisió S16',
  // Cadet S15
  'divisio-honor-cadet-s15':     "Divisió d'Honor Cadet S15",
  'preferent-cadet-s15':         'Preferent Cadet S15',
  'cadet-primera-divisio-s15':   'Cadet Primera Divisió S15',
  'cadet-segona-divisio-s15':    'Cadet Segona Divisió S15',
  // Infantil S14
  'divisio-honor-infantil-s14':  "Divisió d'Honor Infantil S14",
  'preferent-infantil-s14':      'Preferent Infantil S14',
  'primera-divisio-infantil-s14':'Infantil Primera Divisió S14',
  // Infantil S13
  'divisio-honor-infantil-s13':  "Divisió d'Honor Infantil S13",
  'preferent-infantil-s13':      'Preferent Infantil S13',
  'infantil-primera-divisio-s13':'Infantil Primera Divisió S13',
}

/** Category labels */
export const COMPETITION_CATEGORY: Record<string, string> = {
  'tercera-federacio': 'adult', 'lliga-elit': 'adult',
  'primera-catalana': 'adult', 'segona-catalana': 'adult',
  'tercera-catalana': 'adult', 'quarta-catalana': 'adult',
  'divisio-honor-juvenil': 'juvenil', 'lliga-nacional-juvenil': 'juvenil',
  'preferent-juvenil': 'juvenil', 'primera-divisio-juvenil': 'juvenil',
  'segona-catalana-juvenil': 'juvenil', 'tercera-catalana-juvenil': 'juvenil',
  'divisio-honor-cadet-s16': 'cadet', 'preferent-cadet-s16': 'cadet',
  'cadet-primera-divisio-s16': 'cadet', 'cadet-segona-divisio-s16': 'cadet',
  'divisio-honor-cadet-s15': 'cadet', 'preferent-cadet-s15': 'cadet',
  'cadet-primera-divisio-s15': 'cadet', 'cadet-segona-divisio-s15': 'cadet',
  'divisio-honor-infantil-s14': 'infantil', 'preferent-infantil-s14': 'infantil',
  'primera-divisio-infantil-s14': 'infantil',
  'divisio-honor-infantil-s13': 'infantil', 'preferent-infantil-s13': 'infantil',
  'infantil-primera-divisio-s13': 'infantil',
}

/** Get all matches for a competition from global_referees.json */
export function getCompetitionMatches(slug: string) {
  const refs = loadGlobalReferees()
  return Object.values(refs)
    .filter((m: any) => m.competition === slug)
    .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
    .map((m: any) => ({
      id: m.id,
      date: m.date,
      jornada: m.jornada,
      group: m.group,
      home_team: m.home_team,
      away_team: m.away_team,
      home_score: m.home_score,
      away_score: m.away_score,
      main_referee: Array.isArray(m.referees) ? m.referees[0] : null,
      yellows: (m.yellow_cards || []).filter((c: any) => c.recipient_type === 'player').length,
      reds: (m.red_cards || []).filter((c: any) => c.recipient_type === 'player').length,
    }))
}

/** Get unique teams in a competition with basic stats */
export function getCompetitionTeams(slug: string) {
  const matches = getCompetitionMatches(slug)
  const teams: Record<string, { name: string; slug: string; played: number; goals_for: number; goals_against: number }> = {}

  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue
    const hs = m.home_score as number
    const as_ = m.away_score as number

    if (!teams[m.home_team]) teams[m.home_team] = { name: m.home_team, slug: slugify(m.home_team), played: 0, goals_for: 0, goals_against: 0 }
    if (!teams[m.away_team]) teams[m.away_team] = { name: m.away_team, slug: slugify(m.away_team), played: 0, goals_for: 0, goals_against: 0 }

    teams[m.home_team].played++
    teams[m.home_team].goals_for += hs
    teams[m.home_team].goals_against += as_
    teams[m.away_team].played++
    teams[m.away_team].goals_for += as_
    teams[m.away_team].goals_against += hs
  }

  return Object.values(teams).sort((a, b) => b.played - a.played)
}

/** Get a team page by slug — from team JSON files or derived from referee matches */
export function getTeamBySlug(slug: string) {
  // Try registered team file first
  const teamData = loadTeamData(slug)
  if (teamData) return { type: 'registered' as const, data: teamData }

  // Try to find in global_referees
  const refs = loadGlobalReferees()
  const matches: any[] = []
  for (const m of Object.values(refs) as any[]) {
    const homeSlug = slugify(m.home_team || '')
    const awaySlug = slugify(m.away_team || '')
    if (homeSlug === slug || awaySlug === slug) matches.push(m)
  }
  if (matches.length === 0) return null

  const sample = matches[0]
  const teamName = slugify(sample.home_team) === slug ? sample.home_team : sample.away_team
  return {
    type: 'public' as const,
    data: {
      name: teamName,
      competition: sample.competition,
      matches: matches.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    }
  }
}
