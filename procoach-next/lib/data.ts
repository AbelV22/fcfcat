import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), '..', 'data')
const TEAMS_DIR = path.join(DATA_DIR, 'teams')

/** Convert DD-MM-YYYY → YYYYMMDD so string comparison sorts chronologically */
function dateKey(d: string): string {
  const p = (d || '').split('-')
  return p.length === 3 ? `${p[2]}${p[1]}${p[0]}` : (d || '')
}

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
    const refs = loadGlobalReferees()
    const teams = new Set<string>()
    for (const m of Object.values(refs) as any[]) {
      if (m.home_team) teams.add(m.home_team)
      if (m.away_team) teams.add(m.away_team)
    }
    return teams.size
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
    if (dateKey(m.date || '') > dateKey(r.lastMatch)) r.lastMatch = m.date
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
    dateKey(b.date || '').localeCompare(dateKey(a.date || ''))
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

/** Get all teams list — derived from global_referees.json so all 100+ teams are included */
export function getAllTeams() {
  const refs = loadGlobalReferees()
  const teamsMap: Record<string, {
    slug: string
    name: string
    competition: string
    competitionName: string
    group: string
    season: string
  }> = {}

  for (const m of Object.values(refs) as any[]) {
    for (const teamName of [m.home_team, m.away_team]) {
      if (!teamName) continue
      const slug = slugify(teamName)
      if (!teamsMap[slug]) {
        teamsMap[slug] = {
          slug,
          name: teamName,
          competition: m.competition || '',
          competitionName: COMPETITION_NAMES[m.competition] || m.competition || '',
          group: m.group || '',
          season: m.season || '2526',
        }
      }
    }
  }

  return Object.values(teamsMap).sort((a, b) => a.name.localeCompare(b.name))
}

