/**
 * team-report.ts
 * Full analytics engine for coach team reports.
 * Primary source: team JSON files (actas, team_intelligence, rival_intelligence).
 * Fallback: global_referees.json (basic match + card data only).
 */
import fs from 'fs'
import path from 'path'
import { loadGlobalReferees, slugify } from './data'

const TEAMS_DIR = path.join(process.cwd(), '..', 'data', 'teams')

/** Convert DD-MM-YYYY → YYYYMMDD for correct chronological string sort */
function dateKey(d: string): string {
  const p = (d || '').split('-')
  return p.length === 3 ? `${p[2]}${p[1]}${p[0]}` : (d || '')
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerStat {
  name: string
  appearances: number
  goals: number
  yellow_cards: number
  red_cards: number
  minutes_played: number
  risk: boolean
}

export interface Sanction {
  player: string
  matches_suspended: number
  reason: string
  article: string
}

export interface GoalBucket {
  label: string
  scored: number
  conceded: number
}

export interface MatchResult {
  date: string
  jornada: number
  opponent: string
  opponentSlug: string
  isHome: boolean
  goalsFor: number | null
  goalsAgainst: number | null
  result: 'W' | 'D' | 'L' | null
  referee: string | null
  venue?: string
}

export interface SplitRecord {
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  points: number
}

export type FieldSizeCategory = 'petit' | 'mig' | 'gran'

export interface FieldSizeRecord {
  category: FieldSizeCategory
  label: string
  areaRange: string
  plays: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  exampleVenue?: string
  exampleDims?: string
}

export interface StandingRow {
  position: number
  name: string
  slug: string
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  points: number
  home_won: number
  home_drawn: number
  home_lost: number
  away_won: number
  away_drawn: number
  away_lost: number
}

export interface RivalReport {
  name: string
  slug: string
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  points: number
  position: number | null
  home: SplitRecord
  away: SplitRecord
  players: PlayerStat[]
  goalBuckets: GoalBucket[]
  form: MatchResult[]
  topScorers: PlayerStat[]
  mostMinutes: PlayerStat[]
  apercibits: PlayerStat[]
  awayByFieldSize: FieldSizeRecord[]
}

export interface TeamReport {
  name: string
  slug: string
  competition: string
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  points: number
  position: number | null
  home: SplitRecord
  away: SplitRecord
  players: PlayerStat[]
  goalBuckets: GoalBucket[]
  form: MatchResult[]
  nextMatch: (MatchResult & { venue?: string; time?: string; referees?: string[] }) | null
  rival: RivalReport | null
  standings: StandingRow[]
  headToHead: MatchResult[]
  sanctions: Sanction[]
  hasDetailedData: boolean  // true when team JSON with actas is available
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKETS = [
  { label: "1–15'", min: 0, max: 15 },
  { label: "16–30'", min: 16, max: 30 },
  { label: "31–45'", min: 31, max: 45 },
  { label: "46–60'", min: 46, max: 60 },
  { label: "61–75'", min: 61, max: 75 },
  { label: "76–90'", min: 76, max: 999 },
]

// Keys in goals_by_period from JSON scraper
const PERIOD_KEYS = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMin(m: string | number): number {
  const s = String(m || '0')
  const match = s.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Convert pre-computed goals_by_period object from JSON to GoalBucket[].
 * Keys like "0-15", "16-30", etc.
 */
function mapGoalsByPeriod(gbp: Record<string, { scored: number; conceded: number }>): GoalBucket[] {
  return BUCKETS.map((b, i) => {
    const key = PERIOD_KEYS[i]
    const entry = gbp[key] || { scored: 0, conceded: 0 }
    return { label: b.label, scored: entry.scored || 0, conceded: entry.conceded || 0 }
  })
}

/**
 * Compute goal buckets by scanning match goals arrays.
 * Only works when matches have a `goals` array (team JSON actas).
 */
function computeGoalBuckets(matches: any[], teamSlug: string): GoalBucket[] {
  const buckets = BUCKETS.map(b => ({ label: b.label, scored: 0, conceded: 0, min: b.min, max: b.max }))

  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue
    const isHome = slugify(m.home_team || '') === teamSlug
    const side = isHome ? 'home' : 'away'
    const opSide = isHome ? 'away' : 'home'

    for (const g of m.goals || []) {
      const min = parseMin(g.minute)
      const bucket = buckets.find(b => min >= b.min && min <= b.max)
      if (!bucket) continue
      if (g.team === side) bucket.scored++
      else if (g.team === opSide) bucket.conceded++
    }
  }

  return buckets.map(({ label, scored, conceded }) => ({ label, scored, conceded }))
}

/**
 * Compute player stats from match actas (lineups + goals + cards + subs).
 * Only meaningful when matches have home_lineup/away_lineup arrays.
 */
function computePlayers(
  matches: any[],
  teamSlug: string,
): Record<string, Omit<PlayerStat, 'name' | 'risk'>> {
  const players: Record<string, Omit<PlayerStat, 'name' | 'risk'>> = {}

  const ensure = (name: string) => {
    if (!players[name]) {
      players[name] = { appearances: 0, goals: 0, yellow_cards: 0, red_cards: 0, minutes_played: 0 }
    }
  }

  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue
    const isHome = slugify(m.home_team || '') === teamSlug
    const side = isHome ? 'home' : 'away'

    const lineup: any[] = isHome ? (m.home_lineup || []) : (m.away_lineup || [])
    const subs: any[] = (m.substitutions || []).filter((s: any) => s.team === side)
    const goals: any[] = (m.goals || []).filter((g: any) => g.team === side)
    const yellows: any[] = (m.yellow_cards || []).filter(
      (c: any) => c.team === side && c.recipient_type === 'player'
    )
    const reds: any[] = (m.red_cards || []).filter(
      (c: any) => c.team === side && c.recipient_type === 'player'
    )

    // Build substitution maps
    const outAt: Record<string, number> = {}
    const inAt: Record<string, number> = {}
    for (const s of subs) {
      outAt[s.player_out] = parseMin(s.minute)
      inAt[s.player_in] = parseMin(s.minute)
    }

    // Starters
    for (const p of lineup) {
      const name = p.name
      if (!name) continue
      ensure(name)
      players[name].appearances++
      players[name].minutes_played += outAt[name] !== undefined ? outAt[name] : 90
    }

    // Substitutes who came on
    for (const [name, min] of Object.entries(inAt)) {
      if (!name) continue
      const alreadyStarted = lineup.some((p: any) => p.name === name)
      if (!alreadyStarted) {
        ensure(name)
        players[name].appearances++
        players[name].minutes_played += Math.max(0, 90 - (min as number))
      }
    }

    // Goals
    for (const g of goals) {
      if (!g.player) continue
      ensure(g.player)
      players[g.player].goals++
    }

    // Yellow cards
    for (const c of yellows) {
      if (!c.player) continue
      ensure(c.player)
      if (!c.is_double_yellow_dismissal) {
        players[c.player].yellow_cards++
      }
    }

    // Red cards (direct + double-yellow dismissal)
    for (const c of reds) {
      if (!c.player) continue
      ensure(c.player)
      players[c.player].red_cards++
      if (c.is_double_yellow_dismissal) {
        players[c.player].yellow_cards++
      }
    }
  }

  return players
}

function computeRecord(matches: any[], teamSlug: string, filter?: 'home' | 'away'): SplitRecord {
  let played = 0, wins = 0, draws = 0, losses = 0, gf = 0, ga = 0

  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue
    const isHome = slugify(m.home_team || '') === teamSlug
    if (filter === 'home' && !isHome) continue
    if (filter === 'away' && isHome) continue

    const myG = isHome ? m.home_score : m.away_score
    const theirG = isHome ? m.away_score : m.home_score
    played++
    gf += myG
    ga += theirG
    if (myG > theirG) wins++
    else if (myG === theirG) draws++
    else losses++
  }

  return { played, wins, draws, losses, gf, ga, points: wins * 3 + draws }
}

