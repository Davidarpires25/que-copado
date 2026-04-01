import { AdminLayout } from '@/components/admin/layout'

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-[var(--admin-surface-2)] ${className ?? ''}`} />
  )
}

export default function DashboardLoading() {
  return (
    <AdminLayout title="Dashboard" description="Resumen de tu negocio">
      {/* Operational Status skeleton */}
      <div className="mb-8">
        <Skeleton className="h-3 w-28 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl px-4 py-3.5 shadow-[var(--shadow-card)] flex items-center gap-3"
            >
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-2.5 w-20 mb-2" />
                <Skeleton className="h-5 w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-5 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between mb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Analytics quick link */}
      <div className="mb-6">
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <div className="lg:col-span-3">
          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 shadow-[var(--shadow-card)] h-[320px] flex flex-col gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="flex-1" />
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 shadow-[var(--shadow-card)] h-[320px] flex flex-col gap-3">
            <Skeleton className="h-5 w-36 mb-2" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--admin-surface-2)]">
              <div className="flex items-center gap-4">
                <div>
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="hidden sm:block">
                  <Skeleton className="h-3 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}
