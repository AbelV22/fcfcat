/**
 * FCF Acta scraper — runs inside the Cloudflare Worker (API route).
 * Cloudflare outbound IPs are NOT blocked by FCF, unlike Supabase's IPs.
 *
 * All logic ported from supabase/functions/scrape-team/index.ts
 * with no Deno-specific APIs (pure fetch + regex).
 */

// ─── Supabase project constants ───────────────────────────────────────────────

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://nxgyduqprxbhtpqsepgj.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Z3lkdXFwcnhiaHRwcXNlcGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTc5NjcsImV4cCI6MjA4ODU3Mzk2N30.qb-T1ja19sGFyDIOLU6C8SM1OBOa9RnmzEakc9g2Y2U'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerStat {
  player_name: string
  player_slug: string
  appearances: number
  starts: number
  goals: number
  yellow_cards: number
  red_cards: number
  minutes_played: number
}

interface CardEntry {
  player: string
  team: 'home' | 'away'
  minute: number
  card_type: 'yellow' | 'red'
  is_double_yellow_dismissal: boolean
  recipient_type: 'player' | 'staff'
}

interface SubEntry {
  playerOut: string
  playerIn: string
  minute: number
}

interface ActaData {
  jornada: number
  match_date: string
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  referees: string[]
  main_referee: string
  homePlayers: Array<{ name: string; isStarter: boolean }>
  awayPlayers: Array<{ name: string; isStarter: boolean }>
  homeSubs: SubEntry[]
  awaySubs: SubEntry[]
  goals: Array<{ player: string; team: 'home' | 'away'; minute: number }>
  yellow_cards: CardEntry[]
  red_cards: CardEntry[]
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runScrapeInBackground(opts: {
  jobId: string
  slug: string
  teamName: string
  competition: string
  group: string
  season: string
  skipRival?: boolean
}) {
  const { jobId, slug, teamName, competition, group, season, skipRival = false } = opts

  try {
    // 1. Fetch all acta URLs for this team from fcf_matches
    const actaRefs = await fetchActaUrls(slug, competition, group, season)

    await dbPatch('scrape_jobs', jobId, { actas_found: actaRefs.length, status: 'running' })

    if (actaRefs.length === 0) {
      await dbPatch('scrape_jobs', jobId, { status: 'done', actas_scraped: 0 })
      return
    }

    // 2. Scrape actas in batches of 3 with 300ms delay between batches
    const BATCH_SIZE = 3
    const playerStatsMap: Record<string, PlayerStat> = {}
    const actaResults: ActaData[] = []
    let scraped = 0

    for (let i = 0; i < actaRefs.length; i += BATCH_SIZE) {
      const batch = actaRefs.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(batch.map(ref => scrapeActa(ref.url).then(acta => ({ acta, side: ref.side }))))

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.acta) {
          const { acta, side } = result.value
          scraped++
          accumulatePlayerStats(playerStatsMap, acta, slug, side)
          actaResults.push(acta)
        }
      }

      await dbPatch('scrape_jobs', jobId, { actas_scraped: scraped, status: 'running' })

      if (i + BATCH_SIZE < actaRefs.length) {
        await delay(300)
      }
    }

    // 3. Upsert player stats (anon key — RLS allows anon write)
    const statsToUpsert = Object.values(playerStatsMap).map(p => ({
      id: `${season}-${competition}-${group}-${p.player_slug}-${slug}`,
      season,
      competition,
      group_name: group,
      player_name: p.player_name,
      player_slug: p.player_slug,
      team_name: teamName,
      team_slug: slug,
      appearances: p.appearances,
      starts: p.starts,
      goals: p.goals,
      yellow_cards: p.yellow_cards,
      red_cards: p.red_cards,
      minutes_played: p.minutes_played,
      updated_at: new Date().toISOString(),
    }))

    for (let i = 0; i < statsToUpsert.length; i += 50) {
      await dbUpsert('fcf_player_stats', statsToUpsert.slice(i, i + 50))
    }

