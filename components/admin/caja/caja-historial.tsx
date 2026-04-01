'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, SearchX, History, TrendingUp, TrendingDown, Minus,
  Banknote, CreditCard, Wallet, Clock,
  MinusCircle, PlusCircle, ArrowLeftRight, X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AdminLayout } from '@/components/admin/layout'
import { formatPrice, cn } from '@/lib/utils'
import type { CashRegisterSession, CashMovementWithSession } from '@/lib/types/cash-register'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CajaHistorialProps {
  sessions: CashRegisterSession[]
  movements: CashMovementWithSession[]
}

type TabKey = 'arqueos' | 'movimientos'
type FilterType = 'all' | 'withdrawal' | 'deposit'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatTimeShort(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDuration(openedAt: string, closedAt: string) {
  const ms = new Date(closedAt).getTime() - new Date(openedAt).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function DiffBadge({ diff }: { diff: number | null }) {
  if (diff === null) return <span className="text-[var(--admin-text-faint)] text-sm">—</span>
  const abs = Math.abs(diff)
  const label = diff === 0 ? 'Cuadra' : diff > 0 ? `+${formatPrice(abs)}` : `-${formatPrice(abs)}`
  if (diff === 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400">
      <Minus className="h-3 w-3" />{label}
    </span>
  )
  if (diff > 0) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400">
      <TrendingUp className="h-3 w-3" />{label}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400">
      <TrendingDown className="h-3 w-3" />{label}
    </span>
  )
}

// ─── Arqueo details drawer ────────────────────────────────────────────────────

function ArqueoDrawer({
  session,
  open,
  onClose,
  onViewMovements,
}: {
  session: CashRegisterSession | null
  open: boolean
  onClose: () => void
  onViewMovements: (sessionId: string) => void
}) {
  if (!session) return null

  const closedAt = session.closed_at ?? session.opened_at
  const expectedCash =
    session.opening_balance +
    session.total_cash_sales +
    session.total_deposits -
    session.total_withdrawals

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-md bg-[var(--admin-surface)] border-l border-[var(--admin-border)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--admin-text)]">
                  Arqueo — {formatDateShort(closedAt)}
                </h2>
                <p className="text-sm text-[var(--admin-text-muted)] flex items-center gap-1 mt-0.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTimeShort(session.opened_at)} – {formatTimeShort(closedAt)}
                  <span className="ml-2 text-[var(--admin-text-faint)]">
                    ({formatDuration(session.opened_at, closedAt)})
                  </span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)]"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Reconciliación de efectivo */}
              <div className="bg-[var(--admin-bg)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--admin-text)] mb-3 text-sm">Reconciliación de efectivo</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Saldo de apertura', value: formatPrice(session.opening_balance), color: 'text-[var(--admin-text-muted)]' },
                    { label: 'Ventas en efectivo', value: `+${formatPrice(session.total_cash_sales)}`, color: 'text-green-400' },
                    { label: 'Ingresos (depósitos)', value: `+${formatPrice(session.total_deposits)}`, color: 'text-green-400' },
                    { label: 'Retiros', value: `-${formatPrice(session.total_withdrawals)}`, color: 'text-red-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-[var(--admin-text-muted)]">{label}</span>
                      <span className={cn('text-sm font-semibold tabular-nums', color)}>{value}</span>
                    </div>
                  ))}
                  <div className="border-t border-[var(--admin-border)] pt-2.5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--admin-text)]">Efectivo esperado</span>
                    <span className="text-sm font-bold text-blue-400 tabular-nums">{formatPrice(expectedCash)}</span>
                  </div>
                  {session.actual_cash !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--admin-text)]">Efectivo contado</span>
                      <span className="text-sm font-bold text-[var(--admin-accent-text)] tabular-nums">{formatPrice(session.actual_cash)}</span>
                    </div>
                  )}
                  {session.cash_difference !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--admin-text)]">Diferencia</span>
                      <DiffBadge diff={session.cash_difference} />
                    </div>
                  )}
                </div>
              </div>

              {/* Ventas por método */}
              <div className="bg-[var(--admin-bg)] rounded-xl p-4">
                <h3 className="font-semibold text-[var(--admin-text)] mb-3 text-sm">Ventas por método de pago</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Efectivo', value: session.total_cash_sales, icon: Banknote },
                    { label: 'Tarjeta', value: session.total_card_sales, icon: CreditCard },
                    { label: 'Transferencia', value: session.total_transfer_sales, icon: Wallet },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-[var(--admin-text-muted)] flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />{label}
                      </span>
                      <span className="text-sm font-semibold text-[var(--admin-text)] tabular-nums">{formatPrice(value)}</span>
                    </div>
                  ))}
                  <div className="border-t border-[var(--admin-border)] pt-2.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--admin-text)]">Total ventas</span>
                    <span className="text-sm font-bold text-[var(--admin-accent-text)] tabular-nums">{formatPrice(session.total_sales)}</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--admin-text-faint)] mt-3">
                  {session.total_orders} {session.total_orders === 1 ? 'orden' : 'órdenes'} procesadas
                </p>
              </div>

              {/* Notas */}
              {session.notes && (
                <div className="bg-[var(--admin-bg)] rounded-xl p-4">
                  <h3 className="font-semibold text-[var(--admin-text)] mb-2 text-sm">Notas</h3>
                  <p className="text-sm text-[var(--admin-text-muted)] italic">{session.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--admin-border)] flex flex-col gap-2">
              <Button
                onClick={() => { onClose(); onViewMovements(session.id) }}
                variant="outline"
                className="w-full border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-accent-text)] hover:border-[var(--admin-accent)]/40 hover:bg-[var(--admin-accent)]/5 gap-2"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Ver movimientos de este turno
              </Button>
              <Button
                onClick={onClose}
                className="w-full bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold"
              >
                Cerrar
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Arqueos tab ───────────────────────────────────────────────────────────────

function ArqueosTab({
  sessions,
  onViewMovements,
}: {
  sessions: CashRegisterSession[]
  onViewMovements: (sessionId: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSession, setSelectedSession] = useState<CashRegisterSession | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleRowClick = (session: CashRegisterSession) => {
    setSelectedSession(session)
    setDrawerOpen(true)
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    const q = searchQuery.toLowerCase()
    return sessions.filter((s) => {
      const date = formatDateShort(s.closed_at ?? s.opened_at)
      return date.includes(q) || s.notes?.toLowerCase().includes(q)
    })
  }, [sessions, searchQuery])

  return (
    <>
      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
          <Input
            placeholder="Buscar por fecha o nota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>
        <p className="text-[var(--admin-text-muted)] text-sm hidden sm:block">
          {filtered.length} {filtered.length === 1 ? 'sesión' : 'sesiones'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-b-xl border border-t-0 border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] p-16 flex flex-col items-center justify-center text-center gap-3">
          {sessions.length === 0 ? (
            <>
              <History className="h-10 w-10 text-[var(--admin-text-placeholder)]" />
              <div>
                <p className="text-sm font-medium text-[var(--admin-text-muted)]">No hay arqueos todavía</p>
                <p className="text-xs text-[var(--admin-text-faint)] mt-1">Los cierres de caja aparecerán aquí</p>
              </div>
            </>
          ) : (
            <>
              <SearchX className="h-10 w-10 text-[var(--admin-text-placeholder)]" />
              <div>
                <p className="text-sm font-medium text-[var(--admin-text-muted)]">Sin resultados</p>
                <p className="text-xs text-[var(--admin-text-faint)] mt-1">No se encontraron arqueos con ese criterio</p>
              </div>
              <Button
                variant="ghost" size="sm"
                onClick={() => setSearchQuery('')}
                className="text-[var(--admin-accent-text)] hover:text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 text-xs h-8"
              >
                Limpiar búsqueda
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-b-xl border border-t-0 border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
                <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Fecha</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden sm:table-cell">Duración</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Ventas</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden md:table-cell">
                    <span className="flex items-center gap-1"><Banknote className="h-3 w-3" />Efectivo</span>
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden lg:table-cell">
                    <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" />Tarjeta</span>
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden lg:table-cell">
                    <span className="flex items-center gap-1"><Wallet className="h-3 w-3" />Transfer.</span>
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Diferencia</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((session) => {
                  const closedAt = session.closed_at ?? session.opened_at
                  return (
                    <TableRow
                      key={session.id}
                      onClick={() => handleRowClick(session)}
                      className="border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors group cursor-pointer"
                    >
                      <TableCell>
                        <div>
                          <span className="font-semibold text-sm text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors">
                            {formatDateShort(closedAt)}
                          </span>
                          <span className="block text-xs text-[var(--admin-text-faint)]">
                            {formatTimeShort(session.opened_at)} – {formatTimeShort(closedAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-[var(--admin-text-muted)]">{formatDuration(session.opened_at, closedAt)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-[var(--admin-accent-text)]">{formatPrice(session.total_sales)}</span>
                        <span className="block text-xs text-[var(--admin-text-faint)]">
                          {session.total_orders} {session.total_orders === 1 ? 'orden' : 'órdenes'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-[var(--admin-text-muted)]">{formatPrice(session.total_cash_sales)}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-[var(--admin-text-muted)]">{formatPrice(session.total_card_sales)}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-[var(--admin-text-muted)]">{formatPrice(session.total_transfer_sales)}</span>
                      </TableCell>
                      <TableCell><DiffBadge diff={session.cash_difference} /></TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => { e.stopPropagation(); onViewMovements(session.id) }}
                          title="Ver movimientos de este turno"
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--admin-text-faint)] hover:text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 transition-colors cursor-pointer"
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ArqueoDrawer
        session={selectedSession}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onViewMovements={onViewMovements}
      />
    </>
  )
}

// ─── Movimientos tab ──────────────────────────────────────────────────────────

function MovimientosTab({
  movements,
  sessionFilter,
  onClearSession,
}: {
  movements: CashMovementWithSession[]
  sessionFilter: string | null
  onClearSession: () => void
}) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (filterType !== 'all' && m.type !== filterType) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const date = formatDateShort(m.created_at)
        if (!m.reason.toLowerCase().includes(q) && !date.includes(q)) return false
      }
      return true
    })
  }, [movements, search, filterType])

  const sessionOpenedAt = sessionFilter
    ? movements[0]?.cash_register_sessions?.opened_at
    : null

  return (
    <>
      {/* Session filter banner */}
      {sessionFilter && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/30 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--admin-accent-text)]">
              Filtrado por turno
              {sessionOpenedAt && (
                <span className="font-normal text-[var(--admin-text-muted)] ml-1">
                  — abierto el {formatDateShort(sessionOpenedAt)} a las {formatTimeShort(sessionOpenedAt)}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClearSession}
            className="flex items-center gap-1.5 text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            Ver todos
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
          <Input
            placeholder="Buscar por motivo o fecha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-9 text-sm placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg p-1">
          {(['all', 'deposit', 'withdrawal'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'px-3 h-7 rounded-md text-xs font-medium transition-all cursor-pointer',
                filterType === type
                  ? type === 'deposit' ? 'bg-green-500/20 text-green-400'
                    : type === 'withdrawal' ? 'bg-red-500/20 text-red-400'
                      : 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent-text)]'
                  : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
              )}
            >
              {type === 'all' ? 'Todos' : type === 'deposit' ? 'Ingresos' : 'Retiros'}
            </button>
          ))}
        </div>
        <p className="text-[var(--admin-text-muted)] text-sm hidden sm:block">
          {filtered.length} {filtered.length === 1 ? 'movimiento' : 'movimientos'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-b-xl border border-t-0 border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] p-16 flex flex-col items-center justify-center text-center gap-3">
          {movements.length === 0 ? (
            <>
              <ArrowLeftRight className="h-10 w-10 text-[var(--admin-text-placeholder)]" />
              <div>
                <p className="text-sm font-medium text-[var(--admin-text-muted)]">Sin movimientos todavía</p>
                <p className="text-xs text-[var(--admin-text-faint)] mt-1">Los ingresos y retiros aparecerán aquí</p>
              </div>
            </>
          ) : (
            <>
              <SearchX className="h-10 w-10 text-[var(--admin-text-placeholder)]" />
              <div>
                <p className="text-sm font-medium text-[var(--admin-text-muted)]">Sin resultados</p>
                <p className="text-xs text-[var(--admin-text-faint)] mt-1">Probá con otro criterio</p>
              </div>
              <Button
                variant="ghost" size="sm"
                onClick={() => { setSearch(''); setFilterType('all') }}
                className="text-[var(--admin-accent-text)] hover:text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 text-xs h-8"
              >
                Limpiar filtros
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-b-xl border border-t-0 border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
                <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Fecha</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Tipo</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Monto</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">Motivo</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden md:table-cell">Sesión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id} className="border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors">
                    <TableCell>
                      <span className="font-semibold text-sm text-[var(--admin-text)]">{formatDateShort(m.created_at)}</span>
                      <span className="block text-xs text-[var(--admin-text-faint)]">{formatTimeShort(m.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      {m.type === 'deposit' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/12 text-green-400 border border-green-500/20">
                          <PlusCircle className="h-3 w-3" />Ingreso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/12 text-red-400 border border-red-500/20">
                          <MinusCircle className="h-3 w-3" />Retiro
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn('text-sm font-bold tabular-nums', m.type === 'deposit' ? 'text-green-400' : 'text-red-400')}>
                        {m.type === 'deposit' ? '+' : '-'}{formatPrice(m.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[var(--admin-text)]">{m.reason}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {m.cash_register_sessions ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-[var(--admin-text-muted)]">
                            {formatDateShort(m.cash_register_sessions.opened_at)} {formatTimeShort(m.cash_register_sessions.opened_at)}
                          </span>
                          <span className={cn('text-[10px] font-medium', m.cash_register_sessions.status === 'open' ? 'text-green-400' : 'text-[var(--admin-text-faint)]')}>
                            {m.cash_register_sessions.status === 'open' ? '● Abierta' : 'Cerrada'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--admin-text-faint)]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer totals */}
          <div className="border-t border-[var(--admin-border)] px-4 py-3 flex items-center justify-between gap-4 bg-[var(--admin-bg)]">
            <span className="text-xs text-[var(--admin-text-faint)]">
              {filtered.length} de {movements.length} movimientos
            </span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <PlusCircle className="h-3.5 w-3.5 text-green-400" />
                <span className="text-xs font-semibold text-green-400 tabular-nums">
                  +{formatPrice(filtered.filter(m => m.type === 'deposit').reduce((s, m) => s + m.amount, 0))}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MinusCircle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs font-semibold text-red-400 tabular-nums">
                  -{formatPrice(filtered.filter(m => m.type === 'withdrawal').reduce((s, m) => s + m.amount, 0))}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Minus className="h-3.5 w-3.5 text-[var(--admin-text-muted)]" />
                {(() => {
                  const net = filtered.filter(m => m.type === 'deposit').reduce((s, m) => s + m.amount, 0)
                    - filtered.filter(m => m.type === 'withdrawal').reduce((s, m) => s + m.amount, 0)
                  return (
                    <span className={cn('text-xs font-bold tabular-nums', net > 0 ? 'text-blue-400' : net < 0 ? 'text-red-400' : 'text-[var(--admin-text-muted)]')}>
                      {net >= 0 ? '+' : ''}{formatPrice(net)}
                    </span>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CajaHistorial({ sessions, movements }: CajaHistorialProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const tabParam = searchParams.get('tab') as TabKey | null
  const sessionParam = searchParams.get('session')

  const activeTab: TabKey = tabParam === 'movimientos' ? 'movimientos' : 'arqueos'
  const sessionFilter = activeTab === 'movimientos' ? sessionParam : null

  const navigate = useCallback((tab: TabKey, session?: string) => {
    const params = new URLSearchParams()
    params.set('tab', tab)
    if (session) params.set('session', session)
    router.push(`/admin/caja/arqueos?${params.toString()}`)
  }, [router])

  // Filtered movements when session filter is active
  const filteredMovements = useMemo(() => {
    if (!sessionFilter) return movements
    return movements.filter((m) => m.session_id === sessionFilter)
  }, [movements, sessionFilter])

  // Stats
  const totalSales = sessions.reduce((acc, s) => acc + s.total_sales, 0)
  const totalOrders = sessions.reduce((acc, s) => acc + s.total_orders, 0)
  const totalDeposits = movements.filter(m => m.type === 'deposit').reduce((s, m) => s + m.amount, 0)
  const totalWithdrawals = movements.filter(m => m.type === 'withdrawal').reduce((s, m) => s + m.amount, 0)
  const netBalance = totalDeposits - totalWithdrawals

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: 'arqueos', label: 'Arqueos', count: sessions.length },
    { key: 'movimientos', label: 'Movimientos', count: movements.length },
  ]

  return (
    <AdminLayout title="Arqueos de Caja" description="Arqueos de sesión y movimientos de caja">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Sesiones', value: sessions.length, color: 'text-[var(--admin-accent-text)]', bg: 'bg-[var(--admin-accent)]/10', icon: History },
          { label: 'Ventas totales', value: formatPrice(totalSales), color: 'text-green-500', bg: 'bg-green-500/10', icon: TrendingUp },
          { label: 'Órdenes totales', value: totalOrders, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Wallet },
          {
            label: 'Balance movimientos',
            value: formatPrice(Math.abs(netBalance)),
            color: netBalance > 0 ? 'text-[var(--admin-accent-text)]' : netBalance < 0 ? 'text-red-400' : 'text-[var(--admin-text-muted)]',
            bg: netBalance >= 0 ? 'bg-[var(--admin-accent)]/10' : 'bg-red-500/10',
            icon: netBalance >= 0 ? TrendingUp : TrendingDown,
            prefix: netBalance > 0 ? '+' : netBalance < 0 ? '-' : '',
          },
        ].map(({ label, value, color, bg, icon: Icon, prefix = '' }) => (
          <div key={label} className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--admin-text-muted)] text-sm font-medium">{label}</p>
                <p className={cn('text-2xl lg:text-3xl font-bold mt-1 tabular-nums', color)}>{prefix}{value}</p>
              </div>
              <div className={cn('w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center', bg)}>
                <Icon className={cn('h-5 w-5 lg:h-6 lg:w-6', color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar — orders-style */}
      <div className="flex items-center gap-0 border-b border-[var(--admin-border)] mb-0 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer',
              activeTab === tab.key
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent-text)]'
                : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                'ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium',
                activeTab === tab.key
                  ? 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent-text)]'
                  : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)]'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === 'arqueos' ? (
          <ArqueosTab
            sessions={sessions}
            onViewMovements={(sessionId) => navigate('movimientos', sessionId)}
          />
        ) : (
          <MovimientosTab
            movements={filteredMovements}
            sessionFilter={sessionFilter}
            onClearSession={() => navigate('movimientos')}
          />
        )}
      </div>
    </AdminLayout>
  )
}
