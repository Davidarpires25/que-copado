import { AdminLayout } from '@/components/admin/layout'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--admin-skeleton)] ${className ?? ''}`} />
}

export default function SettingsLoading() {
  return (
    <AdminLayout title="Configuración" description="Ajustes del negocio" contentWidth="max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl shadow-[var(--shadow-card)]">
          <div className="p-8 md:p-10 space-y-8">
            <Skeleton className="h-6 w-52" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3.5 w-32 mb-2" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--admin-border)] px-8 md:px-10 py-6">
            <Skeleton className="h-12 w-44" />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
