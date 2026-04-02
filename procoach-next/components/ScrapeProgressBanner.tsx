'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

interface JobStatus {
  jobId?: string
  status: 'not_found' | 'pending' | 'running' | 'done' | 'error'
  actas_found?: number
  actas_scraped?: number
  error_msg?: string | null
  cached?: boolean  // true when the scrape was already completed before this page load
}

interface Props {
  slug: string
  competition: string
  group: string
  teamName: string
}

export default function ScrapeProgressBanner({ slug, competition, group, teamName }: Props) {
  const router = useRouter()
  const [job, setJob] = useState<JobStatus | null>(null)
  const [triggered, setTriggered] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [hasRefreshed, setHasRefreshed] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  // Trigger scrape on mount
  useEffect(() => {
    mountedRef.current = true

    async function trigger() {
      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, competition, group, team_name: teamName }),
        })
        const data: JobStatus = await res.json()
        if (!mountedRef.current) return
        setJob(data)
        setTriggered(true)
        // If done: only refresh if there's actual scraped data from a FRESH scrape.
        // cached=true means the scrape already ran before this page load — if we
        // still have 0 players, refreshing won't help and would cause an infinite loop.
        // actas_scraped === 0 means FCF had no data → show "no data" message.
        if (data.status === 'done') {
          const hasData = (data.actas_scraped ?? 0) > 0
          const isFreshScrape = !data.cached
          if (hasData && isFreshScrape && !hasRefreshed) {
            setHasRefreshed(true)
            setReloading(true)
            setTimeout(() => {
              if (mountedRef.current) router.refresh()
            }, 800)
          }
        }
      } catch {
        if (mountedRef.current) {
          setJob({ status: 'error', error_msg: 'No s\'ha pogut iniciar el processament.' })
          setTriggered(true)
        }
      }
    }

    trigger()

    return () => {
      mountedRef.current = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [slug, competition, group, teamName])

  // Start polling once triggered
  useEffect(() => {
    if (!triggered) return
    if (job?.status === 'done' || job?.status === 'error') return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/scrape?slug=${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        })
        const data: JobStatus = await res.json()
        if (!mountedRef.current) return
        setJob(data)

        if (data.status === 'done' || data.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current)

          if (data.status === 'done') {
            const hasData = (data.actas_scraped ?? 0) > 0
            if (hasData && !hasRefreshed) {
              setHasRefreshed(true)
              setReloading(true)
              setTimeout(() => {
                if (mountedRef.current) router.refresh()
              }, 2000)
            }
          }
        }
      } catch {
        // silently ignore poll errors — will retry
      }
    }, 4000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [triggered, job?.status, slug, router])

  // ── Render ────────────────────────────────────────────────────────────────

  if (!job) {
    return (
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 flex items-center gap-3">
        <Loader2 size={18} className="text-green-400 animate-spin shrink-0" />
        <span className="text-sm text-slate-300">Iniciant processament de dades...</span>
      </div>
    )
  }

  // Done with actual data from a fresh scrape → show success / reloading
  if (reloading || (job.status === 'done' && (job.actas_scraped ?? 0) > 0 && !job.cached)) {
    return (
      <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6 flex items-center gap-3">
        {reloading ? (
          <Loader2 size={18} className="text-green-400 animate-spin shrink-0" />
        ) : (
          <CheckCircle2 size={18} className="text-green-400 shrink-0" />
        )}
        <div>
          <p className="text-sm font-semibold text-green-300">
            {reloading ? 'Recarregant...' : 'Dades processades correctament'}
          </p>
          {job.actas_scraped != null && (
            <p className="text-xs text-green-400/70 mt-0.5">
              {job.actas_scraped} actes processades
            </p>
          )}
        </div>
      </div>
    )
  }

  // Done but no usable player data (either 0 actas or cached result with no players on page)
  if (job.status === 'done' && ((job.actas_scraped ?? 0) === 0 || job.cached)) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-6 flex items-center gap-3">
        <AlertTriangle size={18} className="text-slate-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-300">Plantilla no disponible</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Encara no hi ha actes oficials publicades per aquest equip a la FCF.
          </p>
        </div>
      </div>
    )
  }

  if (job.status === 'error') {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 flex items-center gap-3">
        <AlertTriangle size={18} className="text-red-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-300">Error en processar. Torna-ho a intentar.</p>
          {job.error_msg && (
            <p className="text-xs text-red-400/60 mt-0.5 font-mono">{job.error_msg}</p>
          )}
        </div>
      </div>
    )
  }

  // pending | running | not_found
  const found = job.actas_found ?? 0
  const scraped = job.actas_scraped ?? 0
  const progress = found > 0 ? Math.round((scraped / found) * 100) : null

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 size={18} className="text-green-400 animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            Processant les dades de l&apos;equip...
          </p>
          {found > 0 ? (
            <p className="text-xs text-slate-400 mt-0.5">
              {scraped} / {found} actes processades
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">
              Cercant actes oficials a la FCF...
            </p>
          )}
        </div>
        {found > 0 && (
          <span className="text-xs font-bold text-green-400 shrink-0">
            {progress}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full transition-all duration-700"
          style={{ width: found > 0 ? `${progress}%` : '8%' }}
        />
      </div>

      <p className="text-[11px] text-slate-500 mt-3">
        Les dades detallades de plantilla provenen de les actes oficials de la FCF.
        Aquest procés pot trigar entre 30 i 90 segons.
      </p>
    </div>
  )
}
