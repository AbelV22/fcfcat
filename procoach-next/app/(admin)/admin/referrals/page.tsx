'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Users, Gift, Crown, Plus, Minus, ArrowLeft, RefreshCw, Check, X } from 'lucide-react'

interface UserRef {
  user_id: string
  referral_code: string
  referral_count: number
  pro_unlocked: boolean
  created_at: string
  email: string
  name: string
}

interface Referral {
  referrer_id: string
  referred_id: string
  referral_code: string
  created_at: string
}

export default function AdminReferralsPage() {
  const [users, setUsers] = useState<UserRef[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [emailMap, setEmailMap] = useState<Record<string, { email: string; name: string }>>({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/referrals')
      const data = await res.json()
      if (data.users) setUsers(data.users)
      if (data.referrals) setReferrals(data.referrals)
      if (data.emailMap) setEmailMap(data.emailMap)
    } catch {
      setMessage({ text: 'Error carregant dades', type: 'err' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const doAction = async (body: Record<string, unknown>) => {
    const key = JSON.stringify(body)
    setActionLoading(key)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) {
        setMessage({ text: data.error, type: 'err' })
      } else {
        setMessage({ text: 'Acció completada', type: 'ok' })
        fetchData()
      }
    } catch {
      setMessage({ text: 'Error de xarxa', type: 'err' })
    } finally {
      setActionLoading(null)
    }
  }

  const adjustCount = (userId: string, current: number, delta: number) => {
    const newCount = Math.max(0, current + delta)
    doAction({ action: 'set_count', user_id: userId, count: newCount })
  }

  const togglePro = (userId: string, current: boolean) => {
    doAction({ action: 'set_pro', user_id: userId, pro: !current })
  }

  const getEmail = (id: string) => emailMap[id]?.email || '?'
  const getName = (id: string) => emailMap[id]?.name || ''

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <nav className="border-b border-white/8 bg-[#0a1120]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <span className="font-black text-green-400 text-sm">NeoScout Admin</span>
          <span className="text-white/10">|</span>
          <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft size={12} className="inline mr-1" />
            Admin
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-3">
              <Gift size={24} className="text-cyan-400" />
              Gestió de Referits
            </h1>
            <p className="text-sm text-slate-500">{users.length} usuaris · {referrals.length} referits totals</p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualitzar
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-3 rounded-xl text-sm flex items-center gap-2 ${message.type === 'ok' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {message.type === 'ok' ? <Check size={14} /> : <X size={14} />}
            {message.text}
          </div>
        )}

        {/* Users table */}
        <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-white/8">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              Usuaris amb codi de referit
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-white/8">
                  <th className="text-left py-3 px-4">Usuari</th>
                  <th className="text-center py-3 px-4">Codi</th>
                  <th className="text-center py-3 px-4">Referits</th>
                  <th className="text-center py-3 px-4">PRO</th>
                  <th className="text-center py-3 px-4">Accions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-500">Carregant...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-500">Cap usuari trobat</td></tr>
                ) : users.map(u => (
                  <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/3">
                    <td className="py-3 px-4">
                      <div className="text-white font-medium text-sm">{u.name || '—'}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-xs bg-white/5 px-2 py-1 rounded-lg text-cyan-400">{u.referral_code}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => adjustCount(u.user_id, u.referral_count, -1)}
                          disabled={u.referral_count === 0 || actionLoading !== null}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center disabled:opacity-30 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-bold text-white w-6 text-center">{u.referral_count}</span>
                        <button
                          onClick={() => adjustCount(u.user_id, u.referral_count, 1)}
                          disabled={actionLoading !== null}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-green-500/20 flex items-center justify-center disabled:opacity-30 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => togglePro(u.user_id, u.pro_unlocked)}
                        disabled={actionLoading !== null}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                          u.pro_unlocked
                            ? 'bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/20'
                            : 'bg-white/5 text-slate-500 border border-white/10 hover:bg-green-500/15 hover:text-green-400 hover:border-green-500/20'
                        }`}
                      >
                        <Crown size={10} />
                        {u.pro_unlocked ? 'PRO' : 'Free'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          const count = prompt(`Establir nombre de referits per ${u.name || u.email}:`, String(u.referral_count))
                          if (count !== null && !isNaN(Number(count))) {
                            doAction({ action: 'set_count', user_id: u.user_id, count: Number(count) })
                          }
                        }}
                        className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Referrals history */}
        <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Gift size={16} className="text-slate-400" />
              Historial de referits
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-white/8">
                  <th className="text-left py-3 px-4">Referidor</th>
                  <th className="text-left py-3 px-4">Referit</th>
                  <th className="text-center py-3 px-4">Codi</th>
                  <th className="text-right py-3 px-4">Data</th>
                </tr>
              </thead>
              <tbody>
                {referrals.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-500">Cap referit encara</td></tr>
                ) : referrals.map((r, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/3">
                    <td className="py-3 px-4">
                      <div className="text-white text-sm">{getName(r.referrer_id) || getEmail(r.referrer_id)}</div>
                      <div className="text-xs text-slate-500">{getEmail(r.referrer_id)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white text-sm">{getName(r.referred_id) || getEmail(r.referred_id)}</div>
                      <div className="text-xs text-slate-500">{getEmail(r.referred_id)}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-xs text-slate-400">{r.referral_code}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleDateString('ca-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
