'use client'

import type { GrupoDePlanilla } from '@/app/actions/stock'
import { HojaImpresa, FilaParaEscribir } from '@/components/admin/hojas/hoja-impresa'

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
 * Lista insumos y productos de reventa juntos: frente a la heladera lo que se
 * cuenta es la botella, y que el sistema la llame insumo o producto es una
 * distinción suya. Solo lo que tiene seguimiento, porque de lo demás no hay
 * número contra el cual comparar.
 *
 * Tres columnas y no una: lo que dice el sistema, lo contado, y la diferencia.
 * Se evaluó el conteo ciego —solo el nombre y una línea vacía, para que quien
 * cuenta cuente en vez de confirmar el número que ya ve— y se eligió mostrarlo,
 * que es lo que se pidió. Pedir la diferencia escrita compensa en parte: obliga
 * a mirar las dos cifras en vez de tildar.
 *
 * El armazón —barra, página, encabezado— es el de todas las hojas A4:
 * `HojaImpresa`.
 */
export function PlanillaConteoPrintLayout({ grupos, fecha }: PlanillaConteoPrintLayoutProps) {
  const totalLineas = grupos.reduce((s, g) => s + g.lineas.length, 0)

  return (
    <HojaImpresa
      barra={
        <>
          Vista previa — Planilla de conteo:{' '}
          <strong>{totalLineas} {totalLineas === 1 ? 'ítem' : 'ítems'}</strong>
          {grupos.length > 1 ? ` en ${grupos.length} categorías` : ''}
        </>
      }
      titulo="Planilla de conteo de stock"
      meta={<>Impresa el {fecha}</>}
      estilos={ESTILOS}
    >
      <FilaParaEscribir campos={['Contó', 'Fecha del conteo', 'Observaciones']} />

      {grupos.length === 0 ? (
        <p style={{ color: '#777', fontSize: '9.5pt' }}>
          No hay nada con seguimiento en las categorías elegidas.
        </p>
      ) : (
        grupos.map((grupo) => (
          <div className="grupo" key={grupo.categoria}>
            <div className="grupo-nombre">
              {grupo.categoria}
              {/* Un insumo y un producto de reventa pueden compartir el
                  nombre de categoria --BEBIDAS esta en las dos tablas-- y se
                  cuentan en lugares distintos. El titulo lo aclara. */}
              <span className="grupo-origen">
                {grupo.esReventa ? 'reventa' : 'insumo'} · {grupo.lineas.length}
              </span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Qué se cuenta</th>
                  <th className="col-unidad">Un.</th>
                  <th className="col-sistema">Sistema</th>
                  <th className="col-escribir">Contado</th>
                  <th className="col-escribir">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {grupo.lineas.map((linea) => (
                  <tr key={linea.id}>
                    <td className="celda">{linea.nombre}</td>
                    <td className="celda col-unidad">{linea.unidad}</td>
                    <td className="celda col-sistema">
                      {formatCantidad(linea.stockDelSistema)}
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
          Las diferencias se corrigen desde Stock, con el ajuste de cada ítem.
        </span>
        <span>{totalLineas} {totalLineas === 1 ? 'ítem' : 'ítems'}</span>
      </div>
    </HojaImpresa>
  )
}

/** Lo propio de la planilla, sobre la base de `HojaImpresa`. */
const ESTILOS = `
  /* Debajo del encabezado va la fila para escribir, que trae su propio aire. */
  .hdr { margin-bottom: 4pt; }
  th { padding: 4pt 6pt; }
  td { padding: 0; border-bottom: 1px solid #d6dde5; }
  .celda { padding: 6pt; }

  .col-unidad { width: 13mm; color: #666; font-size: 8.5pt; }
  .col-sistema { width: 22mm; text-align: right; font-variant-numeric: tabular-nums; }
  /* Anchas a proposito: se escriben a mano, parado frente al freezer. */
  .col-escribir { width: 26mm; background: #fafbfc; }

  @media print {
    .col-escribir { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    /* Un grupo no se parte entre paginas si entra entero: contar una
       categoria mirando dos hojas es como se pierde la cuenta. */
    .grupo { page-break-inside: avoid; }
  }
`

/** Sin decimales de más: 2,5 kg se lee, 2,5000000001 no. */
function formatCantidad(n: number): string {
  return (Math.round(n * 1000) / 1000).toLocaleString('es-AR', { maximumFractionDigits: 3 })
}
