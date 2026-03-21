import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CampsForm from './CampsForm'
import { getAllTeamsFromJSON } from '@/lib/data'

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
  const teams = getAllTeamsFromJSON()

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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-black text-white mb-1">Gestió de Camps</h1>
          <p className="text-sm text-slate-500">
            Afegeix i edita les dimensions dels camps. Busca un equip per assignar-li automàticament el seu estadi.
          </p>
        </div>

        <CampsForm fields={fields} teams={teams} />

        {/* Warning note */}
        <div className="px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
          <p className="text-xs text-amber-400/80">
            <span className="font-semibold text-amber-400">⚠️ Nota:</span>{' '}
            Les dades es guarden localment a <code className="font-mono text-amber-300">data/fields.json</code>. Fes commit i push per publicar els canvis al servidor.
          </p>
        </div>
      </main>
    </div>
  )
}
