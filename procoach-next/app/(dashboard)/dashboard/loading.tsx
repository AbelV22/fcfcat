function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
}

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
      {/* Welcome */}
      <div className="mb-10">
        <Skeleton className="h-9 w-64 mb-3" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Setup CTA */}
      <Skeleton className="h-32 rounded-lg mb-8" />

      {/* Cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
