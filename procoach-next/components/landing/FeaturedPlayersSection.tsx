import Link from 'next/link'
import { Trophy, Zap } from 'lucide-react'
import type { FeaturedPlayersData, FeaturedPlayer } from '@/lib/supabase-data'

/** Medal colors for top 3 */
const MEDAL = ['text-yellow-400', 'text-[#d0d6e0]', 'text-amber-600']

function PlayerRow({ player, rank, showRatio }: { player: FeaturedPlayer; rank: number; showRatio?: boolean }) {
  return (
    <Link
      href={`/jugador/${player.slug}--${player.teamSlug}`}
      className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-white/5 transition-colors group"
    >
      <span className={`text-sm font-black w-5 text-center ${MEDAL[rank] || 'text-[#62666d]'}`}>
        {rank + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate group-hover:text-green-400 transition-colors">
          {player.name}
        </div>
        <div className="text-[11px] text-[#8a8f98] truncate">{player.team}</div>
      </div>
      {showRatio && player.goalsPerMinute != null ? (
        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-[#22c55e]">{Math.round(player.minutesPlayed / player.goals)}&apos;</div>
          <div className="text-[10px] text-[#8a8f98]">{player.goals} gols / {player.minutesPlayed}&apos;</div>
        </div>
      ) : (
        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-green-400">{player.goals}</div>
          <div className="text-[10px] text-[#8a8f98]">{player.appearances} partits</div>
        </div>
      )}
    </Link>
  )
}

function CompetitionCard({
  title,
  players,
  icon,
  showRatio,
}: {
  title: string
  players: FeaturedPlayer[]
  icon: React.ReactNode
  showRatio?: boolean
}) {
  if (!players || players.length === 0) return null
  return (
    <div className="card-elevated rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      <div className="divide-y divide-white/5">
        {players.map((p, i) => (
          <PlayerRow key={`${p.slug}-${p.teamSlug}`} player={p} rank={i} showRatio={showRatio} />
        ))}
      </div>
    </div>
  )
}

/** Order to display competitions */
const COMP_ORDER = [
  'lliga-elit',
  'primera-catalana',
  'segona-catalana',
  'tercera-catalana',
  'quarta-catalana',
  'preferent-juvenils',
]

export default function FeaturedPlayersSection({ data }: { data: FeaturedPlayersData }) {
  const { topScorersByCompetition, topGoalsPerMinuteByCompetition } = data

  const hasScorers = Object.values(topScorersByCompetition).some(arr => arr.length > 0)
  const hasRatios = Object.values(topGoalsPerMinuteByCompetition).some(arr => arr.length > 0)

  if (!hasScorers && !hasRatios) return null

  const scorerComps = COMP_ORDER.filter(c => topScorersByCompetition[c]?.length)
  const ratioComps = COMP_ORDER.filter(c => topGoalsPerMinuteByCompetition[c]?.length)

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-20">

      {/* Top Scorers */}
      {hasScorers && (
        <div className="mb-16">
          <div className="text-center mb-8 section-accent-center reveal">
            <h2 className="font-headline text-2xl sm:text-3xl font-black text-white mb-2">
              <Trophy size={24} className="inline -mt-1 mr-2 text-yellow-400" />
              Jugadors <span className="gradient-text-hero">destacats</span>
            </h2>
            <p className="text-[#8a8f98] text-sm">
              Màxims golejadors per divisió — Temporada 2025/26
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scorerComps.map(comp => (
              <CompetitionCard
                key={comp}
                title={topScorersByCompetition[comp][0].competitionName}
                players={topScorersByCompetition[comp]}
                icon={<Trophy size={16} className="text-yellow-400" />}
              />
            ))}
          </div>
        </div>
      )}

      {/* Goals per Minute */}
      {hasRatios && (
        <div>
          <div className="text-center mb-8 section-accent-center reveal">
            <h2 className="font-headline text-2xl sm:text-3xl font-black text-white mb-2">
              <Zap size={24} className="inline -mt-1 mr-2 text-[#22c55e]" />
              Millor ràtio <span className="gradient-text-hero">gols/minut</span>
            </h2>
            <p className="text-[#8a8f98] text-sm">
              Jugadors més eficients (mínim 200 minuts jugats)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ratioComps.map(comp => (
              <CompetitionCard
                key={comp}
                title={topGoalsPerMinuteByCompetition[comp][0].competitionName}
                players={topGoalsPerMinuteByCompetition[comp]}
                icon={<Zap size={16} className="text-[#22c55e]" />}
                showRatio
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
