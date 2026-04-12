'use client'

import Link from 'next/link'
import type { FeaturedPlayersData, FeaturedPlayer } from '@/lib/supabase-data'

const COMP_ORDER = [
  'lliga-elit',
  'primera-catalana',
  'segona-catalana',
  'tercera-catalana',
  'quarta-catalana',
  'preferent-juvenils',
]

function PlayerRow({ player, rank, showRatio }: { player: FeaturedPlayer; rank: number; showRatio?: boolean }) {
  const opacity = rank === 0 ? 1 : rank === 1 ? 0.75 : 0.55

  return (
    <Link
      href={`/jugador/${player.slug}--${player.teamSlug}`}
      className="flex items-center gap-3 group"
      style={{
        padding: '7px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        textDecoration: 'none',
        transition: 'background 0.15s',
      }}
    >
      {/* Rank */}
      <span
        style={{
          width: 20,
          fontSize: 12,
          fontWeight: 510,
          color: rank === 0 ? '#22c55e' : '#62666d',
          textAlign: 'right',
          flexShrink: 0,
          opacity,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {rank + 1}
      </span>

      {/* Name + team */}
      <div style={{ flex: 1, minWidth: 0, opacity }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 510,
            color: '#f7f8f8',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transition: 'color 0.15s',
          }}
          className="group-hover:text-[#22c55e]"
        >
          {player.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#62666d',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {player.team}
        </div>
      </div>

      {/* Stat */}
      {showRatio && player.goalsPerMinute != null ? (
        <div style={{ textAlign: 'right', flexShrink: 0, opacity }}>
          <div style={{ fontSize: 14, fontWeight: 510, color: '#f7f8f8', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(player.minutesPlayed / player.goals)}&apos;
          </div>
          <div style={{ fontSize: 10, color: '#62666d' }}>
            {player.goals}g / {player.minutesPlayed}&apos;
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'right', flexShrink: 0, opacity }}>
          <div style={{ fontSize: 16, fontWeight: 510, color: '#22c55e', fontVariantNumeric: 'tabular-nums' }}>
            {player.goals}
          </div>
          <div style={{ fontSize: 10, color: '#62666d' }}>{player.appearances} partits</div>
        </div>
      )}
    </Link>
  )
}

function LeaderboardBlock({
  title,
  players,
  showRatio,
}: {
  title: string
  players: FeaturedPlayer[]
  showRatio?: boolean
}) {
  if (!players || players.length === 0) return null
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 510,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#62666d',
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {title}
      </div>
      <div>
        {players.map((p, i) => (
          <PlayerRow key={`${p.slug}-${p.teamSlug}`} player={p} rank={i} showRatio={showRatio} />
        ))}
      </div>
    </div>
  )
}

export default function FeaturedPlayersV2({ data }: { data: FeaturedPlayersData }) {
  const { topScorersByCompetition, topGoalsPerMinuteByCompetition } = data

  const hasScorers = Object.values(topScorersByCompetition).some(arr => arr.length > 0)
  const hasRatios = Object.values(topGoalsPerMinuteByCompetition).some(arr => arr.length > 0)

  if (!hasScorers && !hasRatios) return null

  const scorerComps = COMP_ORDER.filter(c => topScorersByCompetition[c]?.length)
  const ratioComps = COMP_ORDER.filter(c => topGoalsPerMinuteByCompetition[c]?.length)

  return (
    <section
      style={{
        background: '#08090a',
        paddingBottom: 96,
        fontFamily: 'var(--font-inter)',
      }}
    >
      <div
        className="max-w-[1200px] mx-auto px-6"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: 64,
        }}
      >
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3" style={{ marginBottom: 40 }}>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 510,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#22c55e',
                marginBottom: 8,
              }}
            >
              Estadístiques
            </div>
            <h2
              style={{
                fontSize: 'clamp(24px, 2.5vw, 34px)',
                fontWeight: 510,
                letterSpacing: '-0.02em',
                color: '#f7f8f8',
                lineHeight: 1.1,
              }}
            >
              Els que estan marcant diferències
            </h2>
          </div>
          <p style={{ fontSize: 13, color: '#62666d', flexShrink: 0 }}>
            Temporada 2025/26
          </p>
        </div>

        {/* Two panels: scorers | ratio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Scorers */}
          {hasScorers && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 510,
                  color: '#8a8f98',
                  marginBottom: 20,
                  letterSpacing: '-0.01em',
                }}
              >
                Màxims golejadors per divisió
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {scorerComps.map(comp => (
                  <LeaderboardBlock
                    key={comp}
                    title={topScorersByCompetition[comp][0].competitionName}
                    players={topScorersByCompetition[comp]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ratio */}
          {hasRatios && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 510,
                  color: '#8a8f98',
                  marginBottom: 20,
                  letterSpacing: '-0.01em',
                }}
              >
                Millor ràtio gols/minut (mínim 200&apos; jugats)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {ratioComps.map(comp => (
                  <LeaderboardBlock
                    key={comp}
                    title={topGoalsPerMinuteByCompetition[comp][0].competitionName}
                    players={topGoalsPerMinuteByCompetition[comp]}
                    showRatio
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  )
}
