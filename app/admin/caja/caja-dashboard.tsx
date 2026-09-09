'use client'

import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { SessionOpenScreen } from '@/components/admin/caja/session-open-screen'
import { PosInterface } from '@/components/admin/caja/pos-interface'
import { SessionCloseScreen } from '@/components/admin/caja/session-close-screen'
import { AdminSidebar, MobileSidebar } from '@/components/admin/layout/admin-sidebar'
import { useThemeStore } from '@/lib/store/theme-store'
import { cn, formatPrice } from '@/lib/utils'
import type { Category, ProductWithHalfConfig, Order, DeliveryZone } from '@/lib/types/database'
import type { CashRegisterSession, SessionSummary } from '@/lib/types/cash-register'
import type { TableWithOrder } from '@/lib/types/tables'
import type { OrderWithSplits } from '@/lib/types/cash-register'
import type { CurrentUserInfo } from '@/app/actions/profile'
import { useSidebarCollapsed } from '@/lib/hooks/use-sidebar-collapsed'

type Screen = 'open' | 'pos' | 'close'

interface CajaDashboardProps {
  products: ProductWithHalfConfig[]
  categories: Category[]
  initialSession: CashRegisterSession | null
  initialTables: TableWithOrder[]
  initialPendingOrders: Order[]
  initialDeliveryZones: DeliveryZone[]
  initialSessionOrders: OrderWithSplits[]
  stockAlertCount: number
  currentUser: CurrentUserInfo | null
}

export function CajaDashboard({
  products,
  categories,
  initialSession,
  initialTables,
  initialPendingOrders,
  initialDeliveryZones,
  initialSessionOrders,
  stockAlertCount,
  currentUser,
}: CajaDashboardProps) {
  const [screen, setScreen] = useState<Screen>(initialSession ? 'pos' : 'open')
  const [session, setSession] = useState<CashRegisterSession | null>(initialSession)
  const [closeSummary, setCloseSummary] = useState<SessionSummary | null>(null)
  // Sin estado local: PosInterface llama a router.refresh() tras cada cambio de
  // mesa, asi que la prop del server ya trae el dato fresco. Copiarla a
  // useState congelaba `openTablesCount` hasta recargar la pagina.
  const tables = initialTables
  const [sidebarCollapsed, handleToggleCollapse] = useSidebarCollapsed()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Sync dark mode to html element when not in AdminLayout
  const { theme } = useThemeStore()
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('admin-dark')
    } else {
      document.documentElement.classList.remove('admin-dark')
    }
  }, [theme])

  const openTablesCount = tables.filter((t) => t.status !== 'libre').length

  const handleSessionOpened = (newSession: CashRegisterSession) => {
    setSession(newSession)
    setScreen('pos')
  }

  const handleCloseSession = (summary: SessionSummary) => {
    setCloseSummary(summary)
    setScreen('close')
  }

  const handleSessionClosed = () => {
    setSession(null)
    setCloseSummary(null)
    setScreen('open')
  }

  const handleSessionUpdate = (updatedSession: CashRegisterSession) => {
    setSession(updatedSession)
  }


  // Sin perfil (p. ej. antes de la migracion 016) el sidebar usa sus defaults.
  const meProps = currentUser ? { userName: currentUser.name, userRole: currentUser.roleLabel } : {}

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn('h-screen overflow-hidden admin-layout', theme === 'dark' && 'dark')}
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapse={handleToggleCollapse} stockAlertCount={stockAlertCount} {...meProps} />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} stockAlertCount={stockAlertCount} {...meProps} />

      {/* Main content — shifted right by sidebar width */}
      <div
        className={cn(
          'h-full flex flex-col transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        )}
      >
        {/* Top bar — Pencil style */}
        {screen !== 'close' && (
          <div className="bg-[var(--admin-sidebar-bg)] border-b border-[var(--admin-border)] px-4 lg:px-6 flex items-center justify-between gap-3 shrink-0 h-12">
            {/* Left: mobile hamburger + session info */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden h-8 w-8 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)]"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                {session && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
                <span className="text-[13px] font-medium text-[var(--admin-text)] truncate">
                  {session
                    ? `Caja Abierta — Turno ${new Date(session.opened_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Caja'}
                </span>
              </div>
            </div>

            {/* Right: sales total */}
            {session && (
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-[13px] text-[var(--admin-text-muted)] hidden sm:block tabular-nums">
                  <span className="font-semibold text-[var(--admin-text)]">{formatPrice(session.total_sales)}</span>
                  {' '}vendido
                </span>
              </div>
            )}
          </div>
        )}

        {/* Screen router */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {screen === 'open' && (
              <motion.div
                key="open"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute inset-0"
              >
                <SessionOpenScreen onSessionOpened={handleSessionOpened} />
              </motion.div>
            )}

            {screen === 'pos' && session && (
              <motion.div
                key="pos"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute inset-0"
              >
                <PosInterface
                  products={products}
                  categories={categories}
                  session={session}
                  initialTables={tables}
                  initialPendingOrders={initialPendingOrders}
                  initialDeliveryZones={initialDeliveryZones}
                  initialSessionOrders={initialSessionOrders}
                  onCloseSession={handleCloseSession}
                  onSessionUpdate={handleSessionUpdate}
                />
              </motion.div>
            )}

            {screen === 'close' && closeSummary && (
              <motion.div
                key="close"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute inset-0"
              >
                <SessionCloseScreen
                  summary={closeSummary}
                  openTablesCount={openTablesCount}
                  onBack={() => setScreen('pos')}
                  onClosed={handleSessionClosed}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
