'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'
import type { GrupoDePlanilla } from '@/app/actions/stock'

interface PlanillaConteoPrintLayoutProps {
  grupos: GrupoDePlanilla[]
  fecha: string
}

/**
 * La planilla para contar el freezer.
 *
 * Vale, del local: "¿Podés imprimir unas plantillas del stock que hay en el
 * sistema? Para tener en papel físico y controlar en el freezer una vez por
 * semana".
 *
 * Tres columnas y no una: lo que dice el sistema, lo contado, y la diferencia.
 * Se evaluó el conteo ciego —solo el nombre y una línea vacía, para que quien
 * cuenta cuente en vez de confirmar el número que ya ve— y se eligió mostrarlo,
 * que es lo que se pidió. Pedir la diferencia escrita compensa en parte: obliga
 * a mirar las dos cifras en vez de tildar.
 *
 * Mismo patrón que la ficha técnica: A4, la barra de arriba no sale impresa.
 */
export function PlanillaConteoPrintLayout({ grupos, fecha }: PlanillaConteoPrintLayoutProps) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [])

  const totalLineas = grupos.reduce((s, g) => s + g.lineas.length, 0)

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
               border-bottom: 2px solid #333; padding-bottom: 7pt; margin-bottom: 4pt; }
        .hdr-brand { font-size: 15pt; font-weight: 700; letter-spacing: .2pt; }
        .hdr-sub { font-size: 8pt; color: #666; }
        .doc-title { font-size: 12pt; font-weight: 700; text-align: right; }
        .doc-meta { font-size: 8pt; color: #666; text-align: right; margin-top: 2pt; }

        /* Quien conto y cuando. Sin esto, dos hojas de semanas distintas son
           indistinguibles una vez que estan sobre el mostrador. */
        .quien { display: flex; gap: 22px; margin: 9pt 0 11pt; }
        .quien-campo { flex: 1; }
        .quien-label { font-size: 7.5pt; color: #777; margin-bottom: 2pt; }
        .quien-linea { border-bottom: 1px solid #555; height: 15pt; }

        .grupo { margin-bottom: 11pt; }
        .grupo-nombre {
          font-size: 9.5pt; font-weight: 700; text-transform: uppercase;
          letter-spacing: .5pt; background: #eef2f7; padding: 4pt 6pt;
          border-left: 3px solid #333;
        }

        table { width: 100%; border-collapse: collapse; }
        th {
          font-size: 7.5pt; text-transform: uppercase; letter-spacing: .4pt;
          color: #555; text-align: left; padding: 4pt 6pt;
          border-bottom: 1px solid #999;
        }
        td { padding: 0; border-bottom: 1px solid #d6dde5; font-size: 9.5pt; }
        .celda { padding: 6pt; }

        .col-unidad { width: 13mm; color: #666; font-size: 8.5pt; }
        .col-sistema { width: 22mm; text-align: right; font-variant-numeric: tabular-nums; }
        /* Anchas a proposito: se escriben a mano, parado frente al freezer. */
        .col-escribir { width: 26mm; background: #fafbfc; }

        .sin-seguimiento { color: #888; }
        .nota-pie { margin-top: 10pt; padding-top: 5pt; border-top: 1px solid #ccc;
                    font-size: 7.5pt; color: #777; display: flex; justify-content: space-between; }

        @page { size: A4 portrait; margin: 15mm 18mm 18mm 18mm; }
        @media print {
          html, body { background: #fff !important; }
          .screen-bar { display: none !important; }
          .a4-page { margin: 0; padding: 0; box-shadow: none; width: 100%; min-height: unset; }
          .grupo-nombre { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .col-escribir { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr { page-break-inside: avoid; }
          /* Un grupo no se parte entre paginas si entra entero: contar una
             categoria mirando dos hojas es como se pierde la cuenta. */
          .grupo { page-break-inside: avoid; }
        }
      `}</style>

      <div className="screen-bar">
        <span>
          Vista previa — Planilla de conteo:{' '}
          <strong>{totalLineas} {totalLineas === 1 ? 'insumo' : 'insumos'}</strong>
          {grupos.length > 1 ? ` en ${grupos.length} categorías` : ''}
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
            <div className="doc-title">Planilla de conteo de stock</div>
            <div className="doc-meta">Impresa el {fecha}</div>
          </div>
        </div>

        <div className="quien">
          <div className="quien-campo">
            <div className="quien-label">Contó</div>
            <div className="quien-linea" />
          </div>
          <div className="quien-campo">
            <div className="quien-label">Fecha del conteo</div>
            <div className="quien-linea" />
          </div>
          <div className="quien-campo">
            <div className="quien-label">Observaciones</div>
            <div className="quien-linea" />
          </div>
        </div>

        {grupos.length === 0 ? (
          <p style={{ color: '#777', fontSize: '9.5pt' }}>
            No hay insumos en las categorías elegidas.
          </p>
        ) : (
          grupos.map((grupo) => (
            <div className="grupo" key={grupo.categoria}>
              <div className="grupo-nombre">
                {grupo.categoria} · {grupo.lineas.length}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th className="col-unidad">Un.</th>
                    <th className="col-sistema">Sistema</th>
                    <th className="col-escribir">Contado</th>
                    <th className="col-escribir">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.lineas.map((linea) => (
                    <tr key={linea.id}>
                      <td className="celda">
                        {linea.nombre}
                        {!linea.sigue && (
                          <span className="sin-seguimiento"> · sin seguimiento</span>
                        )}
                      </td>
                      <td className="celda col-unidad">{linea.unidad}</td>
                      <td className="celda col-sistema">
                        {linea.sigue ? formatCantidad(linea.stockDelSistema) : '—'}
                      </td>
                      <td className="col-escribir" />
                      <td className="col-escribir" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}

        <div className="nota-pie">
          <span>
            Las diferencias se corrigen desde Stock, con el ajuste de cada insumo.
          </span>
          <span>{totalLineas} {totalLineas === 1 ? 'insumo' : 'insumos'}</span>
        </div>
      </div>
    </>
  )
}

/** Sin decimales de más: 2,5 kg se lee, 2,5000000001 no. */
function formatCantidad(n: number): string {
  return (Math.round(n * 1000) / 1000).toLocaleString('es-AR', { maximumFractionDigits: 3 })
}
