import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
}

export default function CompetitionLoading() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <PublicHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-36" />
        </div>

        {/* Title */}
        <Skeleton className="h-10 w-72 mb-2" />
        <Skeleton className="h-5 w-48 mb-8" />

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-lg" />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="glass-card rounded-2xl p-5">
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
