'use client'

import { ArrowRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const DEMO_RIVAL_SCORERS = [
  { name: 'LOPEZ, ADRIÀ', goals: 11 },
  { name: 'SÁNCHEZ, NOEL', goals: 7 },
  { name: 'RUIZ, SERGI', goals: 5 },
]

const DEMO_SQUAD = [
  { name: 'GARCIA, MARC', goals: 8, yellows: 2, risk: false },
  { name: 'MARTINEZ, POL', goals: 3, yellows: 4, risk: true },
  { name: 'PÉREZ, JAN', goals: 0, yellows: 5, risk: true },
  { name: 'FERNANDEZ, TON', goals: 6, yellows: 1, risk: false },
]

const DEMO_BUCKETS = [3, 5, 4, 7, 6, 9]
const BUCKET_LABELS = ['1-15', '16-30', '31-45', '46-60', '61-75', '76-90']

export default function HeroV2() {
  const maxBucket = Math.max(...DEMO_BUCKETS)

  return (
    <section
      style={{ background: '#08090a', paddingTop: 72, paddingBottom: 96 }}
    >
      <div
        className="max-w-[1200px] mx-auto px-6"
        style={{ fontFamily: 'var(--font-inter)' }}
      >
        <div className="grid lg:grid-cols-[55fr_45fr] gap-16 items-center">

          {/* ── Left: Copy ── */}
          <div>
            {/* Badge pill */}
            <div
              className="inline-flex items-center gap-2 mb-8 "
              style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.18)',
                borderRadius: 9999,
                padding: '4px 14px',
                fontSize: 11,
                fontWeight: 510,
                color: '#22c55e',
                letterSpacing: '0.04em',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#22c55e',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              Futbol Català · FCF Oficial · Temporada 2025/26
            </div>

            {/* Headline */}
            <h1
              className=" v2-delay-1"
              style={{
                fontSize: 'clamp(40px, 5.5vw, 68px)',
                fontWeight: 510,
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
                color: '#f7f8f8',
                marginBottom: 20,
              }}
            >
              El partit<br />
              <span style={{ color: '#22c55e' }}>es guanya entre setmana</span>
            </h1>

            {/* Subheadline */}
            <p
              className=" v2-delay-2"
              style={{
                fontSize: 17,
                fontWeight: 400,
                color: '#8a8f98',
                lineHeight: 1.6,
                letterSpacing: '-0.01em',
                marginBottom: 40,
                maxWidth: 480,
              }}
            >
              Informes de rivals, àrbitres i plantilla per preparar cada partit. Dades reals de les 14 categories de la FCF.
            </p>

            {/* CTA */}
            <div className=" v2-delay-3" style={{ marginBottom: 0 }}>
              <Link
                href="/entrenador"
                className="inline-flex items-center gap-2"
                style={{
                  padding: '12px 24px',
                  background: '#22c55e',
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: 510,
                  borderRadius: 6,
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                  fontFamily: 'var(--font-inter)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#34d399')}
                onMouseLeave={e => (e.currentTarget.style.background = '#22c55e')}
              >
                Accedeix gratis
                <ArrowRight size={15} />
              </Link>
              <p
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: '#62666d',
                  fontFamily: 'var(--font-inter)',
                }}
              >
                Sense targeta. Per a tots els entrenadors.
              </p>
            </div>

          </div>

          {/* ── Right: Demo card ── */}
          <div className="hidden lg:block  v2-delay-2">
            <div
              style={{
                background: '#0f1011',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                padding: 20,
                boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.5)',
                fontFamily: 'var(--font-inter)',
              }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 510,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: '#62666d',
                  }}
                >
                  Informe de Preparació
                </span>
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: 10, fontWeight: 510, color: '#22c55e' }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#22c55e',
                      display: 'inline-block',
                    }}
                  />
                  En viu
                </span>
              </div>

              {/* Team row */}
              <div
                className="flex items-center gap-3"
                style={{
                  marginBottom: 16,
                  paddingBottom: 16,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 6,
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.12)',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#22c55e',
                    flexShrink: 0,
                  }}
                >
                  M
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 510, color: '#f7f8f8', marginBottom: 2 }}>
                    Marianao Poblet UD A
                  </div>
                  <div style={{ fontSize: 11, color: '#62666d' }}>Segona Catalana · #11</div>
                </div>
                <div className="flex gap-1">
                  {['W', 'D', 'W', 'L', 'W'].map((r, i) => (
                    <span
                      key={i}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 3,
                        fontSize: 8,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        background:
                          r === 'W'
                            ? 'rgba(34,197,94,0.7)'
                            : r === 'D'
                            ? 'rgba(251,191,36,0.7)'
                            : 'rgba(248,113,113,0.7)',
                      }}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Two columns */}
              <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 14 }}>
                {/* Rival scorers */}
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 510,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#62666d',
                      marginBottom: 8,
                    }}
                  >
                    Proper Rival
                  </div>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 6,
                      padding: 10,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 510, color: '#d0d6e0', marginBottom: 8 }}>
                      Fund. Ac. L&apos;Hospitalet
                    </div>
                    <div className="grid grid-cols-3 gap-1" style={{ marginBottom: 8 }}>
                      {DEMO_RIVAL_SCORERS.map((s, i) => (
                        <div
                          key={i}
                          style={{
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: 4,
                            padding: '5px 4px',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 510, color: '#22c55e' }}>
                            {s.goals}
                          </div>
                          <div
                            style={{
                              fontSize: 8,
                              color: '#62666d',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {s.name.split(',')[0]}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle size={9} style={{ color: '#fbbf24', flexShrink: 0 }} />
                      <span style={{ fontSize: 9, color: '#fbbf24' }}>2 apercibits</span>
                    </div>
                  </div>
                </div>

                {/* Goal timing */}
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 510,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#62666d',
                      marginBottom: 8,
                    }}
                  >
                    Timing de gols
                  </div>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 6,
                      padding: 10,
                    }}
                  >
                    <div
                      className="flex items-end gap-1"
                      style={{ height: 52, marginBottom: 6 }}
                    >
                      {DEMO_BUCKETS.map((v, i) => (
                        <div
                          key={i}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: Math.round((v / maxBucket) * 44),
                              background:
                                i === 5
                                  ? '#22c55e'
                                  : 'rgba(255,255,255,0.08)',
                              borderRadius: '2px 2px 0 0',
                              transition: 'height 0.3s',
                            }}
                          />
                          <span style={{ fontSize: 6, color: '#62666d' }}>{BUCKET_LABELS[i]}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 9, color: '#62666d' }}>
                      <span style={{ color: '#22c55e' }}>76-90&apos;</span> · Més gols
                    </div>
                  </div>
                </div>
              </div>

              {/* Squad list */}
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 510,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#62666d',
                    marginBottom: 6,
                  }}
                >
                  Plantilla · Risc de sanció
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {DEMO_SQUAD.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between"
                      style={{
                        padding: '6px 8px',
                        borderRadius: 5,
                        background: p.risk ? 'rgba(251,191,36,0.05)' : 'transparent',
                        border: p.risk ? '1px solid rgba(251,191,36,0.08)' : '1px solid transparent',
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 510, color: '#d0d6e0' }}>{p.name}</span>
                      <div className="flex items-center gap-2">
                        {p.goals > 0 && (
                          <span style={{ fontSize: 11, color: '#22c55e' }}>{p.goals} gols</span>
                        )}
                        <span
                          className="flex items-center gap-1"
                          style={{ fontSize: 11, color: p.risk ? '#fbbf24' : '#62666d' }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              width: 8,
                              height: 10,
                              borderRadius: 1,
                              background: '#fbbf24',
                              opacity: p.risk ? 0.9 : 0.3,
                            }}
                          />
                          {p.yellows}
                        </span>
                        {p.risk && (
                          <span
                            style={{
                              fontSize: 8,
                              fontWeight: 510,
                              color: '#fbbf24',
                              background: 'rgba(251,191,36,0.12)',
                              padding: '2px 5px',
                              borderRadius: 3,
                              letterSpacing: '0.05em',
                            }}
                          >
                            RISC
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card footer */}
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  textAlign: 'center',
                }}
              >
                <Link
                  href="/cerca"
                  style={{ fontSize: 12, color: '#62666d', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#22c55e')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#62666d')}
                >
                  Busca el teu equip per veure l&apos;informe →
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
