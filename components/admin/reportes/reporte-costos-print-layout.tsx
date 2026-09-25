'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'
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
 * Mismo patron que la planilla de conteo: A4, la barra de arriba no sale
 * impresa.
 */
export function ReporteCostosPrintLayout({ vista, descripcion, productos, insumos, fecha }: Props) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [])

  const esProductos = vista.pestana === 'productos'
  const conCategoria = vista.categoria === null
  const renglones = esProductos ? productos.length : insumos.length

  return (
    <>
      <style>{`
        body { background: #f1f5f9; margin: 0; }

        .screen-bar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 10px 16px; background: #1e293b; color: #e2e8f0;
          font: 13px/1.4 system-ui, sans-serif; position: sticky; top: 0; z-index: 10;
        }
        .screen-bar button {
          display: inline-flex; align-items: center; gap: 6px;
          background: #f5c518; color: #111; border: 0; border-radius: 6px;
          padding: 7px 14px; font-weight: 600; cursor: pointer;
        }

        .a4-page {
          width: 210mm; min-height: 297mm; margin: 16px auto; padding: 15mm 18mm;
          background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.14);
          font: 10pt/1.35 system-ui, sans-serif; color: #111;
        }

        .hdr { display: flex; justify-content: space-between; align-items: flex-end;
               border-bottom: 2px solid #333; padding-bottom: 7pt; margin-bottom: 12pt; }
        .hdr-brand { font-size: 15pt; font-weight: 700; }
        .hdr-sub { font-size: 8pt; color: #666; }
        .doc-title { font-size: 12pt; font-weight: 700; text-align: right; }
        .doc-meta { font-size: 8pt; color: #666; text-align: right; margin-top: 2pt; }

        table { width: 100%; border-collapse: collapse; }
        th {
          font-size: 7.5pt; text-transform: uppercase; letter-spacing: .4pt;
          color: #555; text-align: left; padding: 3pt 6pt;
          border-bottom: 1px solid #999;
        }
        td { padding: 4pt 6pt; border-bottom: 1px solid #e3e8ee; font-size: 9.5pt; }
        .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .suave { color: #666; }
        .falta { color: #888; font-style: italic; }
        .equivalente { display: block; font-size: 7.5pt; color: #777; }
        .perdida { font-weight: 700; }

        .resumen {
          margin-top: 10pt; padding-top: 6pt; border-top: 2px solid #333;
          display: flex; gap: 22pt; font-size: 9pt;
        }
        .resumen strong { font-size: 11pt; display: block; }
        .resumen span { color: #666; font-size: 7.5pt; }

        @page { size: A4 portrait; margin: 15mm 18mm 18mm 18mm; }
        @media print {
          html, body { background: #fff !important; }
          .screen-bar { display: none !important; }
          .a4-page { margin: 0; padding: 0; box-shadow: none; width: 100%; min-height: unset; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      <div className="screen-bar">
        <span>
          Vista previa — {descripcion}: <strong>{renglones}</strong> {renglones === 1 ? 'renglón' : 'renglones'}
        </span>
        <button onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir
        </button>
      </div>

      <div className="a4-page">
        <div className="hdr">
          <div>
            <div className="hdr-brand">Que Copado</div>
            <div className="hdr-sub">Hamburguesería</div>
          </div>
          <div>
            <div className="doc-title">Reporte de costos</div>
            <div className="doc-meta">
              {descripcion} · Impreso el {fecha}
            </div>
          </div>
        </div>

        {renglones === 0 ? (
          <p className="suave">No hay nada con este filtro.</p>
        ) : esProductos ? (
          <TablaDeProductos filas={productos} conCategoria={conCategoria} />
        ) : (
          <TablaDeInsumos filas={insumos} conCategoria={conCategoria} />
        )}

        {esProductos ? <ResumenDeProductos filas={productos} /> : <ResumenDeInsumos filas={insumos} />}
      </div>
    </>
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
