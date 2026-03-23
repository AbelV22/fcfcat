import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const competition = searchParams.get('competition')

  if (!competition) {
    return NextResponse.json({ teams: [] })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fcf_standings')
    .select('team_name, group_name')
    .eq('competition', competition)
    .eq('season', '2526')
    .order('team_name')

  if (error) {
    console.error('Teams API error:', error.message)
    return NextResponse.json({ teams: [], error: error.message }, { status: 500 })
  }

  // Deduplicate team names (a team may appear in multiple rows)
  const seen = new Set<string>()
  const teams = (data || [])
    .filter(r => {
      if (!r.team_name || seen.has(r.team_name)) return false
      seen.add(r.team_name)
      return true
    })
    .map(r => ({ name: r.team_name, group: r.group_name }))

  return NextResponse.json({ teams })
}
