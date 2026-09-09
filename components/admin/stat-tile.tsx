import { cn } from '@/lib/utils'

/**
 * Tarjeta de KPI del admin.
 *
 * El mismo bloque estaba copiado en 9 archivos (arqueos, movimientos, historial
 * de caja, stock, productos, ingredientes, recetas, pedidos). Cada copia fue
 * divirgiendo en detalles —una tiñe el valor, otra no; una muestra una linea de
 * apoyo, otra no— asi que este componente cubre la union de todas.
 */

interface StatTileProps {
  label: string
  value: React.ReactNode
  icon: React.ElementType
  /** Color del icono. Tambien tiñe el valor si `tintValue` es true. */
  colorClass?: string
  /** Fondo de la caja del icono. */
  iconBgClass?: string
  /** Linea de apoyo debajo del valor (por ejemplo "12 registros"). */
  hint?: string
  /** Prefijo pegado al valor, como el signo de un balance. */
  prefix?: string
  /** Pinta el valor con `colorClass` en vez del color de texto normal. */
  tintValue?: boolean
}

export function StatTile({
  label,
  value,
  icon: Icon,
  colorClass = 'text-[var(--admin-accent-text)]',
  iconBgClass = 'bg-[var(--admin-accent)]/10',
  hint,
  prefix,
  tintValue = false,
}: StatTileProps) {
  return (
    <div className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-4 lg:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[var(--admin-text-muted)] text-sm font-medium">{label}</p>
          <p
            className={cn(
              'text-2xl lg:text-3xl font-bold mt-1 tabular-nums',
              tintValue ? colorClass : 'text-[var(--admin-text)]'
            )}
          >
            {prefix}
            {value}
          </p>
          {hint && (
            <p className="text-xs text-[var(--admin-text-faint)] mt-0.5">{hint}</p>
          )}
        </div>
        <div
          className={cn(
            'w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center shrink-0',
            iconBgClass
          )}
        >
          <Icon className={cn('h-5 w-5 lg:h-6 lg:w-6', colorClass)} />
        </div>
      </div>
    </div>
  )
}

/** Grilla estandar de KPIs: 2 columnas en mobile, 4 desde `sm`. */
export function StatTileGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">{children}</div>
}