function matchToResult(m: any, teamSlug: string): MatchResult {
  const isHome = slugify(m.home_team || '') === teamSlug
  const opponent = isHome ? m.away_team : m.home_team
  const myG = m.home_score !== null ? (isHome ? m.home_score : m.away_score) : null
  const theirG = m.away_score !== null ? (isHome ? m.away_score : m.home_score) : null

  // Referee can be in array or string
  let referee: string | null = null
  if (Array.isArray(m.referees) && m.referees.length > 0) {
    referee = m.referees[0]
  } else if (typeof m.referee === 'string' && m.referee) {
    referee = m.referee
  }

  return {
    date: m.date || '',
    jornada: m.jornada || 0,
    opponent: opponent || '',
    opponentSlug: slugify(opponent || ''),
    isHome,
    goalsFor: myG,
    goalsAgainst: theirG,
    result: myG !== null && theirG !== null ? (myG > theirG ? 'W' : myG === theirG ? 'D' : 'L') : null,
    referee,
    venue: m.venue || '',
  }
}

// ─── Load standings from team JSON ──────────────────────────────────────────

function parseStandings(raw: any[]): StandingRow[] {
  return raw.map((s: any, idx: number) => ({
    position: s.position || idx + 1,
    name: s.name || '',
    slug: s.team_slug || slugify(s.name || ''),
    played: s.played || 0,
    wins: s.won || 0,
    draws: s.drawn || 0,
    losses: s.lost || 0,
    gf: s.goals_for || 0,
    ga: s.goals_against || 0,
    points: s.points || 0,
    home_won: s.home_won || 0,
    home_drawn: s.home_drawn || 0,
    home_lost: s.home_lost || 0,
    away_won: s.away_won || 0,
    away_drawn: s.away_drawn || 0,
    away_lost: s.away_lost || 0,
  }))
}

