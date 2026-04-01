'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, SearchX, ArrowLeftRight,
  MinusCircle, PlusCircle,
  TrendingDown, TrendingUp, Minus, X,
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
import type { CashMovementWithSession } from '@/lib/types/cash-register'

interface MovimientosTableProps {
  movements: CashMovementWithSession[]
  sessionFilter?: string
}

type FilterType = 'all' | 'withdrawal' | 'deposit'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function sessionLabel(session: CashMovementWithSession['cash_register_sessions']) {
  if (!session) return '—'
  const date = formatDate(session.opened_at)
  const time = formatTime(session.opened_at)
  return `${date} ${time}`
}

export function MovimientosTable({ movements, sessionFilter }: MovimientosTableProps) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (filterType !== 'all' && m.type !== filterType) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const date = formatDate(m.created_at)
        if (
          !m.reason.toLowerCase().includes(q) &&
          !date.includes(q)
        ) return false
      }
      return true
    })
  }, [movements, search, filterType])

  const totalDeposits = movements
    .filter((m) => m.type === 'deposit')
    .reduce((s, m) => s + m.amount, 0)

  const totalWithdrawals = movements
    .filter((m) => m.type === 'withdrawal')
    .reduce((s, m) => s + m.amount, 0)

  const netBalance = totalDeposits - totalWithdrawals

  const stats = [
    {
      label: 'Ingresos',
      value: formatPrice(totalDeposits),
      count: movements.filter((m) => m.type === 'deposit').length,
      icon: PlusCircle,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Retiros',
      value: formatPrice(totalWithdrawals),
      count: movements.filter((m) => m.type === 'withdrawal').length,
      icon: MinusCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Balance neto',
      value: formatPrice(Math.abs(netBalance)),
      count: movements.length,
      icon: netBalance >= 0 ? TrendingUp : TrendingDown,
      color: netBalance > 0 ? 'text-blue-400' : netBalance < 0 ? 'text-red-400' : 'text-[var(--admin-text-muted)]',
      bg: netBalance > 0 ? 'bg-blue-500/10' : netBalance < 0 ? 'bg-red-500/10' : 'bg-[var(--admin-surface-2)]',
      prefix: netBalance >= 0 ? '+' : '-',
    },
    {
      label: 'Movimientos',
      value: movements.length.toString(),
      count: null,
      icon: ArrowLeftRight,
      color: 'text-[var(--admin-accent-text)]',
      bg: 'bg-[var(--admin-accent)]/10',
    },
  ]

  const sessionOpenedAt = movements[0]?.cash_register_sessions?.opened_at

  return (
    <AdminLayout title="Movimientos de Caja" description="Historial de ingresos y retiros registrados">

      {/* Session filter banner */}
      {sessionFilter && (
        <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/30 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--admin-accent-text)]">
              Filtrado por turno
              {sessionOpenedAt && (
                <span className="font-normal text-[var(--admin-text-muted)] ml-1">
                  — abierto el {new Date(sessionOpenedAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })} a las {new Date(sessionOpenedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              )}
            </p>
          </div>
          <Link
            href="/admin/caja/movimientos"
            className="flex items-center gap-1.5 text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            Ver todos
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, count, icon: Icon, color, bg, prefix }) => (
          <div
            key={label}
            className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--admin-text-muted)] text-sm font-medium">{label}</p>
                <p className={cn('text-2xl lg:text-3xl font-bold mt-1 tabular-nums', color)}>
                  {prefix}{value}
                </p>
                {count !== null && (
                  <p className="text-xs text-[var(--admin-text-faint)] mt-0.5">
                    {count} {count === 1 ? 'registro' : 'registros'}
                  </p>
                )}
              </div>
              <div className={cn('w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center', bg)}>
                <Icon className={cn('h-5 w-5 lg:h-6 lg:w-6', color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

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

        {/* Type filter */}
        <div className="flex items-center gap-1.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg p-1">
          {(['all', 'deposit', 'withdrawal'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'px-3 h-7 rounded-md text-xs font-medium transition-all cursor-pointer',
                filterType === type
                  ? type === 'deposit'
                    ? 'bg-green-500/20 text-green-400'
                    : type === 'withdrawal'
                      ? 'bg-red-500/20 text-red-400'
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

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] p-16 flex flex-col items-center justify-center text-center gap-3">
          {movements.length === 0 ? (
            <>
              <ArrowLeftRight className="h-10 w-10 text-[var(--admin-text-placeholder)]" />
              <div>
                <p className="text-sm font-medium text-[var(--admin-text-muted)]">Sin movimientos todavía</p>
                <p className="text-xs text-[var(--admin-text-faint)] mt-1">
                  Los ingresos y retiros de caja aparecerán aquí
                </p>
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
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setFilterType('all') }}
                className="text-[var(--admin-accent-text)] hover:text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 text-xs h-8"
              >
                Limpiar filtros
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
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">
                    Fecha
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">
                    Tipo
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">
                    Monto
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold">
                    Motivo
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold hidden md:table-cell">
                    Sesión
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow
                    key={m.id}
                    className="border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors"
                  >
                    {/* Fecha + hora */}
                    <TableCell>
                      <span className="font-semibold text-sm text-[var(--admin-text)]">
                        {formatDate(m.created_at)}
                      </span>
                      <span className="block text-xs text-[var(--admin-text-faint)]">
                        {formatTime(m.created_at)}
                      </span>
                    </TableCell>

                    {/* Tipo badge */}
                    <TableCell>
                      {m.type === 'deposit' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/12 text-green-400 border border-green-500/20">
                          <PlusCircle className="h-3 w-3" />
                          Ingreso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/12 text-red-400 border border-red-500/20">
                          <MinusCircle className="h-3 w-3" />
                          Retiro
                        </span>
                      )}
                    </TableCell>

                    {/* Monto */}
                    <TableCell>
                      <span className={cn(
                        'text-sm font-bold tabular-nums',
                        m.type === 'deposit' ? 'text-green-400' : 'text-red-400'
                      )}>
                        {m.type === 'deposit' ? '+' : '-'}{formatPrice(m.amount)}
                      </span>
                    </TableCell>

                    {/* Motivo */}
                    <TableCell>
                      <span className="text-sm text-[var(--admin-text)]">{m.reason}</span>
                    </TableCell>

                    {/* Sesión origen */}
                    <TableCell className="hidden md:table-cell">
                      {m.cash_register_sessions ? (
                        <Link
                          href={`/admin/caja/movimientos?session=${m.session_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="group/sess flex flex-col gap-0.5 w-fit"
                        >
                          <span className="text-xs text-[var(--admin-text-muted)] group-hover/sess:text-[var(--admin-accent-text)] transition-colors">
                            {sessionLabel(m.cash_register_sessions)}
                          </span>
                          <span className={cn(
                            'text-[10px] font-medium',
                            m.cash_register_sessions.status === 'open'
                              ? 'text-green-400'
                              : 'text-[var(--admin-text-faint)]'
                          )}>
                            {m.cash_register_sessions.status === 'open' ? '● Abierta' : 'Cerrada'}
                          </span>
                        </Link>
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
                    <span className={cn(
                      'text-xs font-bold tabular-nums',
                      net > 0 ? 'text-blue-400' : net < 0 ? 'text-red-400' : 'text-[var(--admin-text-muted)]'
                    )}>
                      {net >= 0 ? '+' : ''}{formatPrice(net)}
                    </span>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
