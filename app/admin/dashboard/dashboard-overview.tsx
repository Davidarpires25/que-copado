'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Banknote,
  ClipboardList,
  TrendingUp,
  Receipt,
  ArrowRight,
  Table2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminLayout } from '@/components/admin/layout'
import { StatsCard, TopProductsTable } from '@/components/admin/dashboard'

const SalesChart = dynamic(
  () => import('@/components/admin/dashboard/sales-chart').then((mod) => ({ default: mod.SalesChart })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 shadow-[var(--shadow-card)] w-full h-full flex items-center justify-center min-h-[300px]">
        <div className="h-6 w-6 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
)
import { OrderStatusBadge } from '@/components/admin/orders'
import { formatPrice } from '@/lib/utils'
import { formatRelativeDate, getShortOrderId, parseOrderItems } from '@/lib/services/order-formatter'
import type { DashboardStats, TopProduct, SalesChartData } from '@/lib/types/orders'
import type { OrderWithZone } from '@/lib/types/database'
import type { ComparativeStats } from '@/app/actions/analytics'
import type { StockAlert } from '@/lib/types/stock'

interface OperationalStatus {
  openTables: number
  activeOrders: number
  stockAlerts: StockAlert[]
}

interface DashboardOverviewProps {
  stats: DashboardStats | null
  topProducts: TopProduct[]
  chartData: SalesChartData[]
  recentOrders: OrderWithZone[]
  trends?: ComparativeStats | null
  operationalStatus: OperationalStatus
}

export function DashboardOverview({
  stats,
  topProducts,
  chartData,
  recentOrders,
  trends,
  operationalStatus,
}: DashboardOverviewProps) {
  const router = useRouter()

  const formattedOrders = useMemo(() => recentOrders.map((order) => ({
    ...order,
    items: parseOrderItems(order.items),
    timeStr: new Date(order.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),
  })), [recentOrders])

  return (
    <AdminLayout title="Dashboard" description="Resumen de tu negocio">
      {/* Operational Status */}
      {(operationalStatus.openTables > 0 || operationalStatus.activeOrders > 0 || operationalStatus.stockAlerts.length > 0) && (
        <>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--admin-text-muted)] mb-3">Estado Operativo</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">

            <Link href="/admin/tables" className="group block">
              <div className="flex items-center gap-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl px-4 py-3.5 shadow-[var(--shadow-card)] hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer">
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${operationalStatus.openTables > 0 ? 'bg-emerald-500/10' : 'bg-[var(--admin-surface-2)]'}`}>
                  <Table2 className={`h-[18px] w-[18px] ${operationalStatus.openTables > 0 ? 'text-emerald-500' : 'text-[var(--admin-text-placeholder)]'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[var(--admin-text-muted)] leading-none mb-1">Mesas ocupadas</p>
                  <p className={`text-xl font-bold leading-none num-tabular ${operationalStatus.openTables > 0 ? 'text-emerald-500' : 'text-[var(--admin-text-muted)]'}`}>
                    {operationalStatus.openTables}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--admin-text-placeholder)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            <Link href="/admin/orders" className="group block">
              <div className="flex items-center gap-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl px-4 py-3.5 shadow-[var(--shadow-card)] hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer">
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${operationalStatus.activeOrders > 0 ? 'bg-blue-500/10' : 'bg-[var(--admin-surface-2)]'}`}>
                  <ClipboardList className={`h-[18px] w-[18px] ${operationalStatus.activeOrders > 0 ? 'text-blue-500' : 'text-[var(--admin-text-placeholder)]'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[var(--admin-text-muted)] leading-none mb-1">Pedidos activos</p>
                  <p className={`text-xl font-bold leading-none num-tabular ${operationalStatus.activeOrders > 0 ? 'text-blue-500' : 'text-[var(--admin-text-muted)]'}`}>
                    {operationalStatus.activeOrders}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--admin-text-placeholder)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

            <Link href="/admin/stock" className="group block">
              <div className="flex items-center gap-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl px-4 py-3.5 shadow-[var(--shadow-card)] hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer">
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                  operationalStatus.stockAlerts.length > 3 ? 'bg-red-500/10'
                  : operationalStatus.stockAlerts.length > 0 ? 'bg-amber-500/10'
                  : 'bg-[var(--admin-surface-2)]'
                }`}>
                  <AlertTriangle className={`h-[18px] w-[18px] ${
                    operationalStatus.stockAlerts.length > 3 ? 'text-red-500'
                    : operationalStatus.stockAlerts.length > 0 ? 'text-amber-500'
                    : 'text-[var(--admin-text-placeholder)]'
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[var(--admin-text-muted)] leading-none mb-1">Alertas de stock</p>
                  <p className={`text-xl font-bold leading-none num-tabular ${
                    operationalStatus.stockAlerts.length > 3 ? 'text-red-500'
                    : operationalStatus.stockAlerts.length > 0 ? 'text-amber-500'
                    : 'text-[var(--admin-text-muted)]'
                  }`}>
                    {operationalStatus.stockAlerts.length}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--admin-text-placeholder)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>

          </div>
        </>
      )}

      {/* Stats Grid */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--admin-text-muted)] mb-3">Resumen de Ventas</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Ventas Hoy"
          value={formatPrice(stats?.todayRevenue || 0)}
          subtitle={`${stats?.todayOrders || 0} pedidos`}
          icon={Banknote}
          iconColor="text-green-500"
          iconBgColor="bg-green-500/10"
          trend={trends?.todayRevenueTrend || undefined}
          delay={0.1}
          href="/admin/orders"
        />
        <StatsCard
          title="Ventas Semana"
          value={formatPrice(stats?.weekRevenue || 0)}
          subtitle={`${stats?.weekOrders || 0} pedidos`}
          icon={TrendingUp}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
          trend={trends?.weekRevenueTrend || undefined}
          delay={0.15}
          href="/admin/analytics"
        />
        <StatsCard
          title="Ventas Mes"
          value={formatPrice(stats?.monthRevenue || 0)}
          subtitle={`${stats?.monthOrders || 0} pedidos`}
          icon={ClipboardList}
          iconColor="text-purple-500"
          iconBgColor="bg-purple-500/10"
          trend={trends?.monthRevenueTrend || undefined}
          delay={0.2}
          href="/admin/analytics"
        />
        <StatsCard
          title="Ticket Promedio"
          value={formatPrice(stats?.averageTicket || 0)}
          subtitle="Este mes"
          icon={Receipt}
          iconColor="text-[var(--admin-accent-text)]"
          iconBgColor="bg-[var(--admin-accent)]/10"
          trend={trends?.averageTicketTrend || undefined}
          delay={0.25}
          href="/admin/analytics"
        />
      </div>

      {/* Charts Row */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--admin-text-muted)] mb-3">Rendimiento</p>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8 items-stretch">
        <div
          className="lg:col-span-3 flex"
        >
          <SalesChart data={chartData} />
        </div>

        <div
          className="lg:col-span-2 flex"
        >
          <TopProductsTable products={topProducts} />
        </div>
      </div>

      {/* Recent Orders */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--admin-text-muted)] mb-3">Actividad Reciente</p>
      <div
        className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl shadow-[var(--shadow-card)] overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-base font-semibold text-[var(--admin-text)]">
            Últimos Pedidos
          </h3>
          <Link href="/admin/orders">
            <Button variant="ghost" size="sm" className="text-[var(--admin-accent-text)] hover:text-[#E5B001] hover:bg-[var(--admin-accent)]/10 h-8 text-xs">
              Ver todos
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2 px-6 pb-6">
            <ClipboardList className="h-8 w-8 text-[var(--admin-text-placeholder)]" />
            <p className="text-sm text-[var(--admin-text-muted)]">No hay pedidos recientes</p>
            <p className="text-xs text-[var(--admin-text-faint)]">Los pedidos nuevos aparecerán aquí</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-[var(--admin-border)]">
                  <th className="text-left text-xs font-semibold text-[var(--admin-text-muted)] px-6 py-3">ID</th>
                  <th className="text-left text-xs font-semibold text-[var(--admin-text-muted)] px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-[var(--admin-text-muted)] px-4 py-3 hidden sm:table-cell">Hora</th>
                  <th className="text-left text-xs font-semibold text-[var(--admin-text-muted)] px-4 py-3 hidden md:table-cell">Items</th>
                  <th className="text-right text-xs font-semibold text-[var(--admin-text-muted)] px-4 py-3">Total</th>
                  <th className="text-right text-xs font-semibold text-[var(--admin-text-muted)] px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {formattedOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => router.push('/admin/orders')}
                      className="border-t border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-sm font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors">
                          #{getShortOrderId(order.id)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-[var(--admin-text)]">{order.customer_name}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-sm text-[var(--admin-text-muted)]">{order.timeStr}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-sm text-[var(--admin-text-muted)]">{order.items.length}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-semibold text-[var(--admin-accent-text)]">
                          {formatPrice(order.total)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <OrderStatusBadge status={order.status} size="sm" />
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
