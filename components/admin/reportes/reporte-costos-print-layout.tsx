'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'
import type {
  SeccionDeCostos,
  ResumenDeCostos,
  FilaDeProducto,
  FilaDeInsumo,
} from '@/app/actions/reporte-costos'

interface Props {
  secciones: SeccionDeCostos[]
  resumen: ResumenDeCostos
  fecha: string
}

const TITULO: Record<SeccionDeCostos['grupo'], string> = {
  elaborado: 'Elaborados',
  combo: 'Combos',
  reventa: 'Reventa',
  insumo: 'Insumos',
}

const UNIDAD: Record<string, string> = {
  kg: 'kg', g: 'g', litro: 'l', ml: 'ml', unidad: 'u',
}

/** Pesos sin decimales de mas: $9.000 se lee, $9.000,00 no agrega nada. */
function pesos(n: number): string {
  return '$ ' + n.toLocaleString('es-AR', { maximumFractionDigits: n < 100 ? 2 : 0 })
}

/**
 * El reporte de costos, para imprimir.
 *
 * Pedido por el cliente para sentarse a revisar precios. Mismo patron que la
 * planilla de conteo: A4, la barra de arriba no sale impresa.
 *
 * Lo que no tiene costo dice `sin costo` y no queda en blanco: un renglon
 * vacio se lee como "no aplica", y esto es "falta cargarlo".
 */
export function ReporteCostosPrintLayout({ secciones, resumen, fecha }: Props) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [])

  const renglones = secciones.reduce(
    (s, sec) => s + sec.categorias.reduce((c, cat) => c + cat.filas.length, 0),
    0
  )

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

        .seccion { margin-bottom: 14pt; }
        .seccion-titulo {
          font-size: 11pt; font-weight: 700; text-transform: uppercase;
          letter-spacing: .6pt; border-bottom: 1.5px solid #333;
          padding-bottom: 3pt; margin-bottom: 6pt;
        }

        .grupo { margin-bottom: 9pt; }
        .grupo-nombre {
          font-size: 9pt; font-weight: 700; background: #eef2f7;
          padding: 3pt 6pt; border-left: 3px solid #333;
        }

        table { width: 100%; border-collapse: collapse; }
        th {
          font-size: 7.5pt; text-transform: uppercase; letter-spacing: .4pt;
          color: #555; text-align: left; padding: 3pt 6pt;
          border-bottom: 1px solid #999;
        }
        td { padding: 4pt 6pt; border-bottom: 1px solid #e3e8ee; font-size: 9.5pt; }
        .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .col-num { width: 24mm; }
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
          .grupo-nombre { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr { page-break-inside: avoid; }
          .grupo { page-break-inside: avoid; }
        }
      `}</style>

      <div className="screen-bar">
        <span>
          Vista previa — Reporte de costos: <strong>{renglones}</strong>{' '}
          {renglones === 1 ? 'renglón' : 'renglones'}
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
            <div className="doc-meta">Impreso el {fecha}</div>
          </div>
        </div>

        {secciones.length === 0 && (
          <p style={{ color: '#777' }}>No hay nada activo en los grupos elegidos.</p>
        )}

        {secciones.map((sec) => (
          <div className="seccion" key={sec.grupo}>
            <div className="seccion-titulo">{TITULO[sec.grupo]}</div>

            {sec.grupo === 'insumo'
              ? sec.categorias.map((cat) => (
                  <div className="grupo" key={cat.nombre}>
                    <div className="grupo-nombre">{cat.nombre}</div>
                    <TablaDeInsumos filas={cat.filas} />
                  </div>
                ))
              : sec.categorias.map((cat) => (
                  <div className="grupo" key={cat.nombre}>
                    <div className="grupo-nombre">{cat.nombre}</div>
                    <TablaDeProductos filas={cat.filas} />
                  </div>
                ))}
          </div>
        ))}

        <div className="resumen">
          {resumen.productos > 0 && (
            <>
              <div>
                <strong>{resumen.productos}</strong>
                <span>productos</span>
              </div>
              <div>
                <strong>{resumen.productosSinCosto}</strong>
                <span>sin costo cargado</span>
              </div>
              <div>
                <strong>
                  {resumen.margenPromedio === null ? '—' : `${resumen.margenPromedio.toLocaleString('es-AR')} %`}
                </strong>
                <span>margen promedio</span>
              </div>
            </>
          )}
          {resumen.insumos > 0 && (
            <>
              <div>
                <strong>{resumen.insumos}</strong>
                <span>insumos</span>
              </div>
              <div>
                <strong>{resumen.insumosSinCosto}</strong>
                <span>insumos sin costo</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function TablaDeProductos({ filas }: { filas: FilaDeProducto[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th className="num col-num">Costo</th>
          <th className="num col-num">Precio</th>
          <th className="num col-num">Margen</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.id}>
            <td>{f.nombre}</td>
            <td className="num">
              {f.costo === null ? <span className="falta">sin costo</span> : pesos(f.costo)}
            </td>
            <td className="num">{pesos(f.precio)}</td>
            {/* Un margen negativo es el unico que se marca: se vende a perdida. */}
            <td className={`num ${f.margen !== null && f.margen < 0 ? 'perdida' : ''}`}>
              {f.margen === null ? '—' : `${f.margen.toLocaleString('es-AR')} %`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TablaDeInsumos({ filas }: { filas: FilaDeInsumo[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Insumo</th>
          {/* Sin columna de unidad: el costo ya dice "/ kg", y repetirla al
              lado era decir lo mismo dos veces en cada renglon. */}
          <th className="num col-num">Costo</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.id}>
            <td>{f.nombre}</td>
            <td className="num">
              {f.costo === null ? (
                <span className="falta">sin costo</span>
              ) : (
                <>
                  {pesos(f.costo)} / {UNIDAD[f.unidad] ?? f.unidad}
                  {f.equivalente && (
                    <span className="equivalente">
                      = {pesos(f.equivalente.valor)} / {UNIDAD[f.equivalente.unidad] ?? f.equivalente.unidad}
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
