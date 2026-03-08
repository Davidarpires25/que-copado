import { AdminLayout } from '@/components/admin/layout'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--admin-surface-2)] ${className ?? ''}`} />
}

export default function CategoriesLoading() {
  return (
    <AdminLayout title="Categorías" description="Gestiona las categorías de productos">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Category cards */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 shadow-[var(--shadow-card)] flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-12 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
