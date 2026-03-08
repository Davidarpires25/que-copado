import { AdminLayout } from '@/components/admin/layout'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--admin-surface-2)] ${className ?? ''}`} />
}

export default function DeliveryZonesLoading() {
  return (
    <AdminLayout title="Zonas de Entrega" description="Configurá las zonas de delivery">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zone list */}
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 shadow-[var(--shadow-card)] space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Map placeholder */}
        <div className="lg:col-span-2">
          <Skeleton className="h-[420px] w-full rounded-xl" />
        </div>
      </div>
    </AdminLayout>
  )
}
