'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AdminLayout } from '@/components/admin/layout'
import {
  ChartContainer,
  HourlySalesChart,
  WeekdaySalesChart,
  ConfigurableSalesChart,
  TopProductsRevenue,
  ZoneSalesTable,
  ShippingAnalysis,
  CancellationCard,
  PaymentMethodChart,
  ProfitabilityTable,
  PeriodSelector,
} from '@/components/admin/analytics'
import {
  getHourlySales,
  getWeekdaySales,
  getCancellationRate,
  getTopProductsByRevenue,
  getConfigurableSalesChart,
  getZoneSales,
  getShippingAnalysis,
  getPaymentMethodDistribution,
  getProfitabilityReport,
} from '@/app/actions/analytics'
import type {
  AnalyticsPeriod,
  HourlySalesData,
  WeekdaySalesData,
  CancellationData,
  TopProductRevenue,
  ConfigurableSalesData,
  ZoneSalesData,
  ShippingAnalysisData,
  PaymentMethodData,
  ProfitabilityData,
} from '@/app/actions/analytics'

interface AnalyticsDashboardProps {
  initialHourlySales: HourlySalesData[]
  initialWeekdaySales: WeekdaySalesData[]
  initialCancellation: CancellationData | null
  initialTopProducts: TopProductRevenue[]
  initialSalesChart: ConfigurableSalesData[]
  initialZoneSales: ZoneSalesData[]
  initialShipping: ShippingAnalysisData | null
  initialPaymentMethods: PaymentMethodData[]
  initialProfitability: ProfitabilityData | null
}

