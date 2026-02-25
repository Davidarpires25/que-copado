'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  ArrowRight,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminLayout } from '@/components/admin/layout'
import { StatsCard, SalesChart, TopProductsTable } from '@/components/admin/dashboard'
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
          icon={Clock}
          iconColor="text-[#FEC501]"
          iconBgColor="bg-[#FEC501]/10"
          trend={trends?.averageTicketTrend || undefined}
          delay={0.25}
          href="/admin/analytics"
        />
      </div>

      {/* Analytics Quick Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="mb-6"
      >
        <Link href="/admin/analytics">
          <div className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-4 hover:border-[#FEC501]/30 hover:bg-[#1a1d24]/80 transition-all duration-200 group flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#FEC501]/10 rounded-lg flex items-center justify-center group-hover:bg-[#FEC501]/20 transition-colors">
                <BarChart3 className="h-5 w-5 text-[#FEC501]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#f0f2f5] group-hover:text-[#FEC501] transition-colors">
                  Ver Analytics completo
                </p>
                <p className="text-xs text-[#a8b5c9]">
                  Ventas por hora, día, zona, productos y más
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#a8b5c9] group-hover:text-[#FEC501] group-hover:translate-x-1 transition-all duration-200" />
          </div>
        </Link>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8 items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-3 flex"
        >
          <SalesChart data={chartData} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 flex"
        >
          <TopProductsTable products={topProducts} />
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#f0f2f5]">
            Pedidos Recientes
          </h3>
          <Link href="/admin/orders">
            <Button variant="ghost" className="text-[#FEC501] hover:text-[#E5B001] hover:bg-[#FEC501]/10">
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-center text-[#a8b5c9] py-8">
            No hay pedidos recientes
          </p>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const items = parseOrderItems(order.items)
              const itemsSummary = items.slice(0, 2).map(i => `${i.quantity}x ${i.name}`).join(', ')

              return (
                <Link
                  key={order.id}
                  href="/admin/orders"
                  className="flex items-center justify-between p-3 rounded-lg bg-[#252a35] hover:bg-[#2a2f3a] transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-mono text-[#f0f2f5] font-semibold group-hover:text-[#FEC501] transition-colors">
                        #{getShortOrderId(order.id)}
                      </p>
                      <p className="text-xs text-[#a8b5c9]">
                        {formatRelativeDate(order.created_at)}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[#c4cdd9] text-sm">{order.customer_name}</p>
                      <p className="text-xs text-[#a8b5c9] truncate max-w-[200px]">
                        {itemsSummary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <OrderStatusBadge status={order.status} size="sm" />
                    <span className="font-semibold text-[#FEC501] min-w-[80px] text-right">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </motion.div>
    </AdminLayout>
  )
}
