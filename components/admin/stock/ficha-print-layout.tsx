'use client'

import { formatPrice } from '@/lib/utils'
import { HojaImpresa, FilaParaEscribir } from '@/components/admin/hojas/hoja-impresa'
import { cantidadLegible } from '@/lib/utils/cantidad'
import type { ProductionSheetResult, ProductionSheetIngredient, ProductionSheetShoppingItem } from '@/lib/types/stock'

interface FichaPrintLayoutProps {
  sheet: ProductionSheetResult
  quantity: number
  /** Calculada en el servidor, en hora de Argentina (leccion 44). */
  fecha: string
}

/**
 * La ficha técnica de producción en papel: qué juntar y cuánto para una
 * cantidad, con su stock y su costo (spec seguimiento-de-stock).
 *
 * Era de marzo y hablaba otro idioma que la planilla de conteo y el reporte de
 * costos: encabezados negros, un recuadro "LOGO" vacío, centavos, y el
 * desglose y la lista de compras con las mismas filas. David: "que se parezca
 * a las otras planillas". Ahora usa su armazón (`HojaImpresa`) y trae solo lo
 * que se usa en la cocina.
 */
export function FichaPrintLayout({ sheet, quantity, fecha }: FichaPrintLayoutProps) {
  const unidades = `${quantity} ${quantity === 1 ? 'unidad' : 'unidades'}`

  // Una preparación previa es un ingrediente que se hace con otros. Sin
  // ninguna, el desglose y la lista para juntar traen las mismas filas: se
  // imprime una sola tabla (decisión con David, 2026-09-28).
  const hayPrevias = sheet.recipes.some((r) => r.ingredients.some((i) => (i.children?.length ?? 0) > 0))

  const costoDe = (i: ProductionSheetShoppingItem) => i.gross_qty_per_unit * quantity * i.cost_per_unit
  const costoLote = sheet.shopping_list.reduce((s, i) => s + costoDe(i), 0)
  const hayFaltante = sheet.shopping_list.some(
    (i) => i.stock_tracking_enabled && i.current_stock < i.gross_qty_per_unit * quantity
  )

  return (
    <HojaImpresa
      barra={<>Vista previa — Ficha técnica: <strong>{sheet.product_name}</strong> ({unidades})</>}
      titulo="Ficha técnica"
      meta={<>{sheet.product_name} · {unidades} · Impresa el {fecha}</>}
      estilos={ESTILOS}
    >
      <FilaParaEscribir campos={['Preparó', 'Fecha', 'Observaciones']} />

      {/* Lo que dice el lote, en una linea. "Receta base: 1" y "Factor ×10"
          repetian la cantidad; se fueron. */}
      <div className="resumen totales">
        <div><strong>{quantity}</strong><span>{quantity === 1 ? 'unidad' : 'unidades'}</span></div>
        <div><strong>{formatPrice(Math.round(costoLote))}</strong><span>costo del lote</span></div>
        <div><strong>{formatPrice(Math.round(costoLote / quantity))}</strong><span>por unidad</span></div>
      </div>

      {hayPrevias && sheet.recipes.map((receta) => (
        <div className="grupo" key={receta.recipe_id}>
          <div className="grupo-nombre">
            {receta.recipe_name}
            <span className="grupo-origen">
              {receta.multiplier !== 1 ? `×${receta.multiplier} · ` : ''}desglose
            </span>
          </div>
          <table>
            <thead>
              <tr>
                <th className="col-tilde" />
                <th>Ingrediente</th>
                <th className="num col-cant">Cantidad</th>
                <th className="num col-cant">Con merma</th>
              </tr>
            </thead>
            <tbody>
              {receta.ingredients.map((ing) => (
                <FilaDesglose key={ing.ingredient_id} ing={ing} nivel={0} quantity={quantity} />
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="grupo">
        <div className="grupo-nombre">
          {hayPrevias ? 'Para juntar' : 'Ingredientes'}
          <span className="grupo-origen">{sheet.shopping_list.length}</span>
        </div>
        <ListaParaJuntar items={sheet.shopping_list} quantity={quantity} costoDe={costoDe} />
      </div>

      <div className="nota-pie">
        <span>
          {hayFaltante ? '"Falta": el stock no alcanza para el lote.' : 'Se tilda cada ingrediente al juntarlo.'}
        </span>
        <span>{sheet.shopping_list.length} {sheet.shopping_list.length === 1 ? 'ingrediente' : 'ingredientes'}</span>
      </div>
    </HojaImpresa>
  )
}

/** El casillero para tildar, de lapicera. */
function Casillero() {
  return <span className="casillero" data-casillero />
}

function ListaParaJuntar({
  items,
  quantity,
  costoDe,
}: {
  items: ProductionSheetShoppingItem[]
  quantity: number
  costoDe: (i: ProductionSheetShoppingItem) => number
}) {
  // La columna de merma solo si alguno la tiene: si no, es una columna de guiones.
  const conMerma = items.some((i) => i.gross_qty_per_unit - i.net_qty_per_unit > 1e-5)

  return (
    <table>
      <thead>
        <tr>
          <th className="col-tilde" />
          <th>Ingrediente</th>
          <th className="num col-cant">Cantidad</th>
          {conMerma && <th className="num col-cant">Con merma</th>}
          <th className="num col-stock">Stock</th>
          <th className="num col-costo">Costo</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const neta = item.net_qty_per_unit * quantity
          const bruta = item.gross_qty_per_unit * quantity
          const falta = item.stock_tracking_enabled && item.current_stock < bruta
          return (
            <tr key={item.ingredient_id}>
              <td className="col-tilde"><Casillero /></td>
              <td>{item.name}</td>
              <td className="num">{cantidadLegible(neta, item.unit)}</td>
              {conMerma && (
                <td className="num">{bruta - neta > 1e-5 ? cantidadLegible(bruta, item.unit) : <span className="suave">—</span>}</td>
              )}
              <td className="num">
                {item.stock_tracking_enabled ? (
                  <>
                    {/* Negrita y no rojo: en blanco y negro el rojo no se ve. */}
                    <span className={falta ? 'falta' : 'suave'}>{cantidadLegible(item.current_stock, item.unit)}</span>
                    {falta && <span className="falta"> · falta</span>}
                  </>
                ) : (
                  <span className="suave">—</span>
                )}
              </td>
              <td className="num">{formatPrice(Math.round(costoDe(item)))}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function FilaDesglose({ ing, nivel, quantity }: { ing: ProductionSheetIngredient; nivel: number; quantity: number }) {
  const neta = ing.net_qty_per_unit * quantity
  const bruta = ing.gross_qty_per_unit * quantity
  const hijos = ing.children ?? []
  const esPrevia = hijos.length > 0

  return (
    <>
      <tr>
        {/* Se tilda lo que se junta: una preparación previa se tilda por sus insumos. */}
        <td className="col-tilde">{!esPrevia && <Casillero />}</td>
        <td style={{ paddingLeft: `${6 + nivel * 14}pt` }}>
          {nivel > 0 && <span className="suave">↳ </span>}
          <span style={{ fontWeight: esPrevia ? 600 : 400 }}>{ing.name}</span>
          {esPrevia && <span className="suave"> · preparación previa</span>}
        </td>
        <td className="num">{cantidadLegible(neta, ing.unit)}</td>
        <td className="num">
          {bruta - neta > 1e-5 ? (
            <>
              {cantidadLegible(bruta, ing.unit)}
              <span className="suave"> ({ing.waste_pct}%)</span>
            </>
          ) : (
            <span className="suave">—</span>
          )}
        </td>
      </tr>
      {hijos.map((hijo) => (
        <FilaDesglose key={hijo.ingredient_id} ing={hijo} nivel={nivel + 1} quantity={quantity} />
      ))}
    </>
  )
}

/** Lo propio de la ficha, sobre la base de `HojaImpresa`. */
const ESTILOS = `
  .hdr { margin-bottom: 4pt; }
  th { padding: 4pt 6pt; }
  td { padding: 5pt 6pt; border-bottom: 1px solid #d6dde5; }

  .totales { margin: 0 0 11pt; }

  .col-tilde { width: 7mm; }
  .col-cant { width: 24mm; }
  .col-stock { width: 28mm; }
  .col-costo { width: 22mm; }
  .casillero {
    display: inline-block; width: 3.5mm; height: 3.5mm;
    border: 1px solid #555; border-radius: 1px; vertical-align: middle;
  }
  .falta { font-weight: 700; }

  @media print {
    .grupo { page-break-inside: avoid; }
  }
`
