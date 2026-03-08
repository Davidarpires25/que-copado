import { AdminLayout } from '@/components/admin/layout'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--admin-surface-2)] ${className ?? ''}`} />
}

export default function TablesLoading() {
  return (
    <AdminLayout title="Mesas" description="Configurá las mesas del restaurante">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 shadow-[var(--shadow-card)] flex flex-col items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
