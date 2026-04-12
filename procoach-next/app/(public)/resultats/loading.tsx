function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.03] rounded-lg ${className}`} />
}

export default function ResultatsLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Skeleton className="h-10 w-56 mb-2" />
      <Skeleton className="h-5 w-80 mb-8" />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-36 rounded-lg shrink-0" />
        ))}
      </div>

      {/* Result cards */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </main>
  )
}