/** Get recent results from all global_referees matches */
export function getRecentResults(limit = 20) {
  const refs = loadGlobalReferees()
  return Object.values(refs)
    .sort((a: any, b: any) => dateKey(b.date || '').localeCompare(dateKey(a.date || '')))
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

/** Get player discipline stats for a competition */
export function getCompetitionDiscipline(slug: string) {
  const refs = loadGlobalReferees()
  const playerStats: Record<string, {
    name: string
    team: string
    yellows: number
    reds: number
  }> = {}

  const teamStats: Record<string, {
    name: string
    slug: string
    yellows: number
    reds: number
    matches: number
  }> = {}

  for (const match of Object.values(refs)) {
    const m = match as any
    if (m.competition !== slug) continue

    const homeSlug = slugify(m.home_team || '')
    const awaySlug = slugify(m.away_team || '')

    // Init team stats
    if (m.home_team && !teamStats[homeSlug]) teamStats[homeSlug] = { name: m.home_team, slug: homeSlug, yellows: 0, reds: 0, matches: 0 }
    if (m.away_team && !teamStats[awaySlug]) teamStats[awaySlug] = { name: m.away_team, slug: awaySlug, yellows: 0, reds: 0, matches: 0 }
    if (m.home_score !== null && m.away_score !== null) {
      if (teamStats[homeSlug]) teamStats[homeSlug].matches++
      if (teamStats[awaySlug]) teamStats[awaySlug].matches++
    }

    const allCards = [...(m.yellow_cards || []), ...(m.red_cards || [])]
    for (const card of allCards) {
      if (card.recipient_type !== 'player') continue
      const playerName = card.player
      if (!playerName) continue
      const teamName = card.team === 'home' ? m.home_team : m.away_team
      const tSlug = card.team === 'home' ? homeSlug : awaySlug

      if (!playerStats[playerName]) {
        playerStats[playerName] = { name: playerName, team: teamName, yellows: 0, reds: 0 }
      }
      if (card.card_type === 'yellow' && !card.is_double_yellow_dismissal) {
        playerStats[playerName].yellows++
        if (teamStats[tSlug]) teamStats[tSlug].yellows++
      } else if (card.card_type === 'red' || card.is_double_yellow_dismissal) {
        playerStats[playerName].reds++
        if (teamStats[tSlug]) teamStats[tSlug].reds++
      }
    }
  }

  const players = Object.values(playerStats)
    .sort((a, b) => (b.yellows * 1 + b.reds * 5) - (a.yellows * 1 + a.reds * 5))

  const teams = Object.values(teamStats)
    .sort((a, b) => (b.yellows + b.reds * 3) - (a.yellows + a.reds * 3))

  // "Risc de sanció" = 4+ yellows without a red
  const riskPlayers = players.filter(p => p.yellows >= 4 && p.yellows % 4 === 0)

  return { players, teams, riskPlayers }
}

/** Get team standings for a competition */
export function getCompetitionStandings(slug: string) {
  const refs = loadGlobalReferees()
  const teams: Record<string, {
    name: string
    slug: string
    played: number
    wins: number
    draws: number
    losses: number
    goals_for: number
    goals_against: number
    points: number
    yellows: number
    reds: number
  }> = {}

  for (const match of Object.values(refs)) {
    const m = match as any
    if (m.competition !== slug) continue
    if (m.home_score === null || m.away_score === null) continue

    const hs = m.home_score as number
    const as_ = m.away_score as number

    const addTeam = (name: string, isHome: boolean) => {
      const ts = slugify(name)
      if (!teams[ts]) {
        teams[ts] = { name, slug: ts, played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, points: 0, yellows: 0, reds: 0 }
      }
      const t = teams[ts]
      const gf = isHome ? hs : as_
      const ga = isHome ? as_ : hs
      t.played++
      t.goals_for += gf
      t.goals_against += ga
      if (gf > ga) { t.wins++; t.points += 3 }
      else if (gf === ga) { t.draws++; t.points += 1 }
      else t.losses++
    }

    addTeam(m.home_team, true)
    addTeam(m.away_team, false)
  }

  return Object.values(teams).sort((a, b) =>
    b.points - a.points ||
    (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against) ||
    b.goals_for - a.goals_for
  )
}

/** Get referee ranking for a specific competition */
export function getCompetitionRefereeRanking(slug: string) {
  const refs = loadGlobalReferees()
  const refStats: Record<string, {
    name: string
    slug: string
    matches: number
    yellows: number
    reds: number
  }> = {}

  for (const match of Object.values(refs)) {
    const m = match as any
    if (m.competition !== slug) continue
    if (!Array.isArray(m.referees) || m.referees.length === 0) continue

    const mainRef = m.referees[0]
    const rs = slugify(mainRef)

    if (!refStats[rs]) {
      refStats[rs] = { name: mainRef, slug: rs, matches: 0, yellows: 0, reds: 0 }
    }

    refStats[rs].matches++
    refStats[rs].yellows += (m.yellow_cards || []).filter((c: any) => c.recipient_type === 'player').length
    refStats[rs].reds += (m.red_cards || []).filter((c: any) => c.recipient_type === 'player').length
  }

  return Object.values(refStats)
    .map(r => ({
      ...r,
      yellows_per_match: r.matches > 0 ? +(r.yellows / r.matches).toFixed(1) : 0,
      reds_per_match: r.matches > 0 ? +(r.reds / r.matches).toFixed(2) : 0,
    }))
    .sort((a, b) => b.matches - a.matches)
}

/** Get all matches for a competition from global_referees.json */
export function getCompetitionMatches(slug: string) {
  const refs = loadGlobalReferees()
  return Object.values(refs)
    .filter((m: any) => m.competition === slug)
    .sort((a: any, b: any) => dateKey(b.date || '').localeCompare(dateKey(a.date || '')))
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
      matches: matches.sort((a, b) => dateKey(b.date || '').localeCompare(dateKey(a.date || ''))),
    }
  }
}

