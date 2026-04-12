function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.03] rounded-lg ${className}`} />
}

export default function ArbitreLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Header */}
      <div className="v2-card rounded-lg p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>

      {/* Content */}
      <Skeleton className="h-80 rounded-lg" />
    </main>
  )
}
