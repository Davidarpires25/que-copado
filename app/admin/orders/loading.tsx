import { AdminLayout } from '@/components/admin/layout'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--admin-surface-2)] ${className ?? ''}`} />
}

export default function OrdersLoading() {
  return (
    <AdminLayout title="Pedidos" description="Gestiona los pedidos de tu negocio">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Skeleton className="h-10 flex-1" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="border-b border-[var(--admin-border)] px-4 py-3 flex gap-6">
          {['w-16', 'w-24', 'w-32', 'w-16', 'w-20', 'w-16'].map((w, i) => (
            <Skeleton key={i} className={`h-4 ${w}`} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3.5 border-b border-[var(--admin-border)] last:border-0">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-3 w-10" />
            </div>
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-40 hidden sm:block" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-7 w-7 rounded-md ml-auto" />
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
