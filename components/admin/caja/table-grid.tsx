'use client'

import { useMemo } from 'react'
import { LayoutGrid } from 'lucide-react'
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
  /** Group tables by section, preserving sort_order within each group */
  const sections = useMemo(() => {
    const grouped: Record<string, TableWithOrder[]> = {}

    for (const table of tables) {
      const section = table.section || 'principal'
      if (!grouped[section]) grouped[section] = []
      grouped[section].push(table)
    }

    // Return entries sorted by first table's sort_order in each section
    return Object.entries(grouped).sort(([, a], [, b]) => {
      return (a[0]?.sort_order ?? 0) - (b[0]?.sort_order ?? 0)
    })
  }, [tables])

  const handleTableClick = (table: TableWithOrder) => {
    if (table.status === 'libre') {
      onOpenTable(table)
    } else {
      onSelectTable(table)
    }
  }

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--admin-text-muted)]">
        <LayoutGrid className="h-12 w-12 mb-3 text-[var(--admin-text-placeholder)]" />
        <p className="text-lg font-medium">No hay mesas configuradas</p>
        <p className="text-sm mt-1">
          Configura las mesas desde el panel de administracion
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {sections.map(([sectionKey, sectionTables]) => (
        <div key={sectionKey}>
          {/* Section header */}
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-[var(--admin-text-muted)] uppercase tracking-wider">
              {TABLE_SECTION_LABELS[sectionKey] || sectionKey}
            </h3>
            <div className="flex-1 h-px bg-[var(--admin-border)]" />
            <span className="text-xs text-[var(--admin-text-faint)]">
              {sectionTables.length}{' '}
              {sectionTables.length === 1 ? 'mesa' : 'mesas'}
            </span>
          </div>

          {/* Table cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