function loadTeamStandings(teamSlug: string): StandingRow[] {
  try {
    const files = fs.readdirSync(TEAMS_DIR).filter(f => f.endsWith('.json'))
    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, file), 'utf-8'))
      if (!raw.standings?.length) continue
      const hasTeam = raw.standings.some(
        (s: any) => s.team_slug === teamSlug || slugify(s.name || '') === teamSlug
      )
      if (!hasTeam) continue
      return parseStandings(raw.standings)
    }
  } catch {}
  return []
}

/**
 * For teams without their own JSON file, find the richest available JSON
 * from the same competition+group. Actas in a group JSON contain ALL matches
 * in that group (all 16 teams), so we can derive stats for any team.
 */
function findGroupData(competition: string, group: string): {
  actas: any[]
  standings: StandingRow[]
  nextMatchFromRegistry: null
} | null {
  if (!competition || !group) return null
  try {
    const files = fs.readdirSync(TEAMS_DIR).filter((f: string) => f.endsWith('.json'))
    let bestActas: any[] = []
    let bestStandings: any[] = []

    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, file), 'utf-8'))
        if (data.meta?.competition !== competition || data.meta?.group !== group) continue
        const actas = data.actas || []
        if (actas.length > bestActas.length) {
          bestActas = actas
          bestStandings = data.standings || []
        }
      } catch {}
    }

    if (bestActas.length === 0) return null
    return {
      actas: bestActas,
      standings: parseStandings(bestStandings),
      nextMatchFromRegistry: null,
    }
  } catch {
    return null
  }
}

// ─── Field size analytics ─────────────────────────────────────────────────────

