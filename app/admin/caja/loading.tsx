function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--admin-surface-2)] ${className ?? ''}`} />
}

// Caja bypasses AdminLayout — skeleton mirrors its full-screen layout.
export default function CajaLoading() {
  return (
    <div className="fixed inset-0 bg-[var(--admin-bg)] flex flex-col">

      {/* Mode tabs */}
      <div className="flex border-b border-[var(--admin-border)] bg-[var(--admin-surface)] shrink-0 px-4 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-3">
            <Skeleton className="h-4 w-4 rounded-md" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: product grid */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[var(--admin-bg)]">
          {/* Search */}
          <div className="px-4 pt-4 pb-3">
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Category chips */}
          <div className="px-4 pb-3 flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-full" />
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-3 min-h-[84px] flex flex-col justify-between">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex items-center gap-2 mt-2">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending orders strip */}
          <div className="shrink-0 border-t border-[var(--admin-border)] flex items-center gap-2.5 px-4" style={{ height: 52 }}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>

        {/* Right: order builder panel (desktop only) */}
        <div className="w-[380px] shrink-0 hidden md:flex md:flex-col border-l border-[var(--admin-border)] bg-[var(--admin-surface)]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 h-[52px] border-b border-[var(--admin-border)] shrink-0">
            <Skeleton className="h-4 w-28" />
          </div>

          {/* Empty cart state */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-40">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>

          {/* Checkout button */}
          <Skeleton className="h-[52px] rounded-none" />
        </div>
      </div>

      {/* Session status bar */}
      <div className="shrink-0 border-t border-[var(--admin-border)] bg-[var(--admin-surface)] flex items-center justify-between px-4 gap-4" style={{ height: 48 }}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-lg" />
          <Skeleton className="h-7 w-28 rounded-lg" />
        </div>
      </div>

    </div>
  )
}