    // 4. Upsert referee match data
    const refRows = actaResults.map(m => ({
      id: `${season}-${competition}-${group}-J${m.jornada}-${slugify(m.home_team)}-v-${slugify(m.away_team)}`,
      competition,
      group_name: group,
      season,
      jornada: m.jornada,
      match_date: m.match_date,
      home_team: m.home_team,
      away_team: m.away_team,
      home_score: m.home_score,
      away_score: m.away_score,
      main_referee: m.main_referee || null,
      referees: m.referees,
      yellow_cards: m.yellow_cards,
      red_cards: m.red_cards,
      goals: m.goals || [],
      substitutions: [...(m.homeSubs || []).map((s: any) => ({ ...s, team: 'home' })), ...(m.awaySubs || []).map((s: any) => ({ ...s, team: 'away' }))],
      home_lineup: (m.homePlayers || []).map((p: any) => p.name || p),
      away_lineup: (m.awayPlayers || []).map((p: any) => p.name || p),
      updated_at: new Date().toISOString(),
    }))

    for (let i = 0; i < refRows.length; i += 50) {
      await dbUpsert('fcf_referee_matches', refRows.slice(i, i + 50))
    }

    // 5. Mark done
    await dbPatch('scrape_jobs', jobId, { status: 'done', actas_scraped: scraped })

    // 6. Auto-scrape next rival (skipRival=true prevents further chaining)
    if (!skipRival) {
      await scrapeRivalIfNeeded({ mainSlug: slug, competition, group, season })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[fcf-scraper] Fatal error:', msg)
    await dbPatch('scrape_jobs', jobId, { status: 'error', error_msg: msg.slice(0, 500) })
  }
}

// ─── Rival auto-scrape ────────────────────────────────────────────────────────

async function scrapeRivalIfNeeded(opts: {
  mainSlug: string
  competition: string
  group: string
  season: string
}) {
  const { mainSlug, competition, group, season } = opts

  try {
    const [homeUpcoming, awayUpcoming] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/fcf_matches?select=home_slug,away_slug,home_team,away_team,jornada` +
          `&competition=eq.${enc(competition)}&group_name=eq.${enc(group)}&season=eq.${enc(season)}` +
          `&home_slug=eq.${enc(mainSlug)}&home_score=is.null&order=jornada.asc&limit=5`,
        { headers: sbHeaders() },
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/fcf_matches?select=home_slug,away_slug,home_team,away_team,jornada` +
          `&competition=eq.${enc(competition)}&group_name=eq.${enc(group)}&season=eq.${enc(season)}` +
          `&away_slug=eq.${enc(mainSlug)}&home_score=is.null&order=jornada.asc&limit=5`,
        { headers: sbHeaders() },
      ),
    ])

    type MatchRow = { home_slug: string; away_slug: string; home_team: string; away_team: string; jornada: number }
    const homeRows: MatchRow[] = homeUpcoming.ok ? await homeUpcoming.json() : []
    const awayRows: MatchRow[] = awayUpcoming.ok ? await awayUpcoming.json() : []

    const allUpcoming = [...homeRows, ...awayRows].sort((a, b) => a.jornada - b.jornada)
    if (!allUpcoming.length) return

    const next = allUpcoming[0]
    const rivalSlug = next.home_slug === mainSlug ? next.away_slug : next.home_slug
    const rivalName = next.home_slug === mainSlug ? next.away_team : next.home_team

    if (!rivalSlug || rivalSlug === mainSlug) return

    // Skip if rival already has stats
    const statsCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/fcf_player_stats?team_slug=eq.${enc(rivalSlug)}&competition=eq.${enc(competition)}&limit=1&select=id`,
      { headers: sbHeaders() },
    )
    if (statsCheck.ok) {
      const existing: Array<{ id: string }> = await statsCheck.json()
      if (existing.length > 0) return
    }

    // Skip if rival job already running/done
    const rivalJobId = `${season}-${competition}-${rivalSlug}`
    const jobCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/scrape_jobs?id=eq.${enc(rivalJobId)}&select=id,status`,
      { headers: sbHeaders() },
    )
    if (jobCheck.ok) {
      const jobs: Array<{ id: string; status: string }> = await jobCheck.json()
      if (jobs.length > 0 && ['done', 'running', 'pending'].includes(jobs[0].status)) return
    }

    // Create job and scrape rival
    await dbUpsert('scrape_jobs', {
      id: rivalJobId,
      team_slug: rivalSlug,
      team_name: rivalName,
      competition,
      group_name: group,
      season,
      status: 'running',
      actas_found: 0,
      actas_scraped: 0,
      error_msg: null,
    })

    await runScrapeInBackground({
      jobId: rivalJobId,
      slug: rivalSlug,
      teamName: rivalName,
      competition,
      group,
      season,
      skipRival: true,
    })
  } catch (err) {
    console.error('[fcf-scraper] Rival scrape error:', err instanceof Error ? err.message : String(err))
  }
}

