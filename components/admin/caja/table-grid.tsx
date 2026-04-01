'use client'

import { useMemo, useCallback } from 'react'
import { Table2 } from 'lucide-react'
import { TableCard } from './table-card'
import { TABLE_SECTION_LABELS } from '@/lib/types/tables'
import type { TableWithOrder } from '@/lib/types/tables'

interface TableGridProps {
  tables: TableWithOrder[]
  selectedTableId: string | null
  onSelectTable: (table: TableWithOrder) => void
  onOpenTable: (table: TableWithOrder) => void
}

export function TableGrid({
  tables,
  selectedTableId,
  onSelectTable,
  onOpenTable,
}: TableGridProps) {
  const sections = useMemo(() => {
    const grouped: Record<string, TableWithOrder[]> = {}
    for (const table of tables) {
      const section = table.section || 'principal'
      if (!grouped[section]) grouped[section] = []
      grouped[section].push(table)
    }
    return Object.entries(grouped).sort(([, a], [, b]) => {
      return (a[0]?.sort_order ?? 0) - (b[0]?.sort_order ?? 0)
    })
  }, [tables])

  const handleTableClick = useCallback((table: TableWithOrder) => {
    if (table.status === 'libre') {
      onOpenTable(table)
    } else {
      onSelectTable(table)
    }
  }, [onOpenTable, onSelectTable])

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--admin-text-muted)]">
        <Table2 className="h-12 w-12 mb-3 text-[var(--admin-text-placeholder)]" />
        <p className="text-sm font-medium">No hay mesas configuradas</p>
        <p className="text-xs mt-1">Configurá las mesas desde el panel de administración</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      {sections.map(([sectionKey, sectionTables]) => (
        <div key={sectionKey}>
          {/* Section header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--admin-text-faint)]">
              {TABLE_SECTION_LABELS[sectionKey] || sectionKey}
            </span>
            <span className="text-[11px] text-[var(--admin-text-faint)]">
              · {sectionTables.length} {sectionTables.length === 1 ? 'mesa' : 'mesas'}
            </span>
          </div>

          {/* Table cards — 4 columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {sectionTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                isSelected={table.id === selectedTableId}
                onClick={() => handleTableClick(table)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
