'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Printer, Search } from 'lucide-react'
import { AdminLayout } from '@/components/admin/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { DatosDeCostos } from '@/app/actions/reporte-costos'
import {
  ABREVIATURA_DE_UNIDAD,
  NOMBRE_DEL_TIPO,
  VISTA_INICIAL,
  filtrarInsumos,
  filtrarProductos,
  formatearMargen,
  formatearPesos,
  resumirInsumos,
  resumirProductos,
  vistaAQuery,
  type Categoria,
  type Pestana,
  type VistaDeCostos,
} from '@/lib/constants/reporte-costos'

interface Props {
  datos: DatosDeCostos | null
  error: string | null
  vistaInicial: VistaDeCostos
}

// Las mismas clases que las tablas de Ingredientes, Stock y Productos: el
// reporte tiene que sentirse parte del panel, no una pantalla aparte.
const TAB = 'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors'
const TAB_ACTIVA = 'border-[var(--admin-accent)] text-[var(--admin-accent-text)]'
const TAB_INACTIVA = 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
const CONTADOR = 'ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium'
const CONTADOR_ACTIVO = 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent-text)]'
const CONTADOR_INACTIVO = 'bg-[var(--admin-surface-2)] text-[var(--admin-text-muted)]'
const ENCABEZADO = 'text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70 font-semibold'

/**
 * Reportes → Costos: que cuesta cada cosa, y cuanto deja lo que se vende.
 *
 * Se mira en pantalla y se imprime **lo que se esta viendo**. La version
 * anterior hacia elegir categorias a ciegas y recien en el papel aparecian los
 * numeros; David: *"¿no deberíamos poder ver las tablas antes?"*. Muchas veces
 * alcanza con mirar.
 *
 * Dos pestanas, porque una hoja es de productos o de insumos, nunca de los
 * dos. Un producto se vende: costo, precio y margen. Un insumo no: lo que
 * cuesta un kilo, un litro o una unidad.
 *
 * El filtro y el orden los hace `filtrarProductos` / `filtrarInsumos`, la misma
 * funcion que usa la hoja impresa. Por eso lo que sale en el papel es lo que
 * hay en pantalla, en el mismo orden.
 */
