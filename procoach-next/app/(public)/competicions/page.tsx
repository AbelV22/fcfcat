import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllCompetitionGroupsDB } from '@/lib/supabase-data'
import { COMPETITION_NAMES, COMPETITION_CATEGORY } from '@/lib/data'
import CompeticionsClient from './CompeticionsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Competicions i Equips — Busca el teu equip',
  description:
    'Explora totes les competicions del futbol català amb dades a NeoScout. Navega per categoria (Adult, Juvenil, Cadet, Infantil), competició i grup fins a trobar el teu equip.',
  keywords: [
    'competicions futbol català',
    'busca equip',
    'preferent cadet',
    'primera catalana',
    'FCF',
    'grups futbol català',
  ],
  alternates: { canonical: 'https://neoscout.es/competicions' },
}

const CATEGORY_ORDER: Array<keyof typeof CATEGORY_LABEL> = ['adult', 'juvenil', 'cadet', 'infantil']
const CATEGORY_LABEL = {
  adult: 'Amateur',
  juvenil: 'Juvenil',
  cadet: 'Cadet',
  infantil: 'Infantil',
} as const

/** Natural sort so grup-2 comes before grup-10. */
function groupSortKey(group: string): number {
  const m = /(\d+)/.exec(group)
  return m ? parseInt(m[1], 10) : 9999
}

export default async function CompeticionsPage() {
  const rows = await getAllCompetitionGroupsDB()

  // Shape: category -> competition -> group -> teams[]
  type TeamRow = { slug: string; name: string }
  type Tree = Record<
    string,
    Record<string, Record<string, TeamRow[]>>
  >

  const tree: Tree = {}
  for (const r of rows) {
    if (!r.competition || !r.slug) continue
    const cat = COMPETITION_CATEGORY[r.competition] || 'adult'
    const group = r.group || 'grup-1'
    tree[cat] ??= {}
    tree[cat][r.competition] ??= {}
    tree[cat][r.competition][group] ??= []
    // Dedupe teams per group
    if (!tree[cat][r.competition][group].some(t => t.slug === r.slug)) {
      tree[cat][r.competition][group].push({ slug: r.slug, name: r.name })
    }
  }

  // Flatten to a stable array structure for the client
  const categories = CATEGORY_ORDER.filter(c => tree[c]).map(cat => {
    const comps = Object.entries(tree[cat])
      .map(([slug, groups]) => {
        const groupList = Object.entries(groups)
          .sort(([a], [b]) => groupSortKey(a) - groupSortKey(b))
          .map(([g, teams]) => ({
            group: g,
            teams: teams.sort((a, b) => a.name.localeCompare(b.name)),
          }))
        const teamCount = groupList.reduce((n, g) => n + g.teams.length, 0)
        return {
          slug,
          name: COMPETITION_NAMES[slug] || slug,
          groups: groupList,
          teamCount,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
    return { key: cat, label: CATEGORY_LABEL[cat], competitions: comps }
  })

  return <CompeticionsClient categories={categories} />
}
