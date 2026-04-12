import { redirect } from 'next/navigation'
import { getDashboardTeam, isAdminUser } from '@/lib/dashboard-auth'
import { getFullTeamReportDB } from '@/lib/supabase-data'
import { Calendar, Crosshair } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatDate(d: string) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const months = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    return `${parts[0]} ${months[parseInt(parts[1], 10) - 1] || parts[1]}`
  }
  return d
}

function parseDate(d: string): Date | null {
  const m = (d || '').match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (!m) return null
  return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
}

export default async function CalendariPage() {
  const isAdmin = await isAdminUser()
  const team = await getDashboardTeam()
  if (!team) redirect('/dashboard/setup')
  if (!isAdmin) {
    const { createClient } = await import('@/lib/supabase-server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
  }

  const report = await getFullTeamReportDB(team.slug, team.competition || undefined)
  const form = report?.form || []
  const nextMatch = report?.nextMatch

  const now = new Date()
  const pastMatches = form.filter(m => {
    const d = parseDate(m.date)
    return d && d < now && m.goalsFor !== null
  }).reverse()
  const futureMatches = form.filter(m => {
    const d = parseDate(m.date)
    return d && d >= now || (m.goalsFor === null && m.goalsAgainst === null)
  })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6" style={{ paddingTop: 24, paddingBottom: 48, fontFamily: 'var(--font-inter)' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 510, color: '#f7f8f8', letterSpacing: '-0.02em', marginBottom: 4 }}>{report?.name || team.name}</h1>
          <p style={{ fontSize: 13, color: '#8a8f98' }}>{team.competition} — Temporada 2025/26</p>
        </div>

        {form.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 48, textAlign: 'center' }}>
            <Calendar size={36} style={{ color: '#62666d', margin: '0 auto 16px', opacity: 0.4 }} />
            <p style={{ color: '#8a8f98', fontSize: 14 }}>No s&apos;han trobat partits.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Next match highlight */}
            {nextMatch && (
              <div style={{ background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.1)', borderRadius: 8, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Crosshair size={16} style={{ color: '#22c55e' }} />
                  <h2 style={{ fontWeight: 510, color: '#f7f8f8', fontSize: 14 }}>Proper partit — J{nextMatch.jornada}</h2>
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 9999, fontWeight: 510,
                    background: nextMatch.isHome ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
                    color: nextMatch.isHome ? '#22c55e' : '#8a8f98',
                    border: nextMatch.isHome ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {nextMatch.isHome ? 'Local' : 'Visitant'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#8a8f98', fontSize: 13 }}>{formatDate(nextMatch.date)}</span>
                  {nextMatch.time && <span style={{ color: '#22c55e', fontWeight: 510, fontSize: 13 }}>{nextMatch.time}h</span>}
                  <span style={{ color: '#f7f8f8', fontWeight: 510, fontSize: 14 }}>{nextMatch.opponent}</span>
                  {nextMatch.venue && <span style={{ color: '#62666d', fontSize: 11, marginLeft: 'auto' }}>{nextMatch.venue}</span>}
                </div>
              </div>
            )}

            {/* Future matches */}
            {futureMatches.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 510, color: '#f7f8f8', marginBottom: 14 }}>Pròxims partits ({futureMatches.length})</h2>
                <div>
                  {futureMatches.map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color: '#62666d', fontSize: 11, width: 48, flexShrink: 0 }}>{formatDate(m.date)}</span>
                      <span style={{ color: '#62666d', fontSize: 11, width: 28 }}>J{m.jornada}</span>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 510,
                        background: m.isHome ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
                        color: m.isHome ? '#22c55e' : '#8a8f98',
                      }}>
                        {m.isHome ? 'L' : 'V'}
                      </span>
                      <span style={{ color: '#f7f8f8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.opponent}</span>
                      <span style={{ color: '#62666d', fontSize: 12 }}>-</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past results */}
            {pastMatches.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 510, color: '#f7f8f8', marginBottom: 14 }}>Resultats ({pastMatches.length})</h2>
                <div>
                  {pastMatches.map((m, i) => {
                    const res = m.result
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '8px 4px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)', borderRadius: 4,
                        background: res === 'W' ? 'rgba(34,197,94,0.03)' : res === 'L' ? 'rgba(248,113,113,0.03)' : 'transparent',
                      }}>
                        <span style={{ color: '#62666d', fontSize: 11, width: 48, flexShrink: 0 }}>{formatDate(m.date)}</span>
                        <span style={{ color: '#62666d', fontSize: 11, width: 28 }}>J{m.jornada}</span>
                        <span style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 510,
                          background: m.isHome ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
                          color: m.isHome ? '#22c55e' : '#8a8f98',
                        }}>
                          {m.isHome ? 'L' : 'V'}
                        </span>
                        <span style={{ color: '#f7f8f8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.opponent}</span>
                        <span style={{ fontWeight: 510, fontVariantNumeric: 'tabular-nums' }}>
                          <span style={{ color: res === 'W' ? '#22c55e' : res === 'L' ? '#f87171' : '#d0d6e0' }}>{m.goalsFor}</span>
                          <span style={{ color: '#62666d', margin: '0 2px' }}>-</span>
                          <span style={{ color: res === 'L' ? '#22c55e' : res === 'W' ? '#f87171' : '#d0d6e0' }}>{m.goalsAgainst}</span>
                        </span>
                        <span style={{
                          width: 20, height: 20, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 510,
                          background: res === 'W' ? '#22c55e' : res === 'D' ? '#62666d' : res === 'L' ? '#f87171' : 'rgba(255,255,255,0.08)',
                          color: res ? '#fff' : '#62666d',
                        }}>
                          {res || '?'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  )
}
