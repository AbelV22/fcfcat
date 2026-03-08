import type { Metadata } from 'next'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import { getRecentResults, COMPETITION_NAMES } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Últims Resultats — Futbol Català',
  description: 'Resultats recents de tots els partits de les categories de la Federació Catalana de Futbol.',
}

export default async function ResultatsPage() {
  const results = getRecentResults(50)

  const formatDate = (date: string) => {
    if (!date) return '–'
    const [day, month, year] = date.split('-')
    const months = ['', 'gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des']
    return `${day} ${months[parseInt(month)] || month} ${year}`
  }

  // Group by date
  const byDate: Record<string, typeof results> = {}
  for (const match of results) {
    const key = match.date || 'Sense data'
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(match)
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <PublicHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
            <Calendar size={20} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Últims Resultats</h1>
            <p className="text-sm text-slate-500">Partits de la temporada 2025-26</p>
          </div>
        </div>

        <div className="space-y-8">
          {Object.entries(byDate).map(([date, matches]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-slate-400">{formatDate(date)}</span>
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs text-slate-600">{matches.length} partits</span>
              </div>
              <div className="glass-card rounded-2xl overflow-hidden">
                {matches.map((match, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 px-5 py-3.5 ${i > 0 ? 'border-t border-white/5' : ''} hover:bg-white/3 transition-colors`}
                  >
                    <span className="text-xs text-slate-600 w-8 shrink-0 font-mono">J{match.jornada}</span>
                    <span className="text-xs text-slate-500 w-20 shrink-0 hidden sm:block">
                      {COMPETITION_NAMES[match.competition]?.split(' ')[0] || match.competition}
                    </span>
                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <span className="text-sm text-slate-200 text-right truncate font-medium">{match.home_team}</span>
                      <span className="text-sm font-black text-white bg-white/8 px-3 py-1 rounded-lg shrink-0 font-mono">
                        {match.home_score ?? '–'} – {match.away_score ?? '–'}
                      </span>
                      <span className="text-sm text-slate-200 truncate font-medium">{match.away_team}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {results.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            No hi ha resultats disponibles
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  )
}