export function AnalyticsDashboard({
  initialHourlySales,
  initialWeekdaySales,
  initialCancellation,
  initialTopProducts,
  initialSalesChart,
  initialZoneSales,
  initialShipping,
  initialPaymentMethods,
  initialProfitability,
}: AnalyticsDashboardProps) {
  // Period states for each section
  const [salesPeriod, setSalesPeriod] = useState<AnalyticsPeriod>('7d')
  const [hourlyPeriod, setHourlyPeriod] = useState<AnalyticsPeriod>('30d')
  const [weekdayPeriod, setWeekdayPeriod] = useState<AnalyticsPeriod>('30d')
  const [productsPeriod, setProductsPeriod] = useState<AnalyticsPeriod>('30d')
  const [zonePeriod, setZonePeriod] = useState<AnalyticsPeriod>('30d')
  const [shippingPeriod, setShippingPeriod] = useState<AnalyticsPeriod>('30d')
  const [cancellationPeriod, setCancellationPeriod] = useState<AnalyticsPeriod>('30d')
  const [paymentPeriod, setPaymentPeriod] = useState<AnalyticsPeriod>('30d')
  const [profitPeriod, setProfitPeriod] = useState<AnalyticsPeriod>('30d')

  // Data states
  const [salesChart, setSalesChart] = useState<ConfigurableSalesData[]>(initialSalesChart)
  const [hourlySales, setHourlySales] = useState<HourlySalesData[]>(initialHourlySales)
  const [weekdaySales, setWeekdaySales] = useState<WeekdaySalesData[]>(initialWeekdaySales)
  const [topProducts, setTopProducts] = useState<TopProductRevenue[]>(initialTopProducts)
  const [zoneSales, setZoneSales] = useState<ZoneSalesData[]>(initialZoneSales)
  const [shipping, setShipping] = useState<ShippingAnalysisData | null>(initialShipping)
  const [cancellation, setCancellation] = useState<CancellationData | null>(initialCancellation)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>(initialPaymentMethods)
  const [profitability, setProfitability] = useState<ProfitabilityData | null>(initialProfitability)

  // Loading states
  const [loadingSales, setLoadingSales] = useState(false)
  const [loadingHourly, setLoadingHourly] = useState(false)
  const [loadingWeekday, setLoadingWeekday] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingZone, setLoadingZone] = useState(false)
  const [loadingShipping, setLoadingShipping] = useState(false)
  const [loadingCancellation, setLoadingCancellation] = useState(false)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [loadingProfit, setLoadingProfit] = useState(false)

  // Fetch handlers
  const handleSalesPeriodChange = useCallback(async (period: AnalyticsPeriod) => {
    setSalesPeriod(period)
    setLoadingSales(true)
    const result = await getConfigurableSalesChart(period)
    if (result.data) setSalesChart(result.data)
    setLoadingSales(false)
  }, [])

  const handleHourlyPeriodChange = useCallback(async (period: AnalyticsPeriod) => {
    setHourlyPeriod(period)
    setLoadingHourly(true)
    const result = await getHourlySales(period)
    if (result.data) setHourlySales(result.data)
    setLoadingHourly(false)
  }, [])

  const handleWeekdayPeriodChange = useCallback(async (period: AnalyticsPeriod) => {
    setWeekdayPeriod(period)
    setLoadingWeekday(true)
    const result = await getWeekdaySales(period)
    if (result.data) setWeekdaySales(result.data)
    setLoadingWeekday(false)
  }, [])

  const handleProductsPeriodChange = useCallback(async (period: AnalyticsPeriod) => {
    setProductsPeriod(period)
    setLoadingProducts(true)
    const result = await getTopProductsByRevenue(period, 10)
    if (result.data) setTopProducts(result.data)
    setLoadingProducts(false)
  }, [])

  const handleZonePeriodChange = useCallback(async (period: AnalyticsPeriod) => {
    setZonePeriod(period)
    setLoadingZone(true)
    const result = await getZoneSales(period)
    if (result.data) setZoneSales(result.data)
    setLoadingZone(false)
  }, [])

  const handleShippingPeriodChange = useCallback(async (period: AnalyticsPeriod) => {
    setShippingPeriod(period)
    setLoadingShipping(true)
    const result = await getShippingAnalysis(period)
    if (result.data) setShipping(result.data)
    setLoadingShipping(false)
  }, [])

  const handleCancellationPeriodChange = useCallback(async (period: AnalyticsPeriod) => {
    setCancellationPeriod(period)
    setLoadingCancellation(true)
    const result = await getCancellationRate(period)
    if (result.data) setCancellation(result.data)
    setLoadingCancellation(false)
  }, [])

  const handlePaymentPeriodChange = useCallback(async (period: AnalyticsPeriod) => {
    setPaymentPeriod(period)
    setLoadingPayment(true)
    const result = await getPaymentMethodDistribution(period)
    if (result.data) setPaymentMethods(result.data)
    setLoadingPayment(false)
  }, [])

  const handleProfitPeriodChange = useCallback(async (period: AnalyticsPeriod) => {
    setProfitPeriod(period)
    setLoadingProfit(true)
    const result = await getProfitabilityReport(period)
    if (result.data) setProfitability(result.data)
    setLoadingProfit(false)
  }, [])

  return (
    <AdminLayout title="Analytics" description="Reportes y métricas de tu negocio">
      {/* Row 1: Configurable Sales Chart (full width) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <ChartContainer
          title="Ventas"
          subtitle="Evolución de ingresos"
          period={salesPeriod}
          onPeriodChange={handleSalesPeriodChange}
        >
          {loadingSales ? (
            <LoadingPlaceholder height="300px" />
          ) : (
            <ConfigurableSalesChart data={salesChart} />
          )}
        </ChartContainer>
      </motion.div>

      {/* Row 2: Profitability (full width) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mb-6"
      >
        <ChartContainer
          title="Rentabilidad por Producto"
          subtitle="Food cost y margen bruto"
          period={profitPeriod}
          onPeriodChange={handleProfitPeriodChange}
        >
          {loadingProfit ? (
            <LoadingPlaceholder height="300px" />
          ) : profitability ? (
            <ProfitabilityTable data={profitability} />
          ) : (
            <p className="text-[#a8b5c9] text-center py-8">
              No hay datos de rentabilidad
            </p>
          )}
        </ChartContainer>
      </motion.div>

      {/* Row 3: Hourly + Weekday */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex"
        >
          <ChartContainer
            title="Ventas por Hora"
            subtitle="Distribución horaria de pedidos"
            period={hourlyPeriod}
            onPeriodChange={handleHourlyPeriodChange}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1">
              {loadingHourly ? (
                <LoadingPlaceholder height="280px" />
              ) : (
                <HourlySalesChart data={hourlySales} />
              )}
            </div>
          </ChartContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex"
        >
          <ChartContainer
            title="Ventas por Día"
            subtitle="Distribución semanal"
            period={weekdayPeriod}
            onPeriodChange={handleWeekdayPeriodChange}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1">
              {loadingWeekday ? (
                <LoadingPlaceholder height="280px" />
              ) : (
                <WeekdaySalesChart data={weekdaySales} />
              )}
            </div>
          </ChartContainer>
        </motion.div>
      </div>

      {/* Row 3: Top Products + Cancellation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 flex"
        >
          <ChartContainer
            title="Top Productos por Ingresos"
            subtitle="Ranking por ingresos generados"
            period={productsPeriod}
            onPeriodChange={handleProductsPeriodChange}
            className="flex-1"
          >
            {loadingProducts ? (
              <LoadingPlaceholder height="300px" />
            ) : (
              <TopProductsRevenue data={topProducts} />
            )}
          </ChartContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex"
        >
          <CancellationCard
            data={cancellation}
            loading={loadingCancellation}
            period={cancellationPeriod}
            onPeriodChange={handleCancellationPeriodChange}
          />
        </motion.div>
      </div>

      {/* Row 4: Payment Methods + Shipping Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex"
        >
          <ChartContainer
            title="Métodos de Pago"
            subtitle="Distribución por forma de pago"
            period={paymentPeriod}
            onPeriodChange={handlePaymentPeriodChange}
            className="flex-1"
          >
            {loadingPayment ? (
              <LoadingPlaceholder height="280px" />
            ) : (
              <PaymentMethodChart data={paymentMethods} />
            )}
          </ChartContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex"
        >
          <ChartContainer
            title="Análisis de Envío"
            subtitle="Ingresos de shipping vs envío gratis"
            period={shippingPeriod}
            onPeriodChange={handleShippingPeriodChange}
            className="flex-1"
          >
            {loadingShipping ? (
              <LoadingPlaceholder height="280px" />
            ) : shipping ? (
              <ShippingAnalysis data={shipping} />
            ) : (
              <p className="text-[#a8b5c9] text-center py-8">
                No hay datos de envío
              </p>
            )}
          </ChartContainer>
        </motion.div>
      </div>

      {/* Row 5: Zone Sales (full width - table benefits from space) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <ChartContainer
          title="Ventas por Zona"
          subtitle="Ingresos y pedidos por zona de delivery"
          period={zonePeriod}
          onPeriodChange={handleZonePeriodChange}
        >
          {loadingZone ? (
            <LoadingPlaceholder height="250px" />
          ) : (
            <ZoneSalesTable data={zoneSales} />
          )}
        </ChartContainer>
      </motion.div>
    </AdminLayout>
  )
}

// Skeleton loaders for better UX
function ChartSkeleton({ height }: { height: string }) {
  return (
    <div className="space-y-3" style={{ height }}>
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-[#252a35] rounded animate-pulse" />
        <div className="h-4 w-24 bg-[#252a35] rounded animate-pulse" />
      </div>
      <div className="flex items-end justify-between gap-2 h-[calc(100%-2rem)]">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-[#252a35] rounded-t animate-pulse"
            style={{
              height: `${40 + Math.random() * 60}%`,
              flex: 1,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function LoadingPlaceholder({ height }: { height: string }) {
  return <ChartSkeleton height={height} />
}
