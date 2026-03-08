'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Receipt,
  ArrowRight,
  BarChart3,
  ClipboardList,
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

interface DashboardOverviewProps {
  stats: DashboardStats | null
  topProducts: TopProduct[]
  chartData: SalesChartData[]
  recentOrders: OrderWithZone[]
  trends?: ComparativeStats | null
}

export function DashboardOverview({
  stats,
  topProducts,
  chartData,
  recentOrders,
  trends,
}: DashboardOverviewProps) {
  return (
    <AdminLayout title="Dashboard" description="Resumen de tu negocio">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Ventas Hoy"
          value={formatPrice(stats?.todayRevenue || 0)}
          subtitle={`${stats?.todayOrders || 0} pedidos`}
          icon={DollarSign}
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
          icon={ShoppingBag}
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

      {/* Analytics Quick Link */}
      <div
        className="mb-6"
      >
        <Link href="/admin/analytics">
          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] hover:border-[var(--admin-accent)]/30 transition-all duration-200 group flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--admin-accent)]/10 rounded-lg flex items-center justify-center group-hover:bg-[var(--admin-accent)]/20 transition-colors">
                <BarChart3 className="h-5 w-5 text-[var(--admin-accent-text)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors">
                  Ver Analytics completo
                </p>
                <p className="text-sm text-[var(--admin-text-muted)]">
                  Ventas por hora, día, zona, productos y más
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[var(--admin-text-muted)] group-hover:text-[var(--admin-accent-text)] group-hover:translate-x-1 transition-all duration-200" />
          </div>
        </Link>
      </div>

      {/* Charts Row */}
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
      <div
        className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--admin-text)]">
            Pedidos Recientes
          </h3>
          <Link href="/admin/orders">
            <Button variant="ghost" className="text-[var(--admin-accent-text)] hover:text-[#E5B001] hover:bg-[var(--admin-accent)]/10">
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
            <ClipboardList className="h-8 w-8 text-[var(--admin-text-placeholder)]" />
            <p className="text-sm text-[var(--admin-text-muted)]">No hay pedidos recientes</p>
            <p className="text-xs text-[var(--admin-text-faint)]">Los pedidos nuevos apareceran aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const items = parseOrderItems(order.items)
              const itemsSummary = items.slice(0, 2).map(i => `${i.quantity}x ${i.name}`).join(', ')

              return (
                <Link
                  key={order.id}
                  href="/admin/orders"
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--admin-surface-2)] hover:bg-[var(--admin-border)] transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-mono text-[var(--admin-text)] font-semibold group-hover:text-[var(--admin-accent-text)] transition-colors">
                        #{getShortOrderId(order.id)}
                      </p>
                      <p className="text-xs text-[var(--admin-text-muted)]">
                        {formatRelativeDate(order.created_at)}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[var(--admin-text-muted)] text-sm">{order.customer_name}</p>
                      <p className="text-xs text-[var(--admin-text-muted)] truncate max-w-[200px]">
                        {itemsSummary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <OrderStatusBadge status={order.status} size="sm" />
                    <span className="font-semibold text-[var(--admin-accent-text)] min-w-[80px] text-right">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
