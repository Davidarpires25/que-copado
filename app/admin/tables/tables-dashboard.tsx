'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, UtensilsCrossed, ChevronUp, ChevronDown, Pencil, Trash2, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AdminLayout } from '@/components/admin/layout'
import { TableFormDialog } from '@/components/admin/tables/table-form-dialog'
import { updateTable, deleteTable, reorderTable } from '@/app/actions/tables'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import type { RestaurantTable } from '@/lib/types/tables'
import { TABLE_SECTION_LABELS } from '@/lib/types/tables'

interface TablesDashboardProps {
  initialTables: RestaurantTable[]
}

export function TablesDashboard({ initialTables }: TablesDashboardProps) {
  const router = useRouter()
  const [tables, setTables] = useState<RestaurantTable[]>(initialTables)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RestaurantTable | null>(null)

  const activeCount = tables.filter((t) => t.is_active).length
  const inactiveCount = tables.filter((t) => !t.is_active).length

  // Group tables by section
  const sections = Object.keys(TABLE_SECTION_LABELS)
  const groupedTables: Record<string, RestaurantTable[]> = {}
  for (const section of sections) {
    const sectionTables = tables.filter((t) => t.section === section)
    if (sectionTables.length > 0) {
      groupedTables[section] = sectionTables
    }
  }
  // Include tables with unknown sections
  const knownSections = new Set(sections)
  const unknownTables = tables.filter((t) => !knownSections.has(t.section))
  if (unknownTables.length > 0) {
    groupedTables['otro'] = unknownTables
  }

  const handleEdit = (table: RestaurantTable) => {
    setEditingTable(table)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingTable(null)
  }

  const handleTableSaved = (table: RestaurantTable) => {
    if (editingTable) {
      setTables(tables.map((t) => (t.id === table.id ? table : t)))
    } else {
      setTables([...tables, table])
    }
    setIsFormOpen(false)
    setEditingTable(null)
  }

  const handleDelete = async (table: RestaurantTable) => {
    setDeleteTarget(null)
    setDeletingId(table.id)
    try {
      const result = await deleteTable(table.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Mesa ${table.number} eliminada`)
      setTables(tables.filter((t) => t.id !== table.id))
    } catch {
      toast.error('Error al eliminar la mesa')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (table: RestaurantTable) => {
    setTogglingId(table.id)
    try {
      const result = await updateTable(table.id, { is_active: !table.is_active })
      if (result.error) {
        toast.error(result.error)
        return
      }
      setTables(tables.map((t) => (t.id === table.id ? { ...t, is_active: !t.is_active } : t)))
      toast.success(table.is_active ? `Mesa ${table.number} desactivada` : `Mesa ${table.number} activada`)
    } catch {
      toast.error('Error al cambiar estado')
    } finally {
      setTogglingId(null)
    }
  }

  const handleReorder = async (tableId: string, direction: 'up' | 'down') => {
    setMovingId(tableId)
    try {
      const result = await reorderTable(tableId, direction)
      if (result.error) {
        toast.error(result.error)
        return
      }
      router.refresh()
    } catch {
      toast.error('Error al reordenar')
    } finally {
      setMovingId(null)
    }
  }

  return (
    <AdminLayout title="Mesas" description="Gestiona las mesas del restaurante">
      <div className="max-w-3xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[var(--admin-text)]">{tables.length}</p>
            <p className="text-xs text-[var(--admin-text-muted)] mt-1">Total</p>
          </div>
          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{activeCount}</p>
            <p className="text-xs text-[var(--admin-text-muted)] mt-1">Activas</p>
          </div>
          <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[var(--admin-text-muted)]">{inactiveCount}</p>
            <p className="text-xs text-[var(--admin-text-muted)] mt-1">Inactivas</p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-[var(--admin-text-muted)]">
            {tables.length} {tables.length === 1 ? 'mesa' : 'mesas'}
          </p>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Mesa
          </Button>
        </div>

        {/* Tables grouped by section */}
        {Object.entries(groupedTables).map(([section, sectionTables]) => (
          <div key={section} className="mb-6">
            <h3 className="text-sm font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider mb-3">
              {TABLE_SECTION_LABELS[section] || section}
            </h3>
            <div className="space-y-2">
              {sectionTables.map((table, index) => {
                const globalIndex = tables.findIndex((t) => t.id === table.id)
                return (
                  <div
                    key={table.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                      table.is_active
                        ? 'bg-[var(--admin-surface)] border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40'
                        : 'bg-[var(--admin-surface)]/50 border-[var(--admin-border)]/50 opacity-60'
                    }`}
                  >
                    {/* Reorder */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleReorder(table.id, 'up')}
                        disabled={globalIndex === 0 || movingId === table.id}
                        className="p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover arriba"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReorder(table.id, 'down')}
                        disabled={globalIndex === tables.length - 1 || movingId === table.id}
                        className="p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover abajo"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Table Number */}
                    <div className="w-10 h-10 rounded-lg bg-[var(--admin-border)] flex items-center justify-center text-sm font-bold text-[var(--admin-text)]">
                      {table.number}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[var(--admin-text)] truncate">
                        Mesa {table.number}
                        {table.label && (
                          <span className="text-[var(--admin-text-muted)] font-normal ml-2">
                            ({table.label})
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-[var(--admin-text-muted)]">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {table.capacity}
                        </span>
                        <span>{TABLE_SECTION_LABELS[table.section] || table.section}</span>
                      </div>
                    </div>

                    {/* Loading */}
                    {movingId === table.id && (
                      <Loader2 className="h-4 w-4 text-[var(--admin-text-muted)] animate-spin" />
                    )}

                    {/* Active toggle */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Switch
                              checked={table.is_active}
                              onCheckedChange={() => handleToggleActive(table)}
                              disabled={togglingId === table.id}
                              className="data-[state=checked]:bg-green-500"
                              aria-label={table.is_active ? 'Activa' : 'Inactiva'}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {table.is_active ? 'Activa' : 'Inactiva'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(table)}
                              className="h-9 w-9 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border)]"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(table)}
                              disabled={deletingId === table.id}
                              className="h-9 w-9 text-[var(--admin-text-muted)] hover:text-red-400 hover:bg-red-500/10"
                            >
                              {deletingId === table.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Empty State */}
        {tables.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-full bg-[var(--admin-border)] flex items-center justify-center mb-4">
              <UtensilsCrossed className="h-10 w-10 text-[#3a4150]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--admin-text)] mb-2">
              No hay mesas
            </h3>
            <p className="text-[var(--admin-text-muted)] mb-6">
              Agrega tu primera mesa para empezar
            </p>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Mesa
            </Button>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <TableFormDialog
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        table={editingTable}
        onTableSaved={handleTableSaved}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Eliminar mesa ${deleteTarget?.number ?? ''}`}
        description="Esta accion no se puede deshacer. La mesa sera eliminada permanentemente."
        confirmLabel="Eliminar"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </AdminLayout>
  )
}
