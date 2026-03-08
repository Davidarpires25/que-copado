import { AdminLayout } from '@/components/admin/layout'

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-[var(--admin-surface-2)] ${className ?? ''}`} />
  )
}

export default function StockLoading() {
  return (
    <AdminLayout title="Control de Stock" description="Gestiona el inventario de ingredientes y productos">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-4">
        <div />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-72 rounded-lg" />

        {/* Table skeleton */}
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden">
          <div className="p-4 border-b border-[var(--admin-border)] flex gap-3">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
          <div className="divide-y divide-[var(--admin-border)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
