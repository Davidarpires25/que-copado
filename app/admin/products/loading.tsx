import { AdminLayout } from '@/components/admin/layout'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--admin-surface-2)] ${className ?? ''}`} />
}

export default function ProductsLoading() {
  return (
    <AdminLayout title="Productos" description="Gestiona el catálogo de productos">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
