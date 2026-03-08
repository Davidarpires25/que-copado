import { AdminLayout } from '@/components/admin/layout'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--admin-surface-2)] ${className ?? ''}`} />
}

export default function SettingsLoading() {
  return (
    <AdminLayout title="Configuración" description="Ajustes del negocio">
      <div className="max-w-2xl space-y-6">
        {/* Section */}
        {Array.from({ length: 3 }).map((_, section) => (
          <div key={section} className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 shadow-[var(--shadow-card)] space-y-4">
            <Skeleton className="h-5 w-40 mb-2" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ))}
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </AdminLayout>
  )
}