export function ReporteCostosTabla({ datos, error, vistaInicial }: Props) {
  const [vista, setVista] = useState<VistaDeCostos>(vistaInicial)

  // La vista queda en la URL --sin recargar-- para que el favorito funcione.
  const cambiar = (parcial: Partial<VistaDeCostos>) => {
    setVista((prev) => {
      const siguiente = { ...prev, ...parcial }
      try {
        window.history.replaceState(null, '', `/admin/reportes/costos${vistaAQuery(siguiente)}`)
      } catch {
        // Sin historial no se pierde nada: solo el favorito.
      }
      return siguiente
    })
  }

  const cambiarPestana = (pestana: Pestana) =>
    cambiar({ ...VISTA_INICIAL, pestana })

  const ordenarPor = (columna: string) =>
    // El primer toque siempre es de menor a mayor. Para el margen es justo lo
    // util: los que menos dejan quedan arriba.
    cambiar(vista.orden === columna ? { asc: !vista.asc } : { orden: columna, asc: true })

  const productos = useMemo(
    () => (datos ? filtrarProductos(datos.productos, vista) : []),
    [datos, vista]
  )
  const insumos = useMemo(() => (datos ? filtrarInsumos(datos.insumos, vista) : []), [datos, vista])

  const esProductos = vista.pestana === 'productos'
  const filasTodas = useMemo(
    () => (esProductos ? (datos?.productos ?? []) : (datos?.insumos ?? [])),
    [datos, esProductos]
  )
  const categorias: Categoria[] = esProductos
    ? (datos?.categoriasDeProductos ?? [])
    : (datos?.categoriasDeInsumos ?? [])

  // Los contadores de las categorias no dependen de la busqueda, igual que en
  // Ingredientes: dicen cuanto hay, no cuanto coincide.
  const porCategoria = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of filasTodas) m.set(f.categoriaId, (m.get(f.categoriaId) ?? 0) + 1)
    return m
  }, [filasTodas])

  const visibles = esProductos ? productos.length : insumos.length
  // Con una categoria elegida, la columna Categoria diria lo mismo en cada fila.
  const conCategoria = vista.categoria === null

  const imprimir = () => window.open(`/admin/reportes/costos/print${vistaAQuery(vista)}`, '_blank')

  /**
   * Un encabezado que ordena al tocarlo.
   *
   * Funcion y no componente: un componente definido adentro del render es un
   * tipo nuevo en cada render, y React desmontaria y volveria a montar los
   * encabezados en cada tecla del buscador.
   */
  const orden = (columna: string, children: string, alinear?: 'right') => {
    const activa = vista.orden === columna
    return (
      <TableHead
        key={columna}
        className={cn(ENCABEZADO, alinear === 'right' && 'text-right')}
        aria-sort={activa ? (vista.asc ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          onClick={() => ordenarPor(columna)}
          className={cn(
            'inline-flex items-center gap-1 uppercase tracking-wide hover:text-[var(--admin-text)] transition-colors',
            activa && 'text-[var(--admin-text)]'
          )}
        >
          {children}
          {activa && (vista.asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
        </button>
      </TableHead>
    )
  }

  return (
    <AdminLayout title="Costos">
      {error && <p className="mb-4 text-sm text-red-700 dark:text-red-400">{error}</p>}

      {/* Productos / Insumos */}
      <div className="flex items-center gap-0 border-b border-[var(--admin-border)] mb-4">
        {(['productos', 'insumos'] as const).map((p) => {
          const activa = vista.pestana === p
          const cantidad = p === 'productos' ? (datos?.productos.length ?? 0) : (datos?.insumos.length ?? 0)
          return (
            <button key={p} type="button" onClick={() => cambiarPestana(p)} className={cn(TAB, activa ? TAB_ACTIVA : TAB_INACTIVA)}>
              {p === 'productos' ? 'Productos' : 'Insumos'}
              <span className={cn(CONTADOR, activa ? CONTADOR_ACTIVO : CONTADOR_INACTIVO)}>{cantidad}</span>
            </button>
          )
        })}
      </div>

      {/* Buscador e imprimir */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-text-muted)]" />
          <Input
            value={vista.busqueda}
            onChange={(e) => cambiar({ busqueda: e.target.value })}
            placeholder={esProductos ? 'Buscar producto...' : 'Buscar insumo...'}
            className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] text-sm h-9 pl-9 placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]/50 focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          />
        </div>
        <p className="text-[var(--admin-text-muted)] text-sm hidden sm:block">
          {visibles} {esProductos ? (visibles === 1 ? 'producto' : 'productos') : visibles === 1 ? 'insumo' : 'insumos'}
        </p>
        <div className="ml-auto">
          <Button
            onClick={imprimir}
            disabled={!datos || visibles === 0}
            className="bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[var(--admin-accent)]/20 transition-all hover:scale-105 active:scale-95 h-9"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Categorias */}
      <div className="flex items-center gap-0 border-b border-[var(--admin-border)] overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => cambiar({ categoria: null })}
          className={cn(TAB, vista.categoria === null ? TAB_ACTIVA : TAB_INACTIVA)}
        >
          Todas
          <span className={cn(CONTADOR, vista.categoria === null ? CONTADOR_ACTIVO : CONTADOR_INACTIVO)}>
            {filasTodas.length}
          </span>
        </button>
        {categorias.map((c) => {
          const activa = vista.categoria === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => cambiar({ categoria: c.id })}
              className={cn(TAB, activa ? TAB_ACTIVA : TAB_INACTIVA)}
            >
              {c.nombre}
              <span className={cn(CONTADOR, activa ? CONTADOR_ACTIVO : CONTADOR_INACTIVO)}>
                {porCategoria.get(c.id) ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tabla */}
      <div className="border border-t-0 border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-[var(--admin-bg)]">
            <TableRow className="border-[var(--admin-border)] hover:bg-[var(--admin-bg)]">
              {esProductos ? (
                <>
                  {orden('nombre', 'Producto')}
                  {conCategoria && orden('categoria', 'Categoría')}
                  {orden('tipo', 'Tipo')}
                  {orden('costo', 'Costo', 'right')}
                  {orden('precio', 'Precio', 'right')}
                  {orden('margen', 'Margen', 'right')}
                </>
              ) : (
                <>
                  {orden('nombre', 'Insumo')}
                  {conCategoria && orden('categoria', 'Categoría')}
                  <TableHead className={cn(ENCABEZADO, 'text-right')}>Costo / Unidad</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles === 0 && (
              <tr>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-[var(--admin-text-muted)]">
                  Nada coincide con lo que estás buscando.
                </TableCell>
              </tr>
            )}

            {esProductos
              ? productos.map((f) => (
                  <tr key={f.id} className="border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors group">
                    <TableCell>
                      <p className="font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors text-sm lg:text-base">
                        {f.nombre}
                      </p>
                    </TableCell>
                    {conCategoria && (
                      <TableCell>
                        <span className="text-[var(--admin-text-muted)] text-sm">{f.categoria}</span>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="text-[var(--admin-text-muted)] text-sm">{NOMBRE_DEL_TIPO[f.tipo]}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.costo === null ? (
                        <span className="text-[var(--admin-text-muted)] text-sm italic">sin costo</span>
                      ) : (
                        <span className="text-sm text-[var(--admin-text)]">{formatearPesos(f.costo)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="text-[var(--admin-price)] font-semibold text-sm lg:text-base">
                        {formatearPesos(f.precio)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {/* Solo se marca el margen negativo: se vende a perdida. */}
                      {f.margen === null ? (
                        <span className="text-[var(--admin-text-faint)]">—</span>
                      ) : (
                        <span
                          className={cn(
                            'text-sm',
                            f.margen < 0 ? 'font-bold text-red-700 dark:text-red-400' : 'text-[var(--admin-text)]'
                          )}
                        >
                          {formatearMargen(f.margen)}
                        </span>
                      )}
                    </TableCell>
                  </tr>
                ))
              : insumos.map((f) => (
                  <tr key={f.id} className="border-[var(--admin-border)] hover:bg-[var(--admin-surface-2)] transition-colors group">
                    <TableCell>
                      <p className="font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-accent-text)] transition-colors text-sm lg:text-base">
                        {f.nombre}
                      </p>
                    </TableCell>
                    {conCategoria && (
                      <TableCell>
                        <span className="text-[var(--admin-text-muted)] text-sm">{f.categoria}</span>
                      </TableCell>
                    )}
                    <TableCell className="text-right tabular-nums">
                      {f.costo === null ? (
                        <span className="text-[var(--admin-text-muted)] text-sm italic">sin costo</span>
                      ) : (
                        <>
                          <span className="text-[var(--admin-price)] font-semibold text-sm lg:text-base">
                            {formatearPesos(f.costo)}
                          </span>
                          <span className="text-[var(--admin-text-muted)] text-xs ml-1">
                            / {ABREVIATURA_DE_UNIDAD[f.unidad] ?? f.unidad}
                          </span>
                          {f.equivalente && (
                            <span className="block text-xs text-[var(--admin-text-muted)]">
                              = {formatearPesos(f.equivalente.valor)} /{' '}
                              {ABREVIATURA_DE_UNIDAD[f.equivalente.unidad] ?? f.equivalente.unidad}
                            </span>
                          )}
                        </>
                      )}
                    </TableCell>
                  </tr>
                ))}
          </TableBody>
        </Table>
      </div>

      <Resumen esProductos={esProductos} productos={productos} insumos={insumos} />
    </AdminLayout>
  )
}

/** El pie, sobre lo que se esta viendo: cambia con el filtro. */
function Resumen({
  esProductos,
  productos,
  insumos,
}: {
  esProductos: boolean
  productos: ReturnType<typeof filtrarProductos>
  insumos: ReturnType<typeof filtrarInsumos>
}) {
  if (esProductos) {
    const r = resumirProductos(productos)
    return (
      <p className="mt-3 text-sm text-[var(--admin-text-muted)]">
        {r.sinCosto > 0 && (
          <>
            <strong className="text-[var(--admin-text)]">{r.sinCosto}</strong> sin costo cargado ·{' '}
          </>
        )}
        margen promedio{' '}
        <strong className="text-[var(--admin-text)]">
          {r.margenPromedio === null ? '—' : formatearMargen(r.margenPromedio)}
        </strong>
      </p>
    )
  }
  const r = resumirInsumos(insumos)
  return r.sinCosto > 0 ? (
    <p className="mt-3 text-sm text-[var(--admin-text-muted)]">
      <strong className="text-[var(--admin-text)]">{r.sinCosto}</strong> sin costo cargado
    </p>
  ) : null
}
