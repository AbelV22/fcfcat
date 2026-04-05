'use client'

import { useState, useEffect, useCallback } from 'react'
import { Gift, Copy, Check, Share2, Users, Lock, Unlock } from 'lucide-react'

interface ReferralData {
  referral_code: string
  referral_count: number
  pro_unlocked: boolean
  target: number
}

export default function ReferralCard() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/referral')
      .then(r => r.json())
      .then(d => {
        if (d.referral_code) setData(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const referralUrl = data ? `https://neoscout.es/registre?ref=${data.referral_code}` : ''

  const handleCopy = useCallback(() => {
    if (!referralUrl) return
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [referralUrl])

  const handleWhatsApp = useCallback(() => {
    if (!referralUrl) return
    const text = `Prova NeoScout! Analitza el teu rival i el teu arbitre gratis. Registra't aqui: ${referralUrl}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }, [referralUrl])

  if (loading) return null

  if (!data) return null

  const progress = Math.min(data.referral_count / data.target, 1)
  const remaining = Math.max(data.target - data.referral_count, 0)

  return (
    <div className="glass-card rounded-2xl p-6 mb-8 border-cyan-500/20">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 flex items-center justify-center shrink-0">
          <Gift size={22} className="text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white mb-1">
            {data.pro_unlocked
              ? 'PRO desbloquejat!'
              : 'Convida entrenadors, desbloqueja PRO'
            }
          </h2>
          <p className="text-sm text-slate-400">
            {data.pro_unlocked
              ? "Ja tens acces a totes les funcionalitats PRO. Gracies per compartir!"
              : `Convida ${remaining} entrenador${remaining !== 1 ? 's' : ''} mes per desbloquejar l'Informe Pro d'Arbitre i mes.`
            }
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-400" />
            <span className="text-sm text-slate-300">
              {data.referral_count} / {data.target} convidats
            </span>
          </div>
          {data.pro_unlocked ? (
            <div className="flex items-center gap-1 text-green-400">
              <Unlock size={14} />
              <span className="text-xs font-bold">PRO ACTIU</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-slate-500">
              <Lock size={14} />
              <span className="text-xs">PRO bloquejat</span>
            </div>
          )}
        </div>
        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              data.pro_unlocked
                ? 'bg-gradient-to-r from-green-500 to-cyan-500'
                : 'bg-gradient-to-r from-cyan-600 to-green-600'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {/* Milestone dots */}
        <div className="flex justify-between mt-1.5 px-1">
          {Array.from({ length: data.target }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i < data.referral_count ? 'bg-green-400' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Referral link + share */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 min-w-0">
          <span className="text-xs text-slate-500 truncate flex-1 font-mono">
            neoscout.es/registre?ref={data.referral_code}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Copiar enlla\u00E7"
          >
            {copied ? (
              <Check size={14} className="text-green-400" />
            ) : (
              <Copy size={14} className="text-slate-400" />
            )}
          </button>
        </div>
        <button
          onClick={handleWhatsApp}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-bold rounded-xl transition-all shrink-0"
        >
          <Share2 size={14} />
          <span>WhatsApp</span>
        </button>
      </div>

      {/* What you unlock */}
      {!data.pro_unlocked && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-slate-500 mb-2">Que desbloquejares:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'Informe arbitral complet',
              'Comparativa de camps',
              'Percentils arbitrals',
            ].map(f => (
              <span key={f} className="text-xs px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
