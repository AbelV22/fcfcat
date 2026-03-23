import type { MetadataRoute } from 'next'
import { COMPETITION_NAMES } from '@/lib/data'
import { getAllTeamsDB, getAllRefereesDB, getAllPlayersDB } from '@/lib/supabase-data'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://neoscout.es'
  const now = new Date().toISOString()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/cerca`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/resultats`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ]

  // Competition pages
  const competitionPages: MetadataRoute.Sitemap = Object.keys(COMPETITION_NAMES).map(slug => ({
    url: `${baseUrl}/competicio/${slug}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  // Team pages
  const teams = await getAllTeamsDB()
  const teamPages: MetadataRoute.Sitemap = teams.map(t => ({
    url: `${baseUrl}/equip/${t.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Referee pages
  const referees = await getAllRefereesDB()
  const refereePages: MetadataRoute.Sitemap = referees.map(r => ({
    url: `${baseUrl}/arbitre/${r.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Player pages
  const players = await getAllPlayersDB()
  const playerPages: MetadataRoute.Sitemap = players.map(p => ({
    url: `${baseUrl}/jugador/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [
    ...staticPages,
    ...competitionPages,
    ...teamPages,
    ...refereePages,
    ...playerPages,
  ]
}
