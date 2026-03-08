import { AdminLayout } from '@/components/admin/layout'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--admin-surface-2)] ${className ?? ''}`} />
}

export default function IngredientsLoading() {
  return (
    <AdminLayout title="Ingredientes" description="Gestiona los ingredientes del menú">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="border-b border-[var(--admin-border)] px-4 py-3 flex gap-6">
          {['w-32', 'w-16', 'w-20', 'w-20', 'w-16', 'w-16'].map((w, i) => (
            <Skeleton key={i} className={`h-3.5 ${w}`} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3.5 border-b border-[var(--admin-border)] last:border-0">
            <Skeleton className="h-4 w-36 flex-1" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <div className="flex gap-1.5 ml-auto">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