// ─── Player stats accumulation ────────────────────────────────────────────────

function accumulatePlayerStats(
  map: Record<string, PlayerStat>,
  acta: ActaData,
  teamSlug: string,
  knownSide?: 'home' | 'away',
) {
  // Use the known side from fcf_matches when available (most reliable).
  // Fallback to slug matching only if knownSide is not provided.
  let mySide: 'home' | 'away' | null = knownSide ?? null

  if (!mySide) {
    const homeActaSlug = slugify(acta.home_team)
    const awayActaSlug = slugify(acta.away_team)

    if (homeActaSlug === teamSlug) {
      mySide = 'home'
    } else if (awayActaSlug === teamSlug) {
      mySide = 'away'
    } else if (homeActaSlug.includes(teamSlug.slice(0, 10)) || teamSlug.includes(homeActaSlug.slice(0, 10))) {
      mySide = 'home'
    } else if (awayActaSlug.includes(teamSlug.slice(0, 10)) || teamSlug.includes(awayActaSlug.slice(0, 10))) {
      mySide = 'away'
    }
  }

  if (!mySide) return

  const myPlayers = mySide === 'home' ? acta.homePlayers : acta.awayPlayers
  const mySubs = mySide === 'home' ? acta.homeSubs : acta.awaySubs

  const subInMinute: Record<string, number> = {}
  const subOutMinute: Record<string, number> = {}
  for (const sub of mySubs) {
    subInMinute[slugify(sub.playerIn)] = sub.minute
    subOutMinute[slugify(sub.playerOut)] = sub.minute
  }

  const myReds = [...acta.yellow_cards, ...acta.red_cards].filter(
    c => c.team === mySide && (c.card_type === 'red' || c.is_double_yellow_dismissal) && c.recipient_type === 'player',
  )
  const redMinute: Record<string, number> = {}
  for (const card of myReds) {
    redMinute[slugify(card.player)] = card.minute
  }

  for (const p of myPlayers) {
    const ps = getOrCreate(map, p.name)
    const pSlug = slugify(p.name)

    if (p.isStarter) {
      ps.appearances++
      ps.starts++
      let mins = 90
      if (subOutMinute[pSlug]) mins = subOutMinute[pSlug]
      if (redMinute[pSlug]) mins = Math.min(mins, redMinute[pSlug])
      ps.minutes_played += Math.max(0, mins)
    } else {
      const subMin = subInMinute[pSlug]
      if (subMin != null && subMin > 0) {
        ps.appearances++
        let mins = 90 - subMin
        if (redMinute[pSlug]) mins = Math.min(mins, redMinute[pSlug] - subMin)
        ps.minutes_played += Math.max(0, mins)
      }
    }
  }

  const myGoals = acta.goals.filter(g => g.team === mySide)
  for (const goal of myGoals) {
    if (goal.player && goal.player !== 'Desconegut') {
      getOrCreate(map, goal.player).goals++
    }
  }

  const myYellows = acta.yellow_cards.filter(c => c.team === mySide && c.recipient_type === 'player')
  for (const card of myYellows) {
    getOrCreate(map, card.player).yellow_cards++
  }

  for (const card of myReds) {
    if (card.is_double_yellow_dismissal) {
      getOrCreate(map, card.player).yellow_cards++
      getOrCreate(map, card.player).red_cards++
    } else {
      getOrCreate(map, card.player).red_cards++
    }
  }
}

