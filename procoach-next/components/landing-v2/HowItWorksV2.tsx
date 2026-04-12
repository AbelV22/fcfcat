'use client'

import { Search, Crosshair, ClipboardCheck } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: <Search size={20} />,
    title: 'Busca el teu equip',
    description:
      'Escriu el nom del teu club i selecciona la categoria. En tres segons tens el teu panell.',
  },
  {
    number: '02',
    icon: <Crosshair size={20} />,
    title: 'Analitza el rival',
    description:
      'Consulta golejadors, apercebuts i patrons de gol del teu proper adversari. Tot automàtic.',
  },
  {
    number: '03',
    icon: <ClipboardCheck size={20} />,
    title: 'Prepara el partit',
    description:
      'Pren notes, revisa la plantilla i arriba al dissabte amb tota la informació.',
  },
]

export default function HowItWorksV2() {
  return (
    <section
      style={{
        background: '#08090a',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontFamily: 'var(--font-inter)',
      }}
    >
      <div
        className="max-w-[1200px] mx-auto px-6"
        style={{ paddingTop: 80, paddingBottom: 80 }}
      >
        {/* Section header */}
        <div style={{ marginBottom: 56 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 510,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#22c55e',
              marginBottom: 12,
            }}
          >
            Com funciona
          </div>
          <h2
            style={{
              fontSize: 'clamp(28px, 3vw, 40px)',
              fontWeight: 510,
              letterSpacing: '-0.02em',
              color: '#f7f8f8',
              lineHeight: 1.1,
            }}
          >
            Tres passos per arribar preparat
          </h2>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="relative"
              style={{
                padding: '0 32px 0 0',
              }}
            >
              {/* Connector line — only between steps on desktop */}
              {i < STEPS.length - 1 && (
                <div
                  className="hidden lg:block absolute top-[18px] right-0"
                  style={{
                    width: 32,
                    height: 1,
                    background: 'rgba(255,255,255,0.06)',
                  }}
                />
              )}

              {/* Step number + icon row */}
              <div
                className="flex items-center gap-3"
                style={{ marginBottom: 20 }}
              >
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 510,
                    color: '#22c55e',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {step.number}
                </span>
                <div
                  style={{
                    color: '#62666d',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {step.icon}
                </div>
              </div>

              {/* Title */}
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 510,
                  color: '#f7f8f8',
                  marginBottom: 8,
                  lineHeight: 1.3,
                  letterSpacing: '-0.01em',
                }}
              >
                {step.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: '#8a8f98',
                  lineHeight: 1.6,
                  maxWidth: 320,
                }}
              >
                {step.description}
              </p>

              {/* Mobile separator */}
              {i < STEPS.length - 1 && (
                <div
                  className="lg:hidden"
                  style={{
                    height: 1,
                    background: 'rgba(255,255,255,0.05)',
                    margin: '32px 0',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
