import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CampsForm from './CampsForm'

interface FieldEntry {
  name: string
  fcf_venue: string | null
  team: string | null
  city: string
  address: string | null
  length_m: number
  width_m: number
  confirmed: boolean
  notes: string
}

function loadFields(): FieldEntry[] {
  try {
    const fieldsPath = path.join(process.cwd(), '..', 'data', 'fields.json')
    const raw = JSON.parse(fs.readFileSync(fieldsPath, 'utf-8'))
    return Array.isArray(raw.fields) ? raw.fields : []
  } catch {
    return []
  }
}

export default async function CampsPage() {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get('ns_admin')?.value === '1'
  if (!isAdmin) redirect('/admin/login')

  const fields = loadFields()

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Top nav */}
      <nav className="border-b border-white/8 bg-[#0a1120]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/admin" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Admin
          </Link>
          <span className="text-white/10">|</span>
          <span className="font-bold text-white text-sm">Gestió de Camps</span>
          <div className="ml-auto">
            <Link href="/" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              ← Lloc
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-black text-white mb-1">Gestió de Camps</h1>
          <p className="text-sm text-slate-500">Afegir i editar dimensions de camps per a la comparativa de camps de l'informe d'equip.</p>
        </div>

        {/* Table of existing fields */}
        <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="font-bold text-white text-sm">Camps registrats ({fields.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8 text-slate-500 text-[11px] uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Nom del camp</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Equip (FCF)</th>
                  <th className="text-center px-3 py-3 font-medium">Long.</th>
                  <th className="text-center px-3 py-3 font-medium">Amp.</th>
                  <th className="text-center px-3 py-3 font-medium">Àrea</th>
                  <th className="text-center px-3 py-3 font-medium hidden sm:table-cell">Conf.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {fields.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-600">
                      Cap camp registrat. Afegeix el primer a continuació.
                    </td>
                  </tr>
                )}
                {fields.map((f, i) => {
                  const area = f.length_m * f.width_m
                  const catColor =
                    area < 5500 ? 'text-red-400' :
                    area < 6300 ? 'text-amber-400' :
                    'text-green-400'
                  return (
                    <tr key={i} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">{f.name}</div>
                        {f.fcf_venue && (
                          <div className="text-[10px] text-slate-600 mt-0.5 truncate max-w-[200px]" title={f.fcf_venue}>
                            {f.fcf_venue}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {f.team ? (
                          <span className="text-slate-400 text-[11px]">{f.team}</span>
                        ) : (
                          <span className="text-slate-700">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-300 tabular-nums">{f.length_m}</td>
                      <td className="px-3 py-3 text-center text-slate-300 tabular-nums">{f.width_m}</td>
                      <td className={`px-3 py-3 text-center font-bold tabular-nums ${catColor}`}>
                        {area.toLocaleString('ca-ES')}
                      </td>
                      <td className="px-3 py-3 text-center hidden sm:table-cell">
                        {f.confirmed ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          <span className="text-slate-700">·</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Update form — client component */}
        <CampsForm />

        {/* Warning note */}
        <div className="px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
          <p className="text-xs text-amber-400/80">
            <span className="font-semibold text-amber-400">⚠️ Nota:</span>{' '}
            Les dades es guarden localment a <code className="font-mono text-amber-300">data/fields.json</code>. Fes commit i push per publicar els canvis.
          </p>
        </div>
      </main>
    </div>
  )
}
