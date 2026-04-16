/**
 * Team-slug helpers.
 *
 * A team slug used in URLs is `${baseSlug}-${compCode}-g${groupNumber}`.
 * The suffix disambiguates clubs that field multiple age-group teams with
 * identical names (e.g. Fundació Cornellà A plays in Preferent Cadet S15,
 * Preferent Cadet S16 and Preferent Infantil S14 simultaneously).
 *
 * Keep this file in sync with `fcfcat/scraper/team_slug.py` — the scraper
 * writes the DB values, this module reads them.
 */

/** Short codes for every competition slug in `lib/competitions.ts`. */
export const COMPETITION_SHORT_CODE: Record<string, string> = {
  // Adult
  'tercera-federacio': 'tf',
  'lliga-elit': 'le',
  'primera-catalana': '1c',
  'segona-catalana': '2c',
  'tercera-catalana': '3c',
  'quarta-catalana': '4c',
  // Juvenil
  'divisio-honor-juvenil': 'dhj',
  'lliga-nacional-juvenil': 'lnj',
  'preferent-juvenils': 'pj',
  'juvenil-primera-divisio': 'j1',
  'segona-catalana-juvenil': 'j2',
  'tercera-catalana-juvenil': 'j3',
  // Cadet S16
  'divisio-honor-cadet-s16': 'dhc16',
  'preferent-cadet-s16': 'pc16',
  'cadet-primera-divisio-s16': 'c1-16',
  'cadet-segona-divisio-s16': 'c2-16',
  // Cadet S15
  'divisio-honor-cadet-s15': 'dhc15',
  'preferent-cadet-s15': 'pc15',
  'cadet-primera-divisio-s15': 'c1-15',
  'cadet-segona-divisio-s15': 'c2-15',
  // Infantil S14
  'divisio-honor-infantil-s14': 'dhi14',
  'preferent-infantil-s14': 'pi14',
  'primera-divisio-infantil-s14': 'i1-14',
  // Infantil S13
  'divisio-honor-infantil-s13': 'dhi13',
  'preferent-infantil-s13': 'pi13',
  'infantil-primera-divisio-s13': 'i1-13',
}

/** Reverse lookup: short code → competition slug. */
export const COMPETITION_SHORT_CODE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(COMPETITION_SHORT_CODE).map(([k, v]) => [v, k]),
)

/** Basic slugify — name only, no comp/group suffix. Matches `lib/data.ts:slugify`. */
export function baseSlugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/** Extract the numeric part of a group name: "grup-3" → 3, "grup-10" → 10. */
export function groupNumber(group: string): number {
  const m = /(\d+)/.exec(group || '')
  return m ? parseInt(m[1], 10) : 1
}

/** Build the canonical disambiguated team slug used in URLs and DB. */
export function composeTeamSlug(teamName: string, competition: string, group: string): string {
  const base = baseSlugify(teamName)
  const code = COMPETITION_SHORT_CODE[competition] || baseSlugify(competition)
  const g = groupNumber(group)
  return `${base}-${code}-g${g}`
}

/**
 * Split a slug into base + (optional) competition/group.
 * Returns `{ baseSlug }` for legacy slugs without a suffix.
 *
 * Suffix regex expects `-<code>-g<digits>` at the end, where <code> is one
 * of the registered short codes (or `c1-15` style two-segment codes).
 */
export function parseTeamSlug(slug: string): {
  baseSlug: string
  competition?: string
  group?: string
} {
  const codes = Object.keys(COMPETITION_SHORT_CODE_REVERSE)
    // sort longest first so "c1-15" matches before "c1"
    .sort((a, b) => b.length - a.length)
  for (const code of codes) {
    const pattern = new RegExp(`^(.+)-${escapeRegex(code)}-g(\\d+)$`)
    const m = pattern.exec(slug)
    if (m) {
      return {
        baseSlug: m[1],
        competition: COMPETITION_SHORT_CODE_REVERSE[code],
        group: `grup-${m[2]}`,
      }
    }
  }
  return { baseSlug: slug }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