function getOrCreate(map: Record<string, PlayerStat>, playerName: string): PlayerStat {
  const slug = slugify(playerName)
  if (!map[slug]) {
    map[slug] = { player_name: playerName, player_slug: slug, appearances: 0, starts: 0, goals: 0, yellow_cards: 0, red_cards: 0, minutes_played: 0 }
  }
  return map[slug]
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

interface ActaRef {
  url: string
  side: 'home' | 'away'
}

async function fetchActaUrls(slug: string, competition: string, group: string, season: string): Promise<ActaRef[]> {
  const base = `${SUPABASE_URL}/rest/v1/fcf_matches`
  const common = `select=acta_url&competition=eq.${enc(competition)}&group_name=eq.${enc(group)}&season=eq.${enc(season)}&acta_url=not.is.null&acta_url=neq.`

  const [homeRes, awayRes] = await Promise.all([
    fetch(`${base}?${common}&home_slug=eq.${enc(slug)}`, { headers: sbHeaders() }),
    fetch(`${base}?${common}&away_slug=eq.${enc(slug)}`, { headers: sbHeaders() }),
  ])

  const homeData: Array<{ acta_url: string }> = homeRes.ok ? await homeRes.json() : []
  const awayData: Array<{ acta_url: string }> = awayRes.ok ? await awayRes.json() : []

  const seen = new Set<string>()
  const refs: ActaRef[] = []
  for (const r of homeData) {
    if (r.acta_url && r.acta_url.length > 10 && !seen.has(r.acta_url)) {
      seen.add(r.acta_url)
      refs.push({ url: r.acta_url, side: 'home' })
    }
  }
  for (const r of awayData) {
    if (r.acta_url && r.acta_url.length > 10 && !seen.has(r.acta_url)) {
      seen.add(r.acta_url)
      refs.push({ url: r.acta_url, side: 'away' })
    }
  }
  return refs
}

async function dbUpsert(table: string, data: Record<string, unknown> | Record<string, unknown>[]) {
  const body = Array.isArray(data) ? data : [data]
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
    method: 'POST',
    headers: {
      ...sbHeaders(),
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`dbUpsert ${table} failed: ${res.status} ${text.slice(0, 300)}`)
  }
}