/** Get top scorers for a competition — derived from goals stored in global_referees.json */
export function getCompetitionScorers(slug: string) {
  const refs = loadGlobalReferees()
  const playerMap: Record<string, {
    name: string
    team: string
    goals: number
    matches: Set<string>
  }> = {}

  for (const match of Object.values(refs)) {
    const m = match as any
    if (m.competition !== slug) continue
    if (!Array.isArray(m.goals) || m.goals.length === 0) continue

    const matchKey = m.id || `${m.home_team}-${m.away_team}-J${m.jornada}`

    for (const goal of m.goals) {
      const name: string = goal.player
      if (!name || name.length < 2) continue
      // Skip own goals (player name is empty or "OG" in some notations)
      if (name.toUpperCase() === 'OG' || name.toUpperCase().includes('PROPIA')) continue

      const team = goal.team === 'home' ? (m.home_team || '') : (m.away_team || '')

      if (!playerMap[name]) {
        playerMap[name] = { name, team, goals: 0, matches: new Set() }
      }
      playerMap[name].goals++
      playerMap[name].matches.add(matchKey)
    }
  }

  return Object.values(playerMap)
    .map(p => ({
      name: p.name,
      team: p.team,
      goals: p.goals,
      matches: p.matches.size,
      goals_per_match: p.matches.size > 0 ? +(p.goals / p.matches.size).toFixed(2) : 0,
    }))
    .sort((a, b) => b.goals - a.goals || b.matches - a.matches)
}

/** Get full calendar (past + future) for a competition from team JSON files.
 *  Team JSON `matches` arrays come from the FCF calendar page and include all
 *  jornadas, played and unplayed alike. We aggregate across all team files that
 *  match the competition, deduplicating by jornada+teams.
 */
export function getCompetitionCalendar(slug: string) {
  const seen = new Set<string>()
  const allMatches: any[] = []

  let files: string[] = []
  try {
    files = fs.readdirSync(TEAMS_DIR).filter(f => f.endsWith('.json'))
  } catch {
    return []
  }

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(TEAMS_DIR, file), 'utf-8')
      const data = JSON.parse(raw)
      const meta = data.meta || {}
      if (meta.competition !== slug) continue
      if (!Array.isArray(data.matches)) continue

      for (const m of data.matches) {
        const key = `J${m.jornada}-${m.home_team}-${m.away_team}`
        if (seen.has(key)) continue
        seen.add(key)
        allMatches.push({
          jornada: m.jornada,
          date: m.date || '',
          time: m.time || '',
          home_team: m.home_team,
          away_team: m.away_team,
          home_score: m.home_score ?? null,
          away_score: m.away_score ?? null,
          status: m.status || '',
          acta_url: m.acta_url || '',
          venue: m.venue || '',
          group: meta.group || '',
        })
      }
    } catch {
      // skip malformed files
    }
  }

  return allMatches.sort((a, b) => {
    if (a.jornada !== b.jornada) return a.jornada - b.jornada
    return dateKey(a.date).localeCompare(dateKey(b.date))
  })
}

/** Get the next unplayed jornada number for a competition */
export function getCompetitionNextJornada(slug: string): number | null {
  const calendar = getCompetitionCalendar(slug)
  const unplayed = calendar.filter(m => m.home_score === null || m.away_score === null)
  if (unplayed.length === 0) return null
  return Math.min(...unplayed.map(m => m.jornada as number))
}

/** Get official FCF standings from team JSON files (more accurate than acta-computed) */
export function getCompetitionFCFStandings(slug: string) {
  let files: string[] = []
  try {
    files = fs.readdirSync(TEAMS_DIR).filter(f => f.endsWith('.json'))
  } catch {
    return []
  }

  // Use the first team file we find for this competition
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(TEAMS_DIR, file), 'utf-8')
      const data = JSON.parse(raw)
      const meta = data.meta || {}
      if (meta.competition !== slug) continue
      if (!Array.isArray(data.standings) || data.standings.length === 0) continue

      // Return FCF standings with slug added
      return data.standings.map((s: any) => ({
        ...s,
        slug: s.team_slug || slugify(s.name || ''),
      }))
    } catch {
      // skip
    }
  }
  return []
}
