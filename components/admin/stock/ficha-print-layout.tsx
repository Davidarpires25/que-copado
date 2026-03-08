'use client'

import { useEffect } from 'react'
import { formatPrice } from '@/lib/utils'
import type { ProductionSheetResult, ProductionSheetIngredient, ProductionSheetShoppingItem } from '@/lib/types/stock'

interface FichaPrintLayoutProps {
  sheet: ProductionSheetResult
  quantity: number
  showCosts: boolean
}

// ---------------------------------------------------------------------------
// Smart unit formatter: 0.250 kg → "250 g", 0.5 litro → "500 ml"
// ---------------------------------------------------------------------------
function readableQty(qty: number, unit: string): string {
  if (qty === 0) return `0 ${unit === 'unidad' ? 'u' : unit === 'litro' ? 'L' : unit}`

  if (unit === 'kg') {
    if (qty < 1) return `${Math.round(qty * 1000)} g`
    const r = Math.round(qty * 1000) / 1000
    return `${r % 1 === 0 ? r.toFixed(0) : r.toFixed(r < 10 ? 3 : 2)} kg`
  }
  if (unit === 'litro') {
    if (qty < 1) return `${Math.round(qty * 1000)} ml`
    const r = Math.round(qty * 1000) / 1000
    return `${r % 1 === 0 ? r.toFixed(0) : r.toFixed(r < 10 ? 3 : 2)} L`
  }
  if (unit === 'unidad') {
    const r = Math.round(qty * 100) / 100
    return `${r % 1 === 0 ? r.toFixed(0) : r.toFixed(2)} u`
  }
  return `${qty.toFixed(3)} ${unit}`
}