async function dbPatch(table: string, id: string, data: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${enc(id)}`, {
    method: 'PATCH',
    headers: {
      ...sbHeaders(),
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ ...data, updated_at: new Date().toISOString() }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`dbPatch ${table}/${id}: ${res.status} ${text.slice(0, 200)}`)
  }
}

function sbHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  }
}

// ─── FCF Acta scraper ─────────────────────────────────────────────────────────

async function scrapeActa(url: string): Promise<ActaData | null> {
  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ca,es;q=0.9,en;q=0.8',
        'Referer': 'https://www.fcf.cat/',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) {
      console.warn(`[scrapeActa] HTTP ${res.status} for ${url}`)
      return null
    }
    html = await res.text()
  } catch (err) {
    console.warn(`[scrapeActa] fetch error for ${url}:`, err)
    return null
  }

  // If FCF returns a challenge page (bot detection), bail out early
  if (html.includes('cf-browser-verification') || html.includes('Just a moment') || html.length < 500) {
    console.warn(`[scrapeActa] Bot challenge or empty page for ${url}`)
    return null
  }

  const jornada = extractJornada(html)
  if (!jornada) {
    console.warn(`[scrapeActa] no jornada found in ${url} (html length: ${html.length})`)
    return null
  }

  const matchDate = extractDate(html)
  const matchInfo = extractMatchInfo(html)
  if (!matchInfo) {
    console.warn(`[scrapeActa] no match info in ${url}`)
    return null
  }

  const { homeTeam, awayTeam, homeScore, awayScore } = matchInfo

  const comparativaIdx = html.toLowerCase().indexOf('comparativa')
  const homePart = comparativaIdx > -1 ? html.slice(0, comparativaIdx) : html
  const awayPart = comparativaIdx > -1 ? html.slice(comparativaIdx) : ''

  const homePlayers = extractPlayersFromSection(homePart)
  const awayPlayers = extractPlayersFromSection(awayPart)
  const homeSubs = extractSubsFromSection(homePart)
  const awaySubs = extractSubsFromSection(awayPart)
  const cards = extractCards(homePart, awayPart)
  const goals = extractGoals(html, homeTeam, awayTeam)
  const referees = extractReferees(html)

  return {
    jornada,
    match_date: matchDate,
    home_team: homeTeam,
    away_team: awayTeam,
    home_score: homeScore,
    away_score: awayScore,
    referees,
    main_referee: referees[0] ?? '',
    homePlayers,
    awayPlayers,
    homeSubs,
    awaySubs,
    goals,
    yellow_cards: cards.filter(c => c.card_type === 'yellow'),
    red_cards: cards.filter(c => c.card_type === 'red' || c.is_double_yellow_dismissal),
  }
}

// ─── HTML parsing helpers ─────────────────────────────────────────────────────

function extractJornada(html: string): number | null {
  const m = html.match(/Jornada\s+(\d+)/i)
  return m ? parseInt(m[1]) : null
}

function extractDate(html: string): string {
  const m = html.match(/(\d{2}-\d{2}-\d{4})/)
  return m ? m[1] : ''
}

function extractMatchInfo(html: string): {
  homeTeam: string; awayTeam: string; homeScore: number; awayScore: number
} | null {
  // Strategy 1 (legacy): class="acta-table-header" with 3 TDs
  const headerMatch = html.match(
    /class="acta-table-header"[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i
  )
  if (headerMatch) {
    const home = stripTags(headerMatch[1]).trim()
    const scoreRaw = stripTags(headerMatch[2]).trim()
    const away = stripTags(headerMatch[3]).trim()
    const scoreMatch = scoreRaw.match(/(\d+)\s*[-–]\s*(\d+)/)
    if (scoreMatch && home && away) {
      return { homeTeam: home, awayTeam: away, homeScore: parseInt(scoreMatch[1]), awayScore: parseInt(scoreMatch[2]) }
    }
  }

  // Strategy 2 (legacy): class="acta-equip" + class="acta-resultat"
  const equips = [...html.matchAll(/class="acta-equip"[^>]*>([\s\S]*?)<\/td>/gi)]
  const resultat = html.match(/class="acta-resultat"[^>]*>([\s\S]*?)<\/td>/i)
  if (equips.length >= 2 && resultat) {
    const homeTeam = stripTags(equips[0][1]).trim()
    const awayTeam = stripTags(equips[1][1]).trim()
    const scoreMatch = stripTags(resultat[1]).trim().match(/(\d+)\s*[-–]\s*(\d+)/)
    if (scoreMatch) {
      return { homeTeam, awayTeam, homeScore: parseInt(scoreMatch[1]), awayScore: parseInt(scoreMatch[2]) }
    }
  }

  // Strategy 3 (2025+ FCF redesign): Extract team names from equip links near the score.
  // New structure: <a href="...equip...">TEAM NAME</a> ... N - N ... <a href="...equip...">TEAM NAME</a>
  // Find all team links on the page
  const teamLinks = [...html.matchAll(/<a[^>]+href="https?:\/\/www\.fcf\.cat\/equip\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)]
  if (teamLinks.length >= 2) {
    const home = stripTags(teamLinks[0][1]).trim()
    const away = stripTags(teamLinks[1][1]).trim()
    // Find the score between or near these team names
    const firstTeamEnd = (teamLinks[0].index || 0) + teamLinks[0][0].length
    const secondTeamStart = teamLinks[1].index || html.length
    const between = html.slice(firstTeamEnd, secondTeamStart)
    const scoreMatch = between.match(/(\d+)\s*[-–]\s*(\d+)/)
    if (scoreMatch && home && away) {
      return { homeTeam: home, awayTeam: away, homeScore: parseInt(scoreMatch[1]), awayScore: parseInt(scoreMatch[2]) }
    }
    // Score might not be between them — search broader area
    const searchArea = html.slice(Math.max(0, (teamLinks[0].index || 0) - 200), (teamLinks[1].index || 0) + teamLinks[1][0].length + 200)
    const broadScore = searchArea.match(/(\d+)\s*[-–]\s*(\d+)/)
    if (broadScore && home && away) {
      return { homeTeam: home, awayTeam: away, homeScore: parseInt(broadScore[1]), awayScore: parseInt(broadScore[2]) }
    }
  }

  return null
}

function extractPlayersFromSection(htmlPart: string): Array<{ name: string; isStarter: boolean }> {
  const players: Array<{ name: string; isStarter: boolean }> = []
  if (!htmlPart) return players

  let currentSection = ''
  const rows = htmlPart.split(/<tr[\s>]/i)

  for (const row of rows) {
    if (/Titulars/i.test(row)) { currentSection = 'starter'; continue }
    if (/Suplents/i.test(row)) { currentSection = 'bench'; continue }
    if (/Equip\s+T[eè]cnic/i.test(row)) { currentSection = 'staff'; continue }
    if (/Substitucions/i.test(row) || /Targetes/i.test(row) || /Gols/i.test(row)) { currentSection = ''; continue }

    if (currentSection !== 'starter' && currentSection !== 'bench') continue

    // Accept rows with either legacy class or a jugador link (2025+ format uses plain <tr><td>)
    if (!row.includes('num-samarreta-acta2') && !row.includes('jugador')) continue

    const linkMatch = row.match(/<a[^>]+href="[^"]*jugador[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
    if (!linkMatch) continue

    const name = stripTags(linkMatch[1]).trim()
    if (!name || name.length < 2) continue

    players.push({ name, isStarter: currentSection === 'starter' })
  }

  return players
}

function extractSubsFromSection(htmlPart: string): SubEntry[] {
  const subs: SubEntry[] = []
  if (!htmlPart) return subs

  const subIdx = htmlPart.toLowerCase().indexOf('substitucions')
  if (subIdx === -1) return subs

  const subPart = htmlPart.slice(subIdx)
  const rows = subPart.split(/<tr[\s>]/i)

  for (const row of rows) {
    if (/Targetes/i.test(row) || /Gols/i.test(row)) break

    const minuteMatch = row.match(/(\d+)'/)
    const links = row.match(/<a[^>]+href="[^"]*jugador[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)
    if (!minuteMatch || !links || links.length < 1) continue

    const minute = parseInt(minuteMatch[1])
    if (minute <= 0) continue

    const playerNames = links.map(link => {
      const m = link.match(/>([\s\S]*?)<\/a>/i)
      return m ? stripTags(m[1]).trim() : ''
    }).filter(n => n.length > 1)

    if (playerNames.length >= 2) {
      subs.push({ playerOut: playerNames[0], playerIn: playerNames[1], minute })
    } else if (playerNames.length === 1) {
      subs.push({ playerOut: '', playerIn: playerNames[0], minute })
    }
  }

  return subs
}

function extractCards(homePart: string, awayPart: string): CardEntry[] {
  const cards: CardEntry[] = []
  parseCardsFromSection(homePart, 'home', cards)
  parseCardsFromSection(awayPart, 'away', cards)
  return cards
}

function parseCardsFromSection(htmlPart: string, side: 'home' | 'away', out: CardEntry[]) {
  const targIdx = htmlPart.toLowerCase().indexOf('targetes')
  if (targIdx === -1) return

  // Cut at next major section to avoid picking up data from other sections
  const targPart = htmlPart.slice(targIdx)
  const sectionEnd = targPart.search(/(?:Substitucions|Gols|Alineacions|rbitr|Titulars|Suplents)/i)
  const cardSlice = sectionEnd > 100 ? targPart.slice(0, sectionEnd) : targPart.slice(0, 5000)

  const rows = cardSlice.split(/<tr[\s>]/i)

  for (const row of rows) {
    // Legacy format: look for specific classes
    const isDoubleYellow = row.includes('doble-groga-s')
    const isRed = row.includes('vermella-s')
    const isYellow = row.includes('groga-s')
    const hasLegacyClasses = isDoubleYellow || isRed || isYellow

    // New format (2025+): rows have jugador links + minute pattern, no card-type classes
    const hasPlayerLink = /href="[^"]*jugador[^"]*"/.test(row)
    const hasMinute = /\d{1,3}['′]/.test(row)

    if (!hasLegacyClasses && !(hasPlayerLink && hasMinute)) continue

    // Extract player name — try legacy class first, then jugador link
    let player = ''
    const legacyName = row.match(/class="samarreta-acta2"[^>]*>([\s\S]*?)<\/td>/i)
    if (legacyName) {
      player = stripTags(legacyName[1]).trim()
    } else {
      const linkMatch = row.match(/<a[^>]+href="[^"]*jugador[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      if (linkMatch) player = stripTags(linkMatch[1]).trim()
    }
    if (!player || player.length < 2) continue

    // Extract minute — try legacy class first, then generic pattern
    let minute = 0
    const legacyMin = row.match(/class="acta-minut-targeta"[^>]*>([\s\S]*?)<\/td>/i)
    if (legacyMin) {
      minute = parseInt(stripTags(legacyMin[1]).replace("'", '')) || 0
    } else {
      const minMatch = row.match(/(\d{1,3})['′]/)
      minute = minMatch ? parseInt(minMatch[1]) : 0
    }

    const recipientType: 'player' | 'staff' = hasPlayerLink ? 'player' : 'staff'

    if (hasLegacyClasses) {
      // Legacy path — card type from CSS classes
      if (isDoubleYellow) {
        out.push({ player, team: side, minute, card_type: 'red', is_double_yellow_dismissal: true, recipient_type: recipientType })
      } else if (isRed) {
        out.push({ player, team: side, minute, card_type: 'red', is_double_yellow_dismissal: false, recipient_type: recipientType })
      } else {
        out.push({ player, team: side, minute, card_type: 'yellow', is_double_yellow_dismissal: false, recipient_type: recipientType })
      }
    } else {
      // New format — check for vermella/groga text nearby, default to yellow
      const lowerRow = row.toLowerCase()
      const cardType = lowerRow.includes('vermella') ? 'red' as const : 'yellow' as const
      out.push({ player, team: side, minute, card_type: cardType, is_double_yellow_dismissal: false, recipient_type: recipientType })
    }
  }
}

function extractGoals(html: string, _homeTeam: string, _awayTeam: string): Array<{ player: string; team: 'home' | 'away'; minute: number }> {
  const goals: Array<{ player: string; team: 'home' | 'away'; minute: number }> = []

  const golsIdx = html.toLowerCase().indexOf('gols')
  if (golsIdx === -1) return goals

  // Cut the section from "Gols" to the next major section (Targetes, Substitucions, etc.)
  const golsSection = html.slice(golsIdx)
  const sectionEnd = golsSection.search(/(?:Targetes|Substitucions|Alineacions|rbitr)/i)
  const golsSlice = sectionEnd > 0 ? golsSection.slice(0, sectionEnd) : golsSection.slice(0, 5000)

  // Strategy 1: Split by "acta-marcador-gol" class (old format)
  let blocks = golsSlice.split(/class="acta-marcador-gol"/i)

  // Strategy 2: If no class found, split by score pattern (N - N) which marks each goal
  // The FCF actas show progressive scores: 0-1, 1-1, 1-2, etc.
  if (blocks.length <= 1) {
    // Split on score patterns that appear as standalone text (not inside other elements)
    blocks = golsSlice.split(/(?=(?:<[^>]*>|\s)*\b(\d+)\s*[-–]\s*(\d+)\b)/)
    // Re-join into meaningful blocks: find each score occurrence
    const scoreRegex = /\b(\d+)\s*[-–]\s*(\d+)\b/g
    const scores: Array<{ index: number; hs: number; as: number }> = []
    let m
    while ((m = scoreRegex.exec(golsSlice)) !== null) {
      scores.push({ index: m.index, hs: parseInt(m[1]), as: parseInt(m[2]) })
    }

    // Filter to only progressive scores (each score differs from previous by exactly 1 goal)
    const progressiveScores: typeof scores = []
    let prevH = 0, prevA = 0
    for (const s of scores) {
      const diffH = s.hs - prevH
      const diffA = s.as - prevA
      if ((diffH === 1 && diffA === 0) || (diffH === 0 && diffA === 1)) {
        progressiveScores.push(s)
        prevH = s.hs
        prevA = s.as
      }
    }

    let prevHs2 = 0, prevAs2 = 0
    for (const s of progressiveScores) {
      const team: 'home' | 'away' = s.hs > prevHs2 ? 'home' : 'away'
      // Extract player and minute from the surrounding text (up to 500 chars after the score)
      const after = golsSlice.slice(s.index, s.index + 500)
      const playerMatch = after.match(/<a[^>]+href="[^"]*jugador[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      const player = playerMatch ? stripTags(playerMatch[1]).trim() : 'Desconegut'
      // Match minute: look for N' pattern in spans, tds, or standalone
      const minMatch = after.match(/(?:<(?:td|span|div)[^>]*>\s*)?(\d{1,3})['′]\s*(?:<\/(?:td|span|div)>)?/i)
      const minute = minMatch ? parseInt(minMatch[1]) : 0
      goals.push({ player, team, minute })
      prevHs2 = s.hs
      prevAs2 = s.as
    }

    return goals
  }

  // Strategy 1 path: original logic for acta-marcador-gol format
  let prevHs = 0, prevAs = 0
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]
    const scoreMatch = block.match(/(\d+)\s*[-–]\s*(\d+)/)
    if (!scoreMatch) continue

    const hs = parseInt(scoreMatch[1])
    const as_ = parseInt(scoreMatch[2])
    const team: 'home' | 'away' = hs > prevHs ? 'home' : 'away'

    const playerMatch = block.match(/<a[^>]+href="[^"]*jugador[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
    const player = playerMatch ? stripTags(playerMatch[1]).trim() : 'Desconegut'
    const minMatch = block.match(/<td[^>]*>\s*(\d+)'?\s*<\/td>/i)
    const minute = minMatch ? parseInt(minMatch[1]) : 0

    goals.push({ player, team, minute })
    prevHs = hs
    prevAs = as_
  }

  return goals
}

function extractReferees(html: string): string[] {
  const refs: string[] = []
  const arbitreIdx = html.toLowerCase().indexOf('rbitr')
  if (arbitreIdx === -1) return refs

  const refSection = html.slice(arbitreIdx, arbitreIdx + 4000)
  const rows = refSection.split(/<tr[\s>]/i)

  for (const row of rows) {
    if (row.toLowerCase().includes('rbitr')) continue
    const tdMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i)
    if (!tdMatch) continue
    const name = stripTags(tdMatch[1]).replace(/\([^)]*\)/g, '').trim()
    if (name && name.length > 3 && !name.toLowerCase().includes('rbitr') && !name.match(/^\d/)) {
      refs.push(name)
    }
  }

  return refs.slice(0, 4)
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .trim()
}

export function slugify(text: string): string {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function enc(s: string): string {
  return encodeURIComponent(s)
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
