'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

/* ── Story data ── */
const STORIES = [
  // ── Story 1: Provocacion directa ──
  {
    id: 'jornada-1',
    serie: 'Jornada',
    bg: 'from-[#0a0a0a] to-[#0a0a0a]',
    content: (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <p className="text-red-400 text-xs font-bold tracking-[0.3em] uppercase mb-10">Pregunta sincera</p>
        <h2 className="text-[2.2rem] font-black text-white leading-[1.15] mb-8">
          Com prepares<br />
          el partit de<br />
          <span className="text-amber-400">la setmana vinent?</span>
        </h2>
        <div className="w-12 h-0.5 bg-white/15 my-4" />
        <p className="text-lg text-slate-400 leading-relaxed mb-4">
          Busques actes a la FCF?
        </p>
        <p className="text-lg text-slate-400 leading-relaxed mb-4">
          Preguntes a alg&uacute; del poble?
        </p>
        <p className="text-lg text-slate-400 leading-relaxed">
          O directament...
          <br />
          <span className="text-white font-bold">no el prepares?</span>
        </p>
        <p className="text-slate-600 text-xs mt-auto mb-8">neoscout.es</p>
      </div>
    ),
  },

  // ── Story 2: El dato que duele ──
  {
    id: 'jornada-2',
    serie: 'Jornada',
    bg: 'from-[#0f172a] to-[#1a0a0a]',
    content: (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <p className="text-slate-500 text-xs font-bold tracking-[0.3em] uppercase mb-8">Mentrestant...</p>
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-8 w-full max-w-xs">
          <p className="text-green-400 text-sm font-bold mb-3">L&apos;entrenador del rival</p>
          <div className="space-y-2.5 text-left">
            <div className="flex items-center gap-2">
              <span className="text-green-400">&#10003;</span>
              <span className="text-white text-sm">Sap el vostre XI probable</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">&#10003;</span>
              <span className="text-white text-sm">Sap quan marqueu els gols</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">&#10003;</span>
              <span className="text-white text-sm">Sap quins jugadors teniu apercebits</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">&#10003;</span>
              <span className="text-white text-sm">Ja ha vist l&apos;informe de l&apos;&agrave;rbitre</span>
            </div>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 w-full max-w-xs">
          <p className="text-red-400 text-sm font-bold mb-3">Tu</p>
          <div className="flex items-center gap-2">
            <span className="text-red-400">&#10007;</span>
            <span className="text-slate-400 text-sm">Encara no has mirat res</span>
          </div>
        </div>
        <p className="text-slate-600 text-xs mt-auto mb-8">neoscout.es</p>
      </div>
    ),
  },

  // ── Story 3: Lo que tarda ──
  {
    id: 'jornada-3',
    serie: 'Jornada',
    bg: 'from-[#0a0a0a] to-[#0f172a]',
    content: (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <p className="text-cyan-400 text-xs font-bold tracking-[0.3em] uppercase mb-10">Temps real</p>
        <div className="space-y-6 w-full max-w-xs mb-10">
          <div className="text-left">
            <p className="text-slate-500 text-xs mb-1">Buscar actes a la FCF</p>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full" style={{ width: '90%' }} />
            </div>
            <p className="text-red-400 text-xs mt-1 text-right font-bold">~2 hores</p>
          </div>
          <div className="text-left">
            <p className="text-slate-500 text-xs mb-1">Apuntar dades en una llibreta</p>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '50%' }} />
            </div>
            <p className="text-amber-400 text-xs mt-1 text-right font-bold">~1 hora</p>
          </div>
          <div className="text-left">
            <p className="text-slate-500 text-xs mb-1">Preguntar a contactes</p>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '40%' }} />
            </div>
            <p className="text-amber-400 text-xs mt-1 text-right font-bold">~45 min</p>
          </div>
          <div className="w-full h-px bg-white/10" />
          <div className="text-left">
            <p className="text-green-400 text-xs mb-1 font-bold">Amb NeoScout</p>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full" style={{ width: '5%' }} />
            </div>
            <p className="text-green-400 text-xs mt-1 text-right font-black">5 minuts</p>
          </div>
        </div>
        <p className="text-2xl font-black text-white">
          Mateixa info.<br />
          <span className="text-green-400">Menys temps.</span>
        </p>
        <p className="text-slate-600 text-xs mt-auto mb-8">neoscout.es</p>
      </div>
    ),
  },

  // ── Story 4: Que ves exactament ──
  {
    id: 'jornada-4',
    serie: 'Jornada',
    bg: 'from-[#0f172a] to-[#1e293b]',
    content: (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <p className="text-green-400 text-xs font-bold tracking-[0.3em] uppercase mb-6">Aix&ograve; &eacute;s el que veur&agrave;s</p>
        <div className="space-y-2.5 w-full max-w-xs mb-6">
          {[
            { emoji: '&#128101;', text: 'XI probable del rival', sub: 'Basat en titularitats reals' },
            { emoji: '&#9888;&#65039;', text: 'Jugadors apercebits', sub: 'A 1 groga de sanci\u00F3' },
            { emoji: '&#128202;', text: 'Quan marquen els gols', sub: 'Per franges de 15 minuts' },
            { emoji: '&#127968;', text: 'Local vs Visitant', sub: 'On rendeixen m\u00E9s' },
            { emoji: '&#128110;', text: 'Informe de l\u2019\u00E0rbitre', sub: 'Estricte? Permissiu? Dades reals' },
            { emoji: '&#128196;', text: 'PDF per enviar al grup', sub: 'Comparteix amb el teu equip' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl p-3 text-left">
              <span className="text-xl shrink-0" dangerouslySetInnerHTML={{ __html: f.emoji }} />
              <div>
                <p className="text-white text-sm font-bold leading-tight">{f.text}</p>
                <p className="text-slate-500 text-[10px]">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-white text-lg font-black mb-1">
          Tot autom&agrave;tic. Tot gratis.
        </p>
        <p className="text-slate-400 text-sm mb-6">Dades oficials de la FCF.</p>
        <div className="px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 rounded-full text-white font-bold">
          neoscout.es &uarr;
        </div>
      </div>
    ),
  },

  // ── Story 5: Ejemplo real de arbitro ──
  {
    id: 'jornada-5',
    serie: 'Jornada',
    bg: 'from-[#0f172a] to-[#1e293b]',
    content: (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <p className="text-amber-400 text-xs font-bold tracking-[0.3em] uppercase mb-4">Exemple real</p>
        <p className="text-slate-400 text-sm mb-6">Aix&ograve; &eacute;s el que saps del teu &agrave;rbitre ABANS del partit:</p>
        {/* Simulated gauge */}
        <div className="relative w-40 h-40 mb-4">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#1e293b" strokeWidth="12" />
            <circle
              cx="100" cy="100" r="80" fill="none"
              stroke="url(#gauge-grad-5)" strokeWidth="12"
              strokeDasharray="502" strokeDashoffset="125"
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
            />
            <defs>
              <linearGradient id="gauge-grad-5" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            <text x="100" y="90" textAnchor="middle" className="fill-white text-4xl font-black">72</text>
            <text x="100" y="115" textAnchor="middle" className="fill-amber-400 text-xs font-bold">ESTRICTE</text>
          </svg>
        </div>
        <div className="space-y-2 w-full max-w-xs mb-6">
          <div className="flex justify-between items-center bg-white/5 rounded-lg px-4 py-2.5">
            <span className="text-slate-400 text-xs">Grogues/partit</span>
            <span className="text-amber-400 font-black text-lg">4.2</span>
          </div>
          <div className="flex justify-between items-center bg-white/5 rounded-lg px-4 py-2.5">
            <span className="text-slate-400 text-xs">Vermelles/partit</span>
            <span className="text-red-400 font-black text-lg">0.6</span>
          </div>
          <div className="flex justify-between items-center bg-white/5 rounded-lg px-4 py-2.5">
            <span className="text-slate-400 text-xs">M&eacute;s estricte al 2n temps</span>
            <span className="text-red-400 font-black text-lg">67%</span>
          </div>
        </div>
        <p className="text-white text-base font-bold mb-2">
          Sabent aix&ograve;, avisaries als teus jugadors?
        </p>
        <p className="text-green-400 text-sm font-bold">Nosaltres s&iacute;.</p>
        <div className="mt-4 px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 rounded-full text-white font-bold">
          Mira el teu &agrave;rbitre &uarr;
        </div>
        <p className="text-slate-600 text-xs mt-3">neoscout.es</p>
      </div>
    ),
  },

  // ── Story 6: Urgencia + FOMO ──
  {
    id: 'jornada-6',
    serie: 'Jornada',
    bg: 'from-[#1a0a0a] to-[#0a0a0a]',
    content: (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center mb-6">
          <span className="text-5xl">&#9200;</span>
        </div>
        <h2 className="text-3xl font-black text-white leading-tight mb-3">
          La jornada<br />&eacute;s aquest<br />
          <span className="text-red-400">cap de setmana.</span>
        </h2>
        <div className="w-12 h-0.5 bg-white/15 my-5" />
        <div className="space-y-3 mb-8">
          <p className="text-slate-300 text-base">
            L&apos;entrenador del rival <span className="text-green-400 font-bold">ja ha mirat les teves dades.</span>
          </p>
          <p className="text-slate-300 text-base">
            Ja sap <span className="text-amber-400 font-bold">qui juga, qui marca, qui t&eacute; grogues.</span>
          </p>
          <p className="text-white text-lg font-bold mt-4">
            Tu tamb&eacute; pots saber-ho.
          </p>
        </div>
        <div className="px-8 py-4 bg-gradient-to-r from-green-600 to-cyan-600 rounded-full text-white font-black text-xl shadow-lg shadow-green-500/30">
          Prepara el partit ara &uarr;
        </div>
        <p className="text-slate-600 text-xs mt-4">neoscout.es &middot; Gratis per entrenadors</p>
      </div>
    ),
  },

  // ── Story 7: Testimoni/social proof entrenador ──
  {
    id: 'jornada-7',
    serie: 'Jornada',
    bg: 'from-[#0f172a] to-[#0a1628]',
    content: (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <p className="text-green-400 text-xs font-bold tracking-[0.3em] uppercase mb-8">Entrenadors que ja ho fan servir</p>
        <div className="space-y-4 w-full max-w-xs mb-8">
          <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
            <p className="text-white text-sm italic leading-relaxed mb-3">
              &ldquo;Abans perdia 2 hores buscant actes. Ara en 5 minuts tinc l&apos;informe del rival i el comparteixo al grup de WhatsApp de l&apos;equip.&rdquo;
            </p>
            <p className="text-slate-500 text-xs">Entrenador — Segona Catalana</p>
          </div>
          <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
            <p className="text-white text-sm italic leading-relaxed mb-3">
              &ldquo;El tema de l&apos;&agrave;rbitre &eacute;s brutal. Vaig avisar als jugadors que era estricte i vam acabar sense cap groga.&rdquo;
            </p>
            <p className="text-slate-500 text-xs">Entrenador — Tercera Catalana</p>
          </div>
        </div>
        <p className="text-white text-lg font-bold mb-1">No siguis l&apos;&uacute;ltim.</p>
        <p className="text-slate-400 text-sm mb-6">La resta ja preparen els partits aix&iacute;.</p>
        <div className="px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-600 rounded-full text-white font-bold">
          Prova-ho gratis &uarr;
        </div>
        <p className="text-slate-600 text-xs mt-4">neoscout.es</p>
      </div>
    ),
  },

  // ── Story 8: CTA final directe ──
  {
    id: 'jornada-8',
    serie: 'Jornada',
    bg: 'from-[#0a0a0a] to-[#0a1628]',
    content: (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center mb-8 shadow-lg shadow-green-500/30">
          <span className="text-3xl font-black text-white">N</span>
        </div>
        <h2 className="text-3xl font-black text-white leading-tight mb-4">
          Entra.<br />
          Cerca el teu equip.<br />
          <span className="text-green-400">Prepara el partit.</span>
        </h2>
        <div className="w-12 h-0.5 bg-white/15 my-5" />
        <div className="space-y-2 mb-8">
          <p className="text-slate-300 text-base flex items-center justify-center gap-2">
            <span className="text-green-400">&#10003;</span> 30 segons per registrar-te
          </p>
          <p className="text-slate-300 text-base flex items-center justify-center gap-2">
            <span className="text-green-400">&#10003;</span> 100% gratis
          </p>
          <p className="text-slate-300 text-base flex items-center justify-center gap-2">
            <span className="text-green-400">&#10003;</span> Sense spam ni compromisos
          </p>
          <p className="text-slate-300 text-base flex items-center justify-center gap-2">
            <span className="text-green-400">&#10003;</span> Dades oficials FCF
          </p>
        </div>
        <div className="w-full max-w-xs bg-white/5 border border-green-500/30 rounded-2xl p-5 mb-6">
          <p className="text-green-400 text-2xl font-black mb-1">neoscout.es</p>
          <p className="text-slate-400 text-xs">Enlla&ccedil; a la bio</p>
        </div>
        <p className="text-slate-400 text-sm">
          El teu rival ja s&apos;est&agrave; preparant.
          <br />
          <span className="text-white font-bold">I tu?</span>
        </p>
      </div>
    ),
  },
]

export default function StoriesPage() {
  const [active, setActive] = useState(0)

  const handleDownload = async () => {
    const el = document.getElementById(`story-${STORIES[active].id}`)
    if (!el) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(el, {
        width: 1080,
        height: 1920,
        scale: 1,
        backgroundColor: '#000',
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `neoscout-story-${STORIES[active].id}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Error generating story image:', err)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Instagram Stories — Jornada</h1>
        <p className="text-slate-400 text-sm mb-8">8 stories seqüencials: ganxo → FOMO → valor → urgència → CTA. Publicar en ordre.</p>

        {/* Thumbnails */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-8">
          {STORIES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActive(i)}
              className={`aspect-[9/16] rounded-xl border-2 overflow-hidden transition-all ${
                i === active ? 'border-green-500 scale-105' : 'border-white/10 opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-full h-full bg-gradient-to-b ${s.bg} flex items-center justify-center`}>
                <span className="text-xs text-white/60 font-bold">{i + 1}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Active story preview */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-slate-400">
              Story {active + 1}/{STORIES.length}
            </span>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition-all"
            >
              <Download size={14} />
              Descarregar PNG
            </button>
          </div>

          {/* Story card — 9:16 aspect ratio */}
          <div
            id={`story-${STORIES[active].id}`}
            className={`w-[360px] h-[640px] bg-gradient-to-b ${STORIES[active].bg} rounded-3xl overflow-hidden shadow-2xl shadow-black/50`}
            style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
          >
            {STORIES[active].content}
          </div>

          {/* Caption suggestion */}
          <div className="mt-6 w-full max-w-md bg-white/4 border border-white/8 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-2 font-bold">Copy suggerit pel caption:</p>
            <p className="text-sm text-slate-300">
              {[
                "Com prepares el partit de la setmana vinent? La majoria d'entrenadors no ho fan. Els que guanyen, sí. neoscout.es",
                "L'entrenador del rival ja sap tot sobre el teu equip. Tu saps alguna cosa d'ell? neoscout.es — gratis per entrenadors",
                "2 hores buscant actes... o 5 minuts amb NeoScout. Tu tries. neoscout.es",
                "XI probable, goleadors, àrbitre, apercebits... Tot del teu rival. Automàtic i gratis. neoscout.es",
                "Sabies que el teu àrbitre posa 4.2 grogues per partit? Avisa els teus jugadors. neoscout.es",
                "La jornada és dissabte. Encara no has preparat el rival? 5 minuts. neoscout.es",
                "No siguis l'últim entrenador que encara prepara els partits amb una llibreta. neoscout.es",
                "Entra. Cerca el teu equip. Prepara el partit. 30 segons, 100% gratis. neoscout.es — Enllaç a la bio",
              ][active]}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