// ---------------------------------------------------------------------------
// Recursive ingredient rows for desglose table
// ---------------------------------------------------------------------------
function IngPrintRow({
  ing,
  depth,
  quantity,
}: {
  ing: ProductionSheetIngredient
  depth: number
  quantity: number
}) {
  const net = ing.net_qty_per_unit * quantity
  const gross = ing.gross_qty_per_unit * quantity
  const hasChildren = (ing.children?.length ?? 0) > 0
  const wasteDiff = gross - net

  const rowBg = depth === 0 ? '#fff' : depth === 1 ? '#f4f4f4' : '#eaeaea'
  const indentLeft = depth * 20 + 10

  return (
    <>
      <tr style={{ background: rowBg, borderBottom: '1px solid #ddd' }}>
        <td style={{ textAlign: 'center', padding: '5px 6px', width: 28 }}>
          {!hasChildren && (
            <span style={{
              display: 'inline-block', width: 13, height: 13,
              border: '1.5px solid #666', borderRadius: 2, verticalAlign: 'middle',
            }} />
          )}
        </td>
        <td style={{ padding: `5px 8px 5px ${indentLeft}px` }}>
          {depth > 0 && (
            <span style={{ color: '#aaa', marginRight: 5, fontSize: 10 }}>{'↳'.repeat(depth)}</span>
          )}
          <span style={{ fontWeight: depth === 0 ? 600 : 400 }}>{ing.name}</span>
          {hasChildren && (
            <span style={{ fontSize: 8, color: '#888', marginLeft: 6, fontStyle: 'italic' }}>
              preparación previa
            </span>
          )}
        </td>
        <td style={{ textAlign: 'right', padding: '5px 8px', whiteSpace: 'nowrap' }}>
          {readableQty(net, ing.unit)}
        </td>
        <td style={{ textAlign: 'right', padding: '5px 8px', whiteSpace: 'nowrap', fontWeight: wasteDiff > 0.00001 ? 700 : 400 }}>
          {wasteDiff > 0.00001 ? readableQty(gross, ing.unit) : '—'}
        </td>
        <td style={{ textAlign: 'right', padding: '5px 8px', whiteSpace: 'nowrap', color: wasteDiff > 0.00001 ? '#8b6600' : '#bbb', fontSize: 8.5 }}>
          {wasteDiff > 0.00001
            ? `${readableQty(wasteDiff, ing.unit)} (${ing.waste_pct}%)`
            : '—'}
        </td>
      </tr>
      {hasChildren && ing.children!.map((child) => (
        <IngPrintRow key={child.ingredient_id} ing={child} depth={depth + 1} quantity={quantity} />
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Shopping list row
// ---------------------------------------------------------------------------
function ShoppingPrintRow({
  item,
  quantity,
  showCosts,
}: {
  item: ProductionSheetShoppingItem
  quantity: number
  showCosts: boolean
}) {
  const net = item.net_qty_per_unit * quantity
  const gross = item.gross_qty_per_unit * quantity
  const cost = gross * item.cost_per_unit
  const isShort = item.stock_tracking_enabled && item.current_stock < gross
  const rowBg = isShort ? '#fff5f5' : '#fff'

  return (
    <tr style={{ background: rowBg, borderBottom: '1px solid #ddd' }}>
      <td style={{ textAlign: 'center', padding: '5px 6px', width: 28 }}>
        <span style={{
          display: 'inline-block', width: 13, height: 13,
          border: '1.5px solid #666', borderRadius: 2, verticalAlign: 'middle',
        }} />
      </td>
      <td style={{ padding: '5px 10px', fontWeight: 500, color: isShort ? '#c00' : '#000' }}>
        {item.name}{isShort && ' ⚠'}
      </td>
      <td style={{ textAlign: 'right', padding: '5px 8px', whiteSpace: 'nowrap', color: '#555' }}>
        {readableQty(net, item.unit)}
      </td>
      <td style={{ textAlign: 'right', padding: '5px 8px', whiteSpace: 'nowrap', fontWeight: Math.abs(gross - net) > 0.00001 ? 700 : 400 }}>
        {Math.abs(gross - net) > 0.00001 ? readableQty(gross, item.unit) : '—'}
      </td>
      {showCosts && (
        <td style={{ textAlign: 'right', padding: '5px 8px', whiteSpace: 'nowrap', fontSize: 9, color: isShort ? '#c00' : '#555' }}>
          {item.stock_tracking_enabled
            ? `${readableQty(item.current_stock, item.unit)}${isShort ? ' ✗' : ' ✓'}`
            : 'Sin tracking'}
        </td>
      )}
      {showCosts && (
        <td style={{ textAlign: 'right', padding: '5px 8px', whiteSpace: 'nowrap', fontWeight: 500 }}>
          {formatPrice(cost)}
        </td>
      )}
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main layout
// ---------------------------------------------------------------------------
export function FichaPrintLayout({ sheet, quantity, showCosts }: FichaPrintLayoutProps) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const version = today.toISOString().slice(0, 10).replace(/-/g, '')

  const totalCost = sheet.shopping_list.reduce(
    (acc, i) => acc + i.gross_qty_per_unit * quantity * i.cost_per_unit,
    0
  )

  const shoppingColSpanLeft = showCosts ? 4 : 3

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #e5e7eb; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; }

        .screen-bar {
          background: #1a1d24; color: #f0f2f5; text-align: center;
          padding: 10px 16px; font-size: 13px; display: flex;
          align-items: center; justify-content: center; gap: 10px;
        }
        .screen-bar button {
          background: #FEC501; color: #000; border: none; border-radius: 4px;
          padding: 5px 14px; font-size: 12px; font-weight: 700; cursor: pointer;
        }

        .a4-page {
          background: #fff; width: 210mm; min-height: 297mm;
          margin: 16px auto; padding: 15mm 18mm;
          box-shadow: 0 4px 24px rgba(0,0,0,0.18);
        }

        /* ---------- HEADER ---------- */
        .hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8mm; }
        .hdr-left { display: flex; gap: 10px; align-items: center; }
        .logo-box {
          width: 52px; height: 52px; border: 1.5px solid #bbb; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          font-size: 7pt; color: #bbb; text-align: center; line-height: 1.3; flex-shrink: 0;
        }
        .hdr-brand-name { font-size: 13pt; font-weight: 800; letter-spacing: 0.02em; }
        .hdr-brand-sub  { font-size: 8pt; color: #777; margin-top: 1px; }
        .hdr-right { text-align: right; }
        .doc-title { font-size: 12pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
        .doc-meta  { font-size: 8pt; color: #666; margin-top: 3px; }

        /* ---------- PRODUCT BLOCK ---------- */
        .rule-thick { border: none; border-top: 2.5px solid #111; margin: 5pt 0; }
        .rule-thin  { border: none; border-top: 0.75px solid #ccc; margin: 4pt 0; }
        .product-name { font-size: 20pt; font-weight: 900; letter-spacing: -0.01em; line-height: 1.15; padding: 3pt 0; }

        /* ---------- SIM BOX ---------- */
        .sim-box {
          border: 1.5px solid #222; border-radius: 5px;
          padding: 8pt 12pt; display: flex; gap: 0; flex-wrap: wrap;
          margin: 6pt 0;
        }
        .sim-item { flex: 1; min-width: 100px; padding: 0 12pt 0 0; border-right: 1px solid #ddd; margin-right: 12pt; }
        .sim-item:last-child { border-right: none; margin-right: 0; padding-right: 0; }
        .sim-label { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.07em; color: #888; margin-bottom: 2px; }
        .sim-value { font-size: 14pt; font-weight: 800; }
        .sim-accent { color: #8b6600; }

        /* ---------- SECTION TITLE ---------- */
        .sec-title {
          font-size: 8.5pt; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.09em; color: #111;
          border-bottom: 1.75px solid #111; padding-bottom: 2pt;
          margin: 10pt 0 5pt;
        }

        /* ---------- TABLES ---------- */
        .ft-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        .ft-table thead tr { background: #222; color: #fff; }
        .ft-table thead th {
          padding: 6px 8px; text-align: left; font-weight: 700;
          font-size: 8pt; letter-spacing: 0.04em;
        }
        .ft-table thead th.r { text-align: right; }
        .ft-table tbody td { vertical-align: middle; }
        .ft-table tfoot td {
          padding: 6px 8px; font-size: 9pt; font-weight: 700;
          background: #f0f0f0; border-top: 1.5px solid #999;
        }
        .ft-table tfoot td.r { text-align: right; }

        /* ---------- NOTES ---------- */
        .note-line { border-bottom: 1px solid #ccc; height: 17pt; }

        /* ---------- FOOTER ---------- */
        .ft-footer { margin-top: 10mm; border-top: 1.5px solid #333; padding-top: 5pt; }
        .sig-row { display: flex; gap: 20px; margin-bottom: 6pt; align-items: flex-end; }
        .sig-block { flex: 1; }
        .sig-label { font-size: 7.5pt; color: #777; margin-bottom: 3pt; }
        .sig-line { border-bottom: 1px solid #444; height: 14pt; }
        .footer-bottom { display: flex; justify-content: space-between; font-size: 7.5pt; color: #777; margin-top: 4pt; }

        /* ---------- PRINT ---------- */
        @page {
          size: A4 portrait;
          margin: 15mm 18mm 18mm 18mm;
        }
        @media print {
          html, body { background: #fff !important; }
          .screen-bar { display: none !important; }
          .a4-page { margin: 0; padding: 0; box-shadow: none; width: 100%; min-height: unset; }
          .ft-table thead { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sim-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr { page-break-inside: avoid; }
          .no-break { page-break-inside: avoid; }
        }
      `}</style>

      {/* Screen bar */}
      <div className="screen-bar">
        <span>Vista previa — Ficha Técnica: <strong>{sheet.product_name}</strong> ({quantity} {quantity === 1 ? 'unidad' : 'unidades'})</span>
        <button onClick={() => window.print()}>🖨 Imprimir</button>
      </div>

      <div className="a4-page">

        {/* ── HEADER ── */}
        <div className="hdr">
          <div className="hdr-left">
            <div className="logo-box">LOGO</div>
            <div>
              <div className="hdr-brand-name">Que Copado</div>
              <div className="hdr-brand-sub">Hamburguesería</div>
            </div>
          </div>
          <div className="hdr-right">
            <div className="doc-title">Ficha Técnica de Producción</div>
            <div className="doc-meta">
              Fecha: {dateStr}&nbsp;&nbsp;•&nbsp;&nbsp;Versión: {version}
            </div>
          </div>
        </div>

        {/* ── PRODUCT ── */}
        <hr className="rule-thick" />
        <div className="product-name">{sheet.product_name}</div>
        <hr className="rule-thick" style={{ marginTop: '4pt' }} />

        {/* ── SIMULATION BOX ── */}
        <div className="sec-title">Parámetros de Producción</div>
        <div className="sim-box">
          <div className="sim-item">
            <div className="sim-label">Cantidad simulada</div>
            <div className="sim-value">{quantity}&nbsp;<span style={{ fontSize: 10, fontWeight: 400 }}>{quantity === 1 ? 'unidad' : 'unidades'}</span></div>
          </div>
          <div className="sim-item">
            <div className="sim-label">Receta base</div>
            <div className="sim-value">1&nbsp;<span style={{ fontSize: 10, fontWeight: 400 }}>unidad</span></div>
          </div>
          <div className="sim-item">
            <div className="sim-label">Factor de escala</div>
            <div className="sim-value">×{quantity}</div>
          </div>
          {showCosts && (
            <>
              <div className="sim-item">
                <div className="sim-label">Costo total estimado</div>
                <div className="sim-value sim-accent">{formatPrice(totalCost)}</div>
              </div>
              <div className="sim-item">
                <div className="sim-label">Costo por unidad</div>
                <div className="sim-value sim-accent">{formatPrice(quantity > 0 ? totalCost / quantity : 0)}</div>
              </div>
            </>
          )}
        </div>

        {/* ── DESGLOSE POR RECETA ── */}
        {sheet.recipes.map((recipe) => (
          <div key={recipe.recipe_id} className="no-break">
            <div className="sec-title">
              Desglose — {recipe.recipe_name}
              {recipe.multiplier !== 1 && (
                <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 6, fontSize: 8 }}>
                  (multiplicador receta: ×{recipe.multiplier})
                </span>
              )}
            </div>
            <table className="ft-table">
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <th>Ingrediente</th>
                  <th className="r" style={{ width: 90 }}>Cant. neta</th>
                  <th className="r" style={{ width: 90 }}>Cant. bruta</th>
                  <th className="r" style={{ width: 100 }}>Merma estimada</th>
                </tr>
              </thead>
              <tbody>
                {recipe.ingredients.map((ing) => (
                  <IngPrintRow key={ing.ingredient_id} ing={ing} depth={0} quantity={quantity} />
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* ── LISTA DE COMPRAS ── */}
        <div className="sec-title">Lista de Compras — Ingredientes finales</div>
        <table className="ft-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <th>Ingrediente</th>
              <th className="r" style={{ width: 90 }}>Cant. neta</th>
              <th className="r" style={{ width: 90 }}>Cant. bruta</th>
              {showCosts && <th className="r" style={{ width: 90 }}>Stock actual</th>}
              {showCosts && <th className="r" style={{ width: 90 }}>Costo lote</th>}
            </tr>
          </thead>
          <tbody>
            {sheet.shopping_list.map((item) => (
              <ShoppingPrintRow
                key={item.ingredient_id}
                item={item}
                quantity={quantity}
                showCosts={showCosts}
              />
            ))}
          </tbody>
          {showCosts && (
            <tfoot>
              <tr>
                <td colSpan={shoppingColSpanLeft} className="r">
                  Costo total estimado del lote:
                </td>
                <td className="r" style={{ fontSize: '11pt', color: '#8b6600' }}>
                  {formatPrice(totalCost)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* ── NOTAS ── */}
        <div className="sec-title" style={{ marginTop: '10pt' }}>Notas de Producción</div>
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="note-line" />
        ))}

        {/* ── FOOTER ── */}
        <div className="ft-footer">
          <div className="sig-row">
            <div className="sig-block">
              <div className="sig-label">Responsable de producción</div>
              <div className="sig-line" />
            </div>
            <div className="sig-block">
              <div className="sig-label">Firma</div>
              <div className="sig-line" />
            </div>
            <div className="sig-block" style={{ maxWidth: 120 }}>
              <div className="sig-label">Fecha de producción</div>
              <div className="sig-line" />
            </div>
          </div>
          <div className="footer-bottom">
            <span>Ficha Técnica · {sheet.product_name} · Que Copado</span>
            <span>Impreso: {dateStr}</span>
          </div>
        </div>

      </div>
    </>
  )
}
