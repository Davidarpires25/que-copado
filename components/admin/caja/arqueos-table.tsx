'use client'

import { Fragment, useState, useMemo } from 'react'
import { Search, SearchX, History, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Banknote, CreditCard, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
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
import type { CashRegisterSession, CashMovement } from '@/lib/types/cash-register'
import { getSessionSummary } from '@/app/actions/cash-register'

interface ArqueosTableProps {
  sessions: CashRegisterSession[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function formatTimeShort(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
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

  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-400">
        <Minus className="h-3 w-3" />
        {label}
      </span>
    )
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400">
        <TrendingUp className="h-3 w-3" />
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400">
      <TrendingDown className="h-3 w-3" />
      {label}
    </span>
  )
}

// ─── Expanded row detail ───────────────────────────────────────────────────────

interface SessionDetailProps {
  session: CashRegisterSession
}

function SessionDetail({ session }: SessionDetailProps) {
  const [movements, setMovements] = useState<CashMovement[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    if (loaded) return
    setLoading(true)
    const { data } = await getSessionSummary(session.id)
    setMovements(data?.movements ?? [])
    setLoading(false)
    setLoaded(true)
  }

  // Load on mount
  if (!loaded && !loading) load()

  const expectedCash =
    session.opening_balance +
    session.total_cash_sales +
    session.total_deposits -
    session.total_withdrawals

  return (
    <div className="px-4 pb-4 pt-2 bg-[var(--admin-bg)] border-t border-[var(--admin-border)]">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 mt-2">
        {[
          { label: 'Saldo apertura', value: formatPrice(session.opening_balance), icon: Banknote, color: 'text-[var(--admin-text-muted)]' },
          { label: 'Efectivo esperado', value: formatPrice(expectedCash), icon: Banknote, color: 'text-blue-400' },
          { label: 'Efectivo contado', value: session.actual_cash !== null ? formatPrice(session.actual_cash) : '—', icon: Banknote, color: 'text-[var(--admin-accent-text)]' },
          { label: 'Diferencia', value: session.cash_difference !== null ? formatPrice(session.cash_difference) : '—', icon: session.cash_difference === 0 ? Minus : session.cash_difference !== null && session.cash_difference > 0 ? TrendingUp : TrendingDown, color: session.cash_difference === 0 ? 'text-green-400' : session.cash_difference !== null && session.cash_difference < 0 ? 'text-red-400' : 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg p-3">
            <p className="text-[var(--admin-text-muted)] text-xs font-medium mb-1">{label}</p>
            <div className="flex items-center gap-1.5">
              <Icon className={cn('h-3.5 w-3.5 shrink-0', color)} />
              <span className={cn('text-sm font-bold', color)}>{value}</span>
            </div>
          </div>
        ))}
      </div>

      {session.notes && (
        <p className="text-xs text-[var(--admin-text-muted)] italic mb-3 px-1">
          Nota: {session.notes}
        </p>
      )}

      {/* Movements */}
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--admin-text-muted)] mb-2 px-1">
        Movimientos de caja
      </p>
      {loading ? (
        <p className="text-xs text-[var(--admin-text-faint)] px-1">Cargando...</p>
      ) : movements && movements.length > 0 ? (
        <div className="space-y-1.5">
          {movements.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg px-3 py-2"
            >
              {m.type === 'withdrawal' ? (
                <ArrowDownCircle className="h-4 w-4 text-red-400 shrink-0" />
              ) : (
                <ArrowUpCircle className="h-4 w-4 text-green-400 shrink-0" />
              )}
              <span className="text-xs text-[var(--admin-text-muted)] flex-1 truncate">{m.reason}</span>
              <span className={cn('text-xs font-bold shrink-0', m.type === 'withdrawal' ? 'text-red-400' : 'text-green-400')}>
                {m.type === 'withdrawal' ? '-' : '+'}{formatPrice(m.amount)}
              </span>
              <span className="text-[10px] text-[var(--admin-text-faint)] shrink-0">
                {formatTimeShort(m.created_at)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--admin-text-faint)] px-1">Sin movimientos registrados</p>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ArqueosTable({ sessions }: ArqueosTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    const q = searchQuery.toLowerCase()
    return sessions.filter((s) => {
      const date = formatDateShort(s.closed_at ?? s.opened_at)
      return date.includes(q) || s.notes?.toLowerCase().includes(q)
    })
  }, [sessions, searchQuery])

  // Stats
  const totalSales = sessions.reduce((acc, s) => acc + s.total_sales, 0)
  const totalWithDiff = sessions.filter((s) => s.cash_difference !== null && s.cash_difference !== 0).length
  const totalOrders = sessions.reduce((acc, s) => acc + s.total_orders, 0)

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <AdminLayout title="Arqueos de Caja" description="Historial de cierres y arqueos de sesiones">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Sesiones', value: sessions.length, color: 'text-[var(--admin-accent-text)]', bg: 'bg-[var(--admin-accent)]/10', icon: History },
          { label: 'Ventas totales', value: formatPrice(totalSales), color: 'text-green-500', bg: 'bg-green-500/10', icon: TrendingUp },
          { label: 'Órdenes totales', value: totalOrders, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Wallet },
          { label: 'Con diferencia', value: totalWithDiff, color: 'text-red-500', bg: 'bg-red-500/10', icon: TrendingDown },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--admin-text-muted)] text-sm font-medium">{label}</p>
                <p className="text-2xl lg:text-3xl font-bold text-[var(--admin-text)] mt-1">{value}</p>
              </div>
              <div className={`w-10 h-10 lg:w-12 lg:h-12 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`h-5 w-5 lg:h-6 lg:w-6 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search bar */}
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

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] p-16 flex flex-col items-center justify-center text-center gap-3">
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
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="text-[var(--admin-accent-text)] hover:text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 text-xs h-8"
              >
                Limpiar búsqueda
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
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
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((session) => {
                  const isExpanded = expandedId === session.id
                  const closedAt = session.closed_at ?? session.opened_at

                  return (
                    <Fragment key={session.id}>
                      <tr
                        className="hover:bg-[var(--admin-surface-2)] transition-colors group cursor-pointer border-b border-[var(--admin-border)] last:border-0"
                        onClick={() => handleToggle(session.id)}
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
                          <span className="text-sm text-[var(--admin-text-muted)]">
                            {formatDuration(session.opened_at, closedAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-[var(--admin-accent-text)]">
                            {formatPrice(session.total_sales)}
                          </span>
                          <span className="block text-xs text-[var(--admin-text-faint)]">
                            {session.total_orders} {session.total_orders === 1 ? 'orden' : 'órdenes'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-[var(--admin-text-muted)]">
                            {formatPrice(session.total_cash_sales)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-[var(--admin-text-muted)]">
                            {formatPrice(session.total_card_sales)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-[var(--admin-text-muted)]">
                            {formatPrice(session.total_transfer_sales)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DiffBadge diff={session.cash_difference} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--admin-text-faint)] group-hover:text-[var(--admin-text-muted)] transition-colors">
                            {isExpanded
                              ? <ChevronUp className="h-4 w-4" />
                              : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </TableCell>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-[var(--admin-bg)]">
                          <td colSpan={8} className="p-0">
                            <SessionDetail session={session} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
