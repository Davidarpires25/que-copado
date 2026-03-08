import { AdminLayout } from '@/components/admin/layout'

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-[var(--admin-surface-2)] ${className ?? ''}`} />
  )
}

function ChartCardSkeleton({ height = 'h-[300px]' }: { height?: string }) {
  return (
    <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <Skeleton className={`w-full ${height}`} />
    </div>
  )
}

export default function AnalyticsLoading() {
  return (
    <AdminLayout title="Analytics" description="Reportes y métricas de tu negocio">
      {/* Row 1: Sales chart full width */}
      <div className="mb-6">
        <ChartCardSkeleton height="h-[300px]" />
      </div>

      {/* Row 2: Profitability full width */}
      <div className="mb-6">
        <ChartCardSkeleton height="h-[300px]" />
      </div>

      {/* Row 3: Hourly + Weekday */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCardSkeleton height="h-[280px]" />
        <ChartCardSkeleton height="h-[280px]" />
      </div>

      {/* Row 4: Top Products + Cancellation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ChartCardSkeleton height="h-[300px]" />
        </div>
        <ChartCardSkeleton height="h-[300px]" />
      </div>

      {/* Row 5: Zone + Shipping + Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ChartCardSkeleton height="h-[260px]" />
        <ChartCardSkeleton height="h-[260px]" />
        <ChartCardSkeleton height="h-[260px]" />
      </div>
    </AdminLayout>
  )
}