/** Normalize a string for fuzzy matching: lowercase, no accents, spaces only */
function normStr(s: string): string {
  return (s || '').toLowerCase()
    .replace(/[àáâãä]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n').replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

type FieldDims = { length_m: number; width_m: number; field_name: string }

// Lazy-loaded singleton
let _fieldLookup: {
  byTeamSlug: Record<string, FieldDims>
  byVenuePrefix: Array<{ key: string; dims: FieldDims }>
} | null = null

function getFieldLookup() {
  if (_fieldLookup) return _fieldLookup
  const fieldsPath = path.join(process.cwd(), '..', 'data', 'fields.json')
  try {
    const raw = JSON.parse(fs.readFileSync(fieldsPath, 'utf-8'))
    const byTeamSlug: Record<string, FieldDims> = {}
    const byVenuePrefix: Array<{ key: string; dims: FieldDims }> = []

    // team_venues: team name → dims
    for (const [team, v] of Object.entries(raw.team_venues as Record<string, any>)) {
      if (v.length_m && v.width_m) {
        byTeamSlug[slugify(team)] = {
          length_m: v.length_m,
          width_m: v.width_m,
          field_name: v.field_name || team,
        }
      }
    }
    // fields[].fcf_venue → dims (for prefix-matching acta venue strings)
    for (const f of (raw.fields as any[])) {
      if (f.length_m && f.width_m && f.fcf_venue) {
        byVenuePrefix.push({
          key: normStr(f.fcf_venue),
          dims: { length_m: f.length_m, width_m: f.width_m, field_name: f.name || f.fcf_venue },
        })
      }
    }
    _fieldLookup = { byTeamSlug, byVenuePrefix }
  } catch {
    _fieldLookup = { byTeamSlug: {}, byVenuePrefix: [] }
  }
  return _fieldLookup
}

function lookupFieldDims(homeTeam: string, venue: string): FieldDims | null {
  const lk = getFieldLookup()
  // 1. Home team slug → confirmed field dimensions
  const ts = slugify(homeTeam)
  if (lk.byTeamSlug[ts]) return lk.byTeamSlug[ts]
  // 2. Acta venue string starts with normalized fcf_venue (address stripped by double-space in acta)
  if (venue) {
    const vn = normStr(venue)
    for (const { key, dims } of lk.byVenuePrefix) {
      if (vn.startsWith(key)) return dims
    }
  }
  return null
}

function categorizeArea(length_m: number, width_m: number): FieldSizeCategory {
  const area = length_m * width_m
  if (area < 5500) return 'petit'   // e.g. 92×50=4600, 96×52=4992
  if (area < 6300) return 'mig'     // e.g. 90×60=5400, 99×59=5841, 100×60=6000
  return 'gran'                      // e.g. 101×66=6666, 104×63=6552
}

function computeAwayByFieldSize(matches: any[], rivalSlug: string): FieldSizeRecord[] {
  type Cat = { plays: number; wins: number; draws: number; losses: number; gf: number; ga: number; venue: string; dims: string }
  const cats: Record<FieldSizeCategory, Cat> = {
    petit: { plays: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, venue: '', dims: '' },
    mig:   { plays: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, venue: '', dims: '' },
    gran:  { plays: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, venue: '', dims: '' },
  }

  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue
    if (slugify(m.home_team || '') === rivalSlug) continue  // skip home matches
    const fd = lookupFieldDims(m.home_team || '', m.venue || '')
    if (!fd) continue

    const cat = categorizeArea(fd.length_m, fd.width_m)
    const r = cats[cat]
    r.plays++
    r.gf += m.away_score
    r.ga += m.home_score
    if (m.away_score > m.home_score) r.wins++
    else if (m.away_score === m.home_score) r.draws++
    else r.losses++
    if (!r.venue) r.venue = fd.field_name
    if (!r.dims) r.dims = `${fd.length_m}×${fd.width_m} m`
  }

  const META: Record<FieldSizeCategory, { label: string; areaRange: string }> = {
    petit: { label: 'Camp Petit', areaRange: '< 5.500 m²'       },
    mig:   { label: 'Camp Mitjà', areaRange: '5.500 – 6.300 m²' },
    gran:  { label: 'Camp Gran',  areaRange: '> 6.300 m²'       },
  }

  return (['petit', 'mig', 'gran'] as FieldSizeCategory[]).reduce<FieldSizeRecord[]>((out, cat) => {
    const r = cats[cat]
    if (r.plays === 0) return out
    return [...out, {
      category: cat,
      label: META[cat].label,
      areaRange: META[cat].areaRange,
      plays: r.plays,
      wins: r.wins,
      draws: r.draws,
      losses: r.losses,
      gf: r.gf,
      ga: r.ga,
      exampleVenue: r.venue || undefined,
      exampleDims:  r.dims  || undefined,
    }]
  }, [])
}

// ─── Build rival report from rival_intelligence (pre-computed in JSON) ───────

function buildRivalFromIntelligence(
  ri: any,
  rivalName: string,
  rivalSlug: string,
  allActas: any[],        // all actas (to compute home/away split + form)
  standings: StandingRow[],
): RivalReport {
  const wins = ri.wins || 0
  const draws = ri.draws || 0
  const losses = ri.losses || 0
  const played = wins + draws + losses

  // Filter rival's played matches from actas for home/away split and form
  const rivalMatches = allActas
    .filter(m => {
      const hs = slugify(m.home_team || '')
      const as_ = slugify(m.away_team || '')
      return hs === rivalSlug || as_ === rivalSlug
    })
    .filter(m => m.home_score !== null && m.away_score !== null)
    .sort((a, b) => dateKey(b.date || '').localeCompare(dateKey(a.date || '')))

  const home = computeRecord(rivalMatches, rivalSlug, 'home')
  const away = computeRecord(rivalMatches, rivalSlug, 'away')

  // Players from rival_intelligence
  const players: PlayerStat[] = Object.entries(ri.players as Record<string, any>)
    .map(([name, s]) => ({
      name,
      appearances: s.appearances || 0,
      goals: s.goals || 0,
      yellow_cards: s.yellow_cards || 0,
      red_cards: s.red_cards || 0,
      minutes_played: s.minutes_played || 0,
      risk: (s.yellow_cards || 0) >= 4 && (s.yellow_cards || 0) % 4 === 0,
    }))
    .sort((a, b) => b.appearances - a.appearances)

  // Goal timing from pre-computed data
  const goalBuckets = mapGoalsByPeriod(ri.goals_by_period || {})

  // Recent form (last 5 played, most recent first)
  const form: MatchResult[] = rivalMatches.slice(0, 5).map(m => matchToResult(m, rivalSlug))

  const standingRow = standings.find(s => s.slug === rivalSlug || slugify(s.name) === rivalSlug)

  return {
    name: ri.team_name || rivalName,
    slug: rivalSlug,
    played,
    wins,
    draws,
    losses,
    gf: ri.goals_scored || 0,
    ga: ri.goals_conceded || 0,
    points: wins * 3 + draws,
    position: standingRow?.position ?? null,
    home,
    away,
    players,
    goalBuckets,
    form,
    topScorers: [...players].sort((a, b) => b.goals - a.goals).filter(p => p.goals > 0).slice(0, 5),
    mostMinutes: [...players].sort((a, b) => b.minutes_played - a.minutes_played).filter(p => p.minutes_played > 0).slice(0, 5),
    apercibits: players.filter(p => p.risk),
    awayByFieldSize: computeAwayByFieldSize(rivalMatches, rivalSlug),
  }
}

// ─── Build rival report from global_referees (fallback) ──────────────────────

function buildRivalReport(
  rivalSlug: string,
  allMatches: any[],
  mySlug: string,
  standings: StandingRow[],
): RivalReport | null {
  const rivalMatches = allMatches
    .filter(m => {
      const hs = slugify(m.home_team || '')
      const as_ = slugify(m.away_team || '')
      return hs === rivalSlug || as_ === rivalSlug
    })
    .sort((a, b) => dateKey(a.date || '').localeCompare(dateKey(b.date || '')))

  if (rivalMatches.length === 0) return null

  const sample = rivalMatches[0]
  const rivalName = slugify(sample.home_team || '') === rivalSlug ? sample.home_team : sample.away_team

  const playedMatches = rivalMatches.filter(m => m.home_score !== null && m.away_score !== null)
  const overall = computeRecord(rivalMatches, rivalSlug)
  const home = computeRecord(rivalMatches, rivalSlug, 'home')
  const away = computeRecord(rivalMatches, rivalSlug, 'away')

  const rawPlayers = computePlayers(playedMatches, rivalSlug)
  const players: PlayerStat[] = Object.entries(rawPlayers)
    .map(([name, s]) => ({ name, ...s, risk: s.yellow_cards >= 4 && s.yellow_cards % 4 === 0 }))
    .sort((a, b) => b.appearances - a.appearances)

  // global_referees has no goals data → all-zero buckets
  const goalBuckets = computeGoalBuckets(playedMatches, rivalSlug)

  const form: MatchResult[] = [...playedMatches]
    .sort((a, b) => dateKey(b.date || '').localeCompare(dateKey(a.date || '')))
    .slice(0, 5)
    .map(m => matchToResult(m, rivalSlug))

  const standingRow = standings.find(s => s.slug === rivalSlug || slugify(s.name) === rivalSlug)
  const position = standingRow?.position ?? null

  return {
    name: rivalName || '',
    slug: rivalSlug,
    ...overall,
    position,
    home,
    away,
    players,
    goalBuckets,
    form,
    topScorers: [...players].sort((a, b) => b.goals - a.goals).filter(p => p.goals > 0).slice(0, 5),
    mostMinutes: [...players].sort((a, b) => b.minutes_played - a.minutes_played).slice(0, 5),
    apercibits: players.filter(p => p.risk),
    awayByFieldSize: computeAwayByFieldSize(rivalMatches, rivalSlug),
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function buildTeamReport(teamSlug: string): TeamReport | null {
  const refs = loadGlobalReferees()
  const allGlobalMatches = Object.values(refs) as any[]

  // ── 1. Load team JSON (direct filename, or scan all by meta.team slug) ──────
  let teamJsonData: any = null
  let resolvedSlug = teamSlug
  try {
    const directFile = path.join(TEAMS_DIR, `${teamSlug}.json`)
    if (fs.existsSync(directFile)) {
      teamJsonData = JSON.parse(fs.readFileSync(directFile, 'utf-8'))
    } else {
      const files = fs.readdirSync(TEAMS_DIR).filter((f: string) => f.endsWith('.json'))
      for (const file of files) {
        try {
          const candidate = JSON.parse(fs.readFileSync(path.join(TEAMS_DIR, file), 'utf-8'))
          if (candidate.meta?.team && slugify(candidate.meta.team) === teamSlug) {
            teamJsonData = candidate
            break
          }
        } catch {}
      }
    }
    if (teamJsonData?.meta?.team) {
      resolvedSlug = slugify(teamJsonData.meta.team)
    }
  } catch {}

  // ── 2. Build match arrays ──────────────────────────────────────────────────
  // Priority: own JSON actas > cross-group JSON actas > global_referees
  let allActas: any[] = []         // all matches in the group (for rival stats too)
  let hasActasData = false          // true when we have lineup/goals/subs in matches
  let hasOwnJson = false            // true when team has its OWN JSON (full intelligence)
  let crossGroupStandings: StandingRow[] = []

  if (teamJsonData?.actas?.length > 0) {
    allActas = teamJsonData.actas as any[]
    hasActasData = true
    hasOwnJson = !!(teamJsonData.team_intelligence)
  } else {
    // No own JSON — find the competition/group from global_referees to look for group data
    const sampleGlobal = allGlobalMatches.find(m =>
      slugify(m.home_team || '') === resolvedSlug ||
      slugify(m.away_team || '') === resolvedSlug
    )
    if (sampleGlobal) {
      const comp = sampleGlobal.competition || ''
      const grp = sampleGlobal.group || ''
      const groupData = findGroupData(comp, grp)
      if (groupData) {
        allActas = groupData.actas
        crossGroupStandings = groupData.standings
        hasActasData = true
      }
    }
  }

  const hasDetailedData = hasActasData

  // Build this team's match list
  let allTeamMatches: any[]
  let playedMatches: any[]

  if (hasActasData && allActas.length > 0) {
    allTeamMatches = allActas
      .filter(m =>
        slugify(m.home_team || '') === resolvedSlug ||
        slugify(m.away_team || '') === resolvedSlug
      )
      .sort((a, b) => dateKey(a.date || '').localeCompare(dateKey(b.date || '')))
    playedMatches = allTeamMatches.filter(m => m.home_score !== null && m.away_score !== null)

    // Fallback: if actas don't contain this team's matches, use global_referees
    if (allTeamMatches.length === 0) {
      allTeamMatches = allGlobalMatches
        .filter(m => slugify(m.home_team || '') === resolvedSlug || slugify(m.away_team || '') === resolvedSlug)
        .sort((a, b) => dateKey(a.date || '').localeCompare(dateKey(b.date || '')))
      playedMatches = allTeamMatches.filter(m => m.home_score !== null && m.away_score !== null)
    }
  } else {
    allTeamMatches = allGlobalMatches
      .filter(m => {
        const hs = slugify(m.home_team || '')
        const as_ = slugify(m.away_team || '')
        return hs === resolvedSlug || as_ === resolvedSlug
      })
      .sort((a, b) => dateKey(a.date || '').localeCompare(dateKey(b.date || '')))
    playedMatches = allTeamMatches.filter(m => m.home_score !== null && m.away_score !== null)
  }

  if (allTeamMatches.length === 0) return null

  // Determine team name and competition
  const sample = allTeamMatches[0]
  const teamName = teamJsonData?.meta?.team ||
    (slugify(sample.home_team || '') === resolvedSlug ? sample.home_team : sample.away_team) || ''
  const competition = teamJsonData?.meta?.competition || sample.competition || ''

  // ── 3. Overall record ──────────────────────────────────────────────────────
  // Prefer pre-computed values from team_intelligence (more accurate, includes latest matches)
  let overall: SplitRecord
  const ti = teamJsonData?.team_intelligence
  if (ti && typeof ti.wins === 'number') {
    const wins = ti.wins || 0
    const draws = ti.draws || 0
    const losses = ti.losses || 0
    overall = {
      played: wins + draws + losses,
      wins,
      draws,
      losses,
      gf: ti.goals_scored || 0,
      ga: ti.goals_conceded || 0,
      points: wins * 3 + draws,
    }
  } else {
    overall = computeRecord(allTeamMatches, resolvedSlug)
  }

  const home = computeRecord(playedMatches, resolvedSlug, 'home')
  const away = computeRecord(playedMatches, resolvedSlug, 'away')

  // ── 4. Player stats ────────────────────────────────────────────────────────
  // Prefer team_intelligence.players (pre-computed with correct appearances/goals/minutes)
  let players: PlayerStat[]
  if (ti?.players) {
    players = Object.entries(ti.players as Record<string, any>)
      .map(([name, s]) => ({
        name,
        appearances: s.appearances || 0,
        goals: s.goals || 0,
        yellow_cards: s.yellow_cards || 0,
        red_cards: s.red_cards || 0,
        minutes_played: s.minutes_played || 0,
        risk: (s.yellow_cards || 0) >= 4 && (s.yellow_cards || 0) % 4 === 0,
      }))
      .sort((a, b) => b.appearances - a.appearances)
  } else {
    const rawPlayers = computePlayers(playedMatches, resolvedSlug)
    players = Object.entries(rawPlayers)
      .map(([name, s]) => ({ name, ...s, risk: s.yellow_cards >= 4 && s.yellow_cards % 4 === 0 }))
      .sort((a, b) => b.appearances - a.appearances)
  }

  // ── 5. Goal timing ─────────────────────────────────────────────────────────
  // Prefer pre-computed goals_by_period (global_referees has NO goals data)
  let goalBuckets: GoalBucket[]
  if (ti?.goals_by_period) {
    goalBuckets = mapGoalsByPeriod(ti.goals_by_period)
  } else {
    goalBuckets = computeGoalBuckets(playedMatches, resolvedSlug)
  }

  // ── 6. Form (recent results) ───────────────────────────────────────────────
  const form: MatchResult[] = [...playedMatches]
    .sort((a, b) => dateKey(b.date || '').localeCompare(dateKey(a.date || '')))
    .slice(0, 8)
    .map(m => matchToResult(m, resolvedSlug))

  // ── 7. Standings ───────────────────────────────────────────────────────────
  // Try own JSON standings, then cross-group standings
  let standings = loadTeamStandings(resolvedSlug)
  if (standings.length === 0 && crossGroupStandings.length > 0) {
    standings = crossGroupStandings
  }
  const myStanding = standings.find(s => s.slug === resolvedSlug || slugify(s.name) === resolvedSlug)
  const position = myStanding?.position ?? null

  // ── 8. Next match + rival ──────────────────────────────────────────────────
  // Source for rival stats: prefer actas (has lineups/goals), fallback to global_referees
  const rivalMatchSource = hasActasData && allActas.length > 0 ? allActas : allGlobalMatches

  let nextMatch: TeamReport['nextMatch'] = null
  let rival: RivalReport | null = null

  if (teamJsonData?.next_match) {
    const nm = teamJsonData.next_match
    const rivalName = nm.rival_name || ''
    const rivalSlug = slugify(rivalName)
    nextMatch = {
      date: nm.date || '',
      jornada: nm.jornada || 0,
      opponent: rivalName,
      opponentSlug: rivalSlug,
      isHome: nm.is_home ?? true,
      goalsFor: null,
      goalsAgainst: null,
      result: null,
      referee: nm.referee || (Array.isArray(nm.referees) && nm.referees[0]) || null,
      venue: nm.venue || '',
      time: nm.time || '',
      referees: Array.isArray(nm.referees) ? nm.referees : (nm.referee ? [nm.referee] : []),
    }

    // Rival: prefer rival_intelligence (pre-computed). Fallback: compute from actas/global.
    if (hasOwnJson && teamJsonData.rival_intelligence?.players && rivalSlug) {
      rival = buildRivalFromIntelligence(
        teamJsonData.rival_intelligence,
        rivalName,
        rivalSlug,
        rivalMatchSource,
        standings,
      )
    } else {
      rival = buildRivalReport(rivalSlug, rivalMatchSource, resolvedSlug, standings)
    }
  } else {
    // No next_match in JSON — find first unplayed match from allTeamMatches or global_referees
    // Also check global_referees for unplayed (may have future rounds not in actas)
    const allForNextSearch = [
      ...allTeamMatches,
      ...allGlobalMatches.filter(m =>
        (slugify(m.home_team || '') === resolvedSlug || slugify(m.away_team || '') === resolvedSlug) &&
        !allTeamMatches.some(t => t.jornada === m.jornada)
      ),
    ]
    const nextRaw = allForNextSearch
      .sort((a, b) => dateKey(a.date || '').localeCompare(dateKey(b.date || '')))
      .find(m => m.home_score === null && m.away_score === null) || null

    if (nextRaw) {
      const isHome = slugify(nextRaw.home_team || '') === resolvedSlug
      const opponent = isHome ? nextRaw.away_team : nextRaw.home_team
      const opponentSlug = slugify(opponent || '')
      nextMatch = {
        date: nextRaw.date || '',
        jornada: nextRaw.jornada || 0,
        opponent: opponent || '',
        opponentSlug,
        isHome,
        goalsFor: null,
        goalsAgainst: null,
        result: null,
        referee: Array.isArray(nextRaw.referees) ? nextRaw.referees[0] : (nextRaw.referee || null),
        venue: nextRaw.venue || '',
        time: nextRaw.time || '',
        referees: Array.isArray(nextRaw.referees) ? nextRaw.referees : [],
      }
      rival = buildRivalReport(opponentSlug, rivalMatchSource, resolvedSlug, standings)
    }
  }

  // ── 9. Head to head ────────────────────────────────────────────────────────
  let headToHead: MatchResult[] = []
  if (rival) {
    headToHead = rivalMatchSource
      .filter(m => {
        const hs = slugify(m.home_team || '')
        const as_ = slugify(m.away_team || '')
        return (hs === resolvedSlug && as_ === rival!.slug) || (hs === rival!.slug && as_ === resolvedSlug)
      })
      .filter(m => m.home_score !== null && m.away_score !== null)
      .sort((a, b) => dateKey(b.date || '').localeCompare(dateKey(a.date || '')))
      .slice(0, 5)
      .map(m => matchToResult(m, resolvedSlug))
  }

  // ── 10. Sanctions (FCF official suspensions) ───────────────────────────────
  const sanctions: Sanction[] = (teamJsonData?.sanctions || [])
    .map((s: any) => ({
      player: s.player || '',
      matches_suspended: s.matches_suspended || 0,
      reason: s.reason || '',
      article: s.article || '',
    }))

  return {
    name: teamName,
    slug: teamSlug,
    competition,
    ...overall,
    position,
    home,
    away,
    players,
    goalBuckets,
    form,
    nextMatch,
    rival,
    standings,
    headToHead,
    sanctions,
    hasDetailedData,
  }
}
