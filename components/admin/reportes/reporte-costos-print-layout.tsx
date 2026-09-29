'use client'

import { HojaImpresa } from '@/components/admin/hojas/hoja-impresa'
import {
  ABREVIATURA_DE_UNIDAD,
  NOMBRE_DEL_TIPO,
  formatearMargen,
  formatearPesos,
  resumirInsumos,
  resumirProductos,
  type FilaDeInsumo,
  type FilaDeProducto,
  type VistaDeCostos,
} from '@/lib/constants/reporte-costos'

interface Props {
  vista: VistaDeCostos
  /** "Insumos · Carnes", para saber de que es la hoja una vez impresa. */
  descripcion: string
  productos: FilaDeProducto[]
  insumos: FilaDeInsumo[]
  fecha: string
}

/**
 * El reporte de costos en papel: lo que se estaba viendo en pantalla.
 *
 * Las filas llegan ya filtradas y ordenadas por la misma funcion que usa la
 * tabla, asi que esta pagina no decide nada: solo dibuja. Mismas columnas que
 * la pantalla, incluida la de categoria cuando se miran todas.
 *
 * El armazón —barra, página, encabezado— es el de todas las hojas A4:
 * `HojaImpresa`.
 */
export function ReporteCostosPrintLayout({ vista, descripcion, productos, insumos, fecha }: Props) {

  const esProductos = vista.pestana === 'productos'
  const conCategoria = vista.categoria === null
  const renglones = esProductos ? productos.length : insumos.length

  return (
    <HojaImpresa
      barra={<>Vista previa — {descripcion}: <strong>{renglones}</strong> {renglones === 1 ? 'renglón' : 'renglones'}</>}
      titulo="Reporte de costos"
      meta={<>{descripcion} · Impreso el {fecha}</>}
      estilos={ESTILOS}
    >
        {renglones === 0 ? (
          <p className="suave">No hay nada con este filtro.</p>
        ) : esProductos ? (
          <TablaDeProductos filas={productos} conCategoria={conCategoria} />
        ) : (
          <TablaDeInsumos filas={insumos} conCategoria={conCategoria} />
        )}

        {esProductos ? <ResumenDeProductos filas={productos} /> : <ResumenDeInsumos filas={insumos} />}
    </HojaImpresa>
  )
}

function TablaDeProductos({ filas, conCategoria }: { filas: FilaDeProducto[]; conCategoria: boolean }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          {conCategoria && <th>Categoría</th>}
          <th>Tipo</th>
          <th className="num">Costo</th>
          <th className="num">Precio</th>
          <th className="num">Margen</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.id}>
            <td>{f.nombre}</td>
            {conCategoria && <td className="suave">{f.categoria}</td>}
            <td className="suave">{NOMBRE_DEL_TIPO[f.tipo]}</td>
            <td className="num">
              {f.costo === null ? <span className="falta">sin costo</span> : formatearPesos(f.costo)}
            </td>
            <td className="num">{formatearPesos(f.precio)}</td>
            {/* Un margen negativo es el unico que se marca: se vende a perdida. */}
            <td className={`num ${f.margen !== null && f.margen < 0 ? 'perdida' : ''}`}>
              {f.margen === null ? '—' : formatearMargen(f.margen)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TablaDeInsumos({ filas, conCategoria }: { filas: FilaDeInsumo[]; conCategoria: boolean }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Insumo</th>
          {conCategoria && <th>Categoría</th>}
          <th className="num">Costo / Unidad</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.id}>
            <td>{f.nombre}</td>
            {conCategoria && <td className="suave">{f.categoria}</td>}
            <td className="num">
              {f.costo === null ? (
                <span className="falta">sin costo</span>
              ) : (
                <>
                  {formatearPesos(f.costo)} / {ABREVIATURA_DE_UNIDAD[f.unidad] ?? f.unidad}
                  {f.equivalente && (
                    <span className="equivalente">
                      = {formatearPesos(f.equivalente.valor)} /{' '}
                      {ABREVIATURA_DE_UNIDAD[f.equivalente.unidad] ?? f.equivalente.unidad}
                    </span>
                  )}
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ResumenDeProductos({ filas }: { filas: FilaDeProducto[] }) {
  const r = resumirProductos(filas)
  return (
    <div className="resumen">
      <div>
        <strong>{r.cantidad}</strong>
        <span>productos</span>
      </div>
      <div>
        <strong>{r.sinCosto}</strong>
        <span>sin costo cargado</span>
      </div>
      <div>
        <strong>{r.margenPromedio === null ? '—' : formatearMargen(r.margenPromedio)}</strong>
        <span>margen promedio</span>
      </div>
    </div>
  )
}

function ResumenDeInsumos({ filas }: { filas: FilaDeInsumo[] }) {
  const r = resumirInsumos(filas)
  return (
    <div className="resumen">
      <div>
        <strong>{r.cantidad}</strong>
        <span>insumos</span>
      </div>
      <div>
        <strong>{r.sinCosto}</strong>
        <span>sin costo cargado</span>
      </div>
    </div>
  )
}

/** Lo propio del reporte, sobre la base de `HojaImpresa`. */
const ESTILOS = `
  th { padding: 3pt 6pt; }
  td { padding: 4pt 6pt; border-bottom: 1px solid #e3e8ee; }
  .falta { color: #888; font-style: italic; }
  .equivalente { display: block; font-size: 7.5pt; color: #777; }
  .perdida { font-weight: 700; }
  .resumen { margin-top: 10pt; padding-top: 6pt; border-top: 2px solid #333; }
`
