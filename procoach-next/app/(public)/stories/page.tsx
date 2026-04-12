'use client'

import { useState, useRef } from 'react'
import { Download, Upload } from 'lucide-react'
import { toPng } from 'html-to-image'

/* ── Phone mockup ── */
function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto shrink-0" style={{ width: 180, height: 380 }}>
      <div
        className="absolute inset-0 rounded-[1.8rem] border-[2.5px] border-white/[0.08]/80 bg-black"
        style={{ boxShadow: '0 0 0 1.5px rgba(255,255,255,0.04), 0 20px 50px rgba(0,0,0,0.7)' }}
      >
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-black rounded-full z-10" />
        <div className="absolute inset-[2.5px] rounded-[1.55rem] overflow-hidden bg-[#0f1011]">
          {children}
        </div>
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-white/[0.06] rounded-full" />
      </div>
    </div>
  )
}

export default function StoriesPage() {
  const [active, setActive] = useState(0)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshot(URL.createObjectURL(file))
  }

  const handleDownload = async () => {
    const el = document.getElementById(`story-${active}`)
    if (!el) return
    try {
      // El div mide 360x640 en pantalla. pixelRatio=3 genera 1080x1920.
      const dataUrl = await toPng(el, {
        pixelRatio: 3,
        backgroundColor: '#000',
      })
      const link = document.createElement('a')
      link.download = `neoscout-story-${active + 1}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const screenContent = screenshot ? (
    <img src={screenshot} alt="NeoScout" className="w-full h-full object-cover object-top" />
  ) : (
    <button
      onClick={() => inputRef.current?.click()}
      className="w-full h-full flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors"
    >
      <Upload size={28} className="text-[#8a8f98]" />
      <span className="text-[#8a8f98] text-[9px] text-center px-6 leading-tight">
        Puja la captura del informe rival
      </span>
    </button>
  )

  const stories = [
    // ── Story 1: FOMO ──
    <div key="s1" className="flex flex-col items-center h-full px-5 pt-6 pb-4 text-center">
      <p className="text-red-400 text-[9px] font-bold tracking-[0.3em] uppercase mb-2">Saps qu&egrave;?</p>
      <h2 className="text-[1.15rem] font-black text-white leading-tight mb-1">
        Aix&ograve; &eacute;s el que sap<br />
        <span className="text-red-400">l&apos;entrenador del rival</span><br />
        del teu equip.
      </h2>
      <p className="text-[#8a8f98] text-[10px] mb-3">Patrons de joc, gols per minut, tend&egrave;ncies...</p>
      <PhoneMockup>{screenContent}</PhoneMockup>
      <div className="mt-auto pt-2">
        <p className="text-white text-xs font-bold mb-0.5">Tu tamb&eacute; la pots tenir.</p>
        <p className="text-green-400 text-base font-black">Gratis.</p>
        <p className="text-[#62666d] text-[9px] mt-1">neoscout.es</p>
      </div>
    </div>,

    // ── Story 2: CTA ──
    <div key="s2" className="flex flex-col items-center h-full px-5 pt-6 pb-4 text-center">
      <h2 className="text-[1.1rem] font-black text-white leading-tight mb-0.5">
        No et quedis enrere.<br />
        <span className="text-green-400">Prepara ja el pr&ograve;xim partit.</span>
      </h2>
      <p className="text-[#8a8f98] text-[10px] mb-2">5 minuts. Dades reals de la FCF. 100% gratis.</p>
      <PhoneMockup>{screenContent}</PhoneMockup>
      <div className="mt-auto pt-2">
        <div className="px-5 py-2 bg-gradient-to-r bg-[#22c55e] rounded-full text-white font-bold text-xs mb-1.5">
          Entra ara — Gratis per entrenadors &uarr;
        </div>
        <div className="bg-white/5 border border-green-500/30 rounded-xl px-3 py-1.5 inline-block">
          <p className="text-green-400 text-base font-black">neoscout.es</p>
          <p className="text-[#8a8f98] text-[8px]">Enlla&ccedil; a la bio</p>
        </div>
      </div>
    </div>,
  ]

  const captions = [
    "Això és el que sap l'entrenador del rival de tu. Patrons de joc, gols per minut, tendències... Tu també ho pots saber. Gratis. 👉 neoscout.es",
    "No et quedis enrere. Prepara ja el pròxim partit en 5 minuts amb dades reals de la FCF. Gratis per entrenadors. 👉 neoscout.es — Enllaç a la bio",
  ]

  return (
    <div className="min-h-screen bg-[#0f1011] text-white">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Instagram Stories</h1>
        <p className="text-[#8a8f98] text-sm mb-6">2 stories amb la captura real del informe. Puja la captura i descarrega els PNG.</p>

        {/* Upload button if no screenshot */}
        {!screenshot && (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full mb-6 flex items-center justify-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-4 hover:bg-amber-500/15 transition-colors"
          >
            <Upload size={18} className="text-amber-400" />
            <span className="text-amber-400 text-sm font-bold">Puja la captura de pantalla del informe rival</span>
          </button>
        )}

        {screenshot && (
          <div className="mb-6 flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-green-400 text-sm">Captura carregada</span>
            <button
              onClick={() => inputRef.current?.click()}
              className="ml-auto text-[#8a8f98] text-xs hover:text-white transition-colors"
            >
              Canviar
            </button>
          </div>
        )}

        {/* Story selector */}
        <div className="flex gap-3 mb-6">
          {['Story 1 — FOMO', 'Story 2 — CTA'].map((label, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                i === active
                  ? 'bg-green-600 text-white'
                  : 'bg-white/5 text-[#8a8f98] hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Story preview */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-xl transition-all"
            >
              <Download size={14} />
              Descarregar PNG
            </button>
          </div>

          <div
            id={`story-${active}`}
            className="w-[360px] h-[640px] bg-gradient-to-b from-[#0a0a0a] to-[#0f1011] rounded-lg overflow-hidden shadow-2xl shadow-black/50"
            style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
          >
            {stories[active]}
          </div>

          {/* Caption */}
          <div className="mt-6 w-full max-w-md bg-white/4 border border-white/8 rounded-xl p-4">
            <p className="text-xs text-[#8a8f98] mb-2 font-bold">Copy pel caption:</p>
            <p className="text-sm text-[#d0d6e0]">{captions[active]}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
