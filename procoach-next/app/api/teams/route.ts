import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { composeTeamSlug } from '@/lib/team-slug'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const competition = searchParams.get('competition')

  if (!competition) {
    return NextResponse.json({ teams: [] })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fcf_standings')
    .select('team_name, team_slug, group_name')
    .eq('competition', competition)
    .eq('season', '2526')
    .order('team_name')

  if (error) {
    console.error('Teams API error:', error.message)
    return NextResponse.json({ teams: [], error: error.message }, { status: 500 })
  }

  // Deduplicate by (team_name, group_name) so clubs that field multiple teams
  // in different groups of the same competition still show as separate entries.
  const seen = new Set<string>()
  const teams = (data || [])
    .filter(r => {
      if (!r.team_name) return false
      const key = `${r.team_name}::${r.group_name ?? ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(r => ({
      name: r.team_name as string,
      group: (r.group_name ?? '') as string,
      slug: (r.team_slug || composeTeamSlug(r.team_name as string, competition, r.group_name ?? '')) as string,
    }))

  return NextResponse.json({ teams })
}
