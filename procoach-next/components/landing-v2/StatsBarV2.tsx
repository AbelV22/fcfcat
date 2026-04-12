'use client'

interface Props {
  refereeCount: number
  matchCount: number
  teamCount: number
}

export default function StatsBarV2({ refereeCount, matchCount, teamCount }: Props) {
  const stats = [
    { value: '14', label: 'Competicions cobertes' },
    { value: matchCount.toLocaleString('ca'), label: 'Partits analitzats', live: true },
    { value: teamCount.toLocaleString('ca'), label: 'Equips registrats' },
    { value: refereeCount.toLocaleString('ca'), label: 'Àrbitres analitzats' },
  ]

  return (
    <section
      style={{
        background: '#0f1011',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        fontFamily: 'var(--font-inter)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6">

        {/* Desktop: horizontal band */}
        <div className="hidden sm:flex items-stretch">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-stretch">
              <div
                style={{
                  flex: 1,
                  padding: '24px 32px',
                  textAlign: 'center',
                  minWidth: 160,
                }}
              >
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 510,
                    color: '#f7f8f8',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    marginBottom: 6,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  className="flex items-center justify-center gap-1.5"
                  style={{
                    fontSize: 11,
                    fontWeight: 510,
                    color: '#62666d',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {stat.live && (
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: '#22c55e',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {stat.label}
                </div>
              </div>
              {i < stats.length - 1 && (
                <div
                  style={{
                    width: 1,
                    background: 'rgba(255,255,255,0.05)',
                    alignSelf: 'stretch',
                    margin: '16px 0',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Mobile: 2×2 grid */}
        <div className="sm:hidden grid grid-cols-2">
          {stats.map((stat, i) => (
            <div
              key={i}
              style={{
                padding: '20px 16px',
                textAlign: 'center',
                borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.05)' : undefined,
                borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : undefined,
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 510,
                  color: '#f7f8f8',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  marginBottom: 5,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 510,
                  color: '#62666d',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  lineHeight: 1.4,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
