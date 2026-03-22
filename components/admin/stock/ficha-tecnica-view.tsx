'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Printer, Download, ChevronRight, ChevronDown,
  ClipboardList, TrendingDown,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatPrice } from '@/lib/utils'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import type {
  ProductionSheetResult,
  ProductionSheetIngredient,
  ProductionSheetShoppingItem,
} from '@/lib/types/stock'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatQty(qty: number, unit: string): string {
  if (qty === 0) return `0 ${unit}`
  if (unit === 'unidad') return qty % 1 === 0 ? `${qty} u` : `${qty.toFixed(2)} u`
  if (qty < 0.01) return `${(qty * 1000).toFixed(1)} ${unit === 'kg' ? 'g' : 'ml'}`
  if (qty < 1) return `${qty.toFixed(3)} ${unit}`
  return `${qty.toFixed(unit === 'unidad' ? 0 : 3)} ${unit}`
}

// ─── Ingredient row (recursive) ─────────────────────────────────────────────

function IngredientRow({
  ing,
  depth,
  quantity,
  isEven,
}: {
  ing: ProductionSheetIngredient
  depth: number
  quantity: number
  isEven: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = (ing.children?.length ?? 0) > 0
  const netQty = ing.net_qty_per_unit * quantity
  const grossQty = ing.gross_qty_per_unit * quantity
  const showGross = Math.abs(grossQty - netQty) > 0.00001

  return (
    <>
      <div
        className={cn(
          'flex items-center border-b border-[var(--admin-border)]',
          isEven ? 'bg-[var(--admin-surface)]' : 'bg-[var(--admin-surface-2)]'
        )}
        style={{ height: 40, paddingLeft: `${16 + depth * 20}px`, paddingRight: 16 }}
      >
        {/* Expand/collapse */}
        <div className="shrink-0 mr-1.5" style={{ width: 16 }}>
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[var(--admin-accent-text)] hover:opacity-70 transition-opacity cursor-pointer"
              aria-label={expanded ? 'Colapsar' : 'Expandir'}
            >
              <ChevronDown className={cn(
                'h-3.5 w-3.5 transition-transform duration-150',
                !expanded && '-rotate-90'
              )} />
            </button>
          ) : (
            <span className="w-1 h-1 rounded-full bg-[var(--admin-text-faint)] block mx-auto" />
          )}
        </div>

        {/* Name + badges */}
        <div className="flex-1 min-w-0 flex items-center gap-2 mr-3">
          <span className={cn(
            'text-[13px] truncate',
            depth === 0 ? 'font-medium text-[var(--admin-text)]' : 'text-[var(--admin-text-muted)]'
          )}>
            {ing.name}
          </span>
          {hasChildren && (
            <span className="shrink-0 text-[10px] font-semibold text-[var(--admin-accent-text)] bg-[var(--admin-accent)]/10 px-1.5 py-0.5 rounded border border-[var(--admin-accent)]/20">
              compuesto
            </span>
          )}
          {ing.waste_pct > 0 && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-red-500 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
              <TrendingDown className="h-2.5 w-2.5" />
              {ing.waste_pct}%
            </span>
          )}
        </div>

        {/* Neto */}
        <div className="text-right tabular-nums text-[12px] text-[var(--admin-text-muted)] shrink-0" style={{ width: 110 }}>
          {formatQty(netQty, ing.unit)}
        </div>

        {/* Bruto */}
        <div className="text-right tabular-nums text-[12px] font-semibold shrink-0" style={{ width: 130 }}>
          {showGross
            ? <span className="text-[var(--admin-text)]">{formatQty(grossQty, ing.unit)}</span>
            : <span className="text-[var(--admin-text-faint)]">—</span>
          }
        </div>

        {/* Merma */}
        <div className="text-right tabular-nums text-[12px] shrink-0" style={{ width: 80 }}>
          {ing.waste_pct > 0
            ? <span className="text-red-500 font-medium">{ing.waste_pct}%</span>
            : <span className="text-[var(--admin-text-faint)]">—</span>
          }
        </div>
      </div>

      {hasChildren && expanded && ing.children!.map((child, i) => (
        <IngredientRow
          key={child.ingredient_id}
          ing={child}
          depth={depth + 1}
          quantity={quantity}
          isEven={i % 2 === 0}
        />
      ))}
    </>
  )
}

// ─── Shopping list row ───────────────────────────────────────────────────────

function ShoppingRow({ item, quantity, isEven }: {
  item: ProductionSheetShoppingItem
  quantity: number
  isEven: boolean
}) {
  const netQty = item.net_qty_per_unit * quantity
  const grossQty = item.gross_qty_per_unit * quantity
  const totalCost = grossQty * item.cost_per_unit
  const showGross = Math.abs(grossQty - netQty) > 0.00001
  const delta = item.stock_tracking_enabled ? item.current_stock - grossQty : null
  const isShort = delta !== null && delta < 0

  return (
    <div
      className={cn(
        'flex items-center border-b border-[var(--admin-border)] px-4',
        isEven ? 'bg-[var(--admin-surface)]' : 'bg-[var(--admin-surface-2)]'
      )}
      style={{ height: 40 }}
    >
      {/* Name */}
      <div className="flex-1 min-w-0 mr-3">
        <span className={cn(
          'text-[13px] font-medium truncate',
          isShort ? 'text-amber-500' : 'text-[var(--admin-text)]'
        )}>
          {item.name}
        </span>
      </div>

      {/* Neto */}
      <div className="text-right tabular-nums text-[12px] text-[var(--admin-text-muted)] shrink-0" style={{ width: 110 }}>
        {formatQty(netQty, item.unit)}
      </div>

      {/* Bruto */}
      <div className="text-right tabular-nums text-[12px] font-semibold shrink-0" style={{ width: 130 }}>
        {showGross
          ? <span className="text-[var(--admin-text)]">{formatQty(grossQty, item.unit)}</span>
          : <span className="text-[var(--admin-text-faint)]">—</span>
        }
      </div>

      {/* Costo total */}
      <div className="text-right tabular-nums text-[12px] text-[var(--admin-text-muted)] shrink-0" style={{ width: 110 }}>
        {formatPrice(totalCost)}
      </div>

      {/* Disponible */}
      <div className="flex items-center justify-end gap-1.5 shrink-0" style={{ width: 120 }}>
        {!item.stock_tracking_enabled ? (
          <span className="text-[11px] text-[var(--admin-text-faint)]">Sin tracking</span>
        ) : isShort ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <span className="text-[11px] font-semibold text-red-500">
              falta {formatQty(Math.abs(delta!), item.unit)}
            </span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-500">
              Suficiente
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main view ───────────────────────────────────────────────────────────────

export function FichaTecnicaView({ sheet }: { sheet: ProductionSheetResult }) {
  const router = useRouter()
  const [tab, setTab] = useState<'desglose' | 'compras'>('desglose')
  const [quantity, setQuantity] = useState(10)
  const [inputStr, setInputStr] = useState('10')

  const totalRecipes = sheet.recipes.length
  const totalIngredients = sheet.shopping_list.length
  const totalCost = sheet.shopping_list.reduce(
    (acc, item) => acc + item.gross_qty_per_unit * quantity * item.cost_per_unit, 0
  )
  const unitCost = quantity > 0 ? totalCost / quantity : 0
  const hasShortages = sheet.shopping_list.some(
    (i) => i.stock_tracking_enabled && i.current_stock < i.gross_qty_per_unit * quantity
  )

  const handleSliderChange = (v: number) => {
    setQuantity(v)
    setInputStr(String(v))
  }

  const handleInputChange = (raw: string) => {
    setInputStr(raw)
    const n = parseInt(raw)
    if (!isNaN(n) && n >= 1 && n <= 9999) setQuantity(n)
  }

  const handleInputBlur = () => {
    const n = parseInt(inputStr)
    const clamped = isNaN(n) || n < 1 ? 1 : n > 9999 ? 9999 : n
    setQuantity(clamped)
    setInputStr(String(clamped))
  }

  return (
    <AdminLayout title="Ficha Técnica de Producción" hidePageHeader>
      <div className="space-y-5">

        {/* ── Breadcrumb + actions row ──────────────────────────── */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-[var(--admin-text-muted)]">Recetas</span>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--admin-text-faint)]" />
          <span className="text-sm text-[var(--admin-text)] font-medium truncate max-w-[200px]">
            {sheet.product_name}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => window.open(`/admin/stock/ficha/${sheet.product_id}/print?qty=${quantity}`, '_blank')}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[12px] font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </button>
            <button
              onClick={() => window.open(`/admin/stock/ficha/${sheet.product_id}/print?qty=${quantity}`, '_blank')}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[12px] font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar PDF
            </button>
          </div>
        </div>

        {/* ── Page title ────────────────────────────────────────── */}
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--admin-text)]">
          Ficha Técnica de Producción
        </h1>

        {/* ── Product card ─────────────────────────────────────── */}
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] p-5">
          <div className="flex items-center gap-4">

            {/* Left: icon + name */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/20 shrink-0">
                <ClipboardList className="h-6 w-6 text-[var(--admin-accent-text)]" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--admin-text)] leading-tight">
                  {sheet.product_name}
                </h2>
                <p className="text-[12px] text-[var(--admin-text-muted)] mt-0.5">
                  {totalRecipes} {totalRecipes === 1 ? 'receta' : 'recetas'} · {totalIngredients} ingredientes
                </p>
              </div>
            </div>

            {/* Middle: slider + input */}
            <div className="flex-1 min-w-0 px-4">
              <p className="text-[11px] text-[var(--admin-text-muted)] mb-2">Producción simulada</p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={Math.min(quantity, 100)}
                  onChange={(e) => handleSliderChange(Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer
                    bg-[var(--admin-border)]
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-[var(--admin-accent)]
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:shadow-sm
                    [&::-moz-range-thumb]:w-4
                    [&::-moz-range-thumb]:h-4
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-[var(--admin-accent)]
                    [&::-moz-range-thumb]:border-0
                    [&::-moz-range-thumb]:cursor-pointer"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={inputStr}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onBlur={handleInputBlur}
                    className="w-16 h-8 text-center text-[13px] font-bold tabular-nums rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text)] outline-none focus:border-[var(--admin-accent)]/60 focus:ring-1 focus:ring-[var(--admin-accent)]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[12px] text-[var(--admin-text-muted)]">ud</span>
                </div>
              </div>
            </div>

            {/* Right: costs */}
            <div className="flex items-center gap-5 shrink-0 pl-4 border-l border-[var(--admin-border)]">
              <div className="text-right">
                <p className="text-[11px] text-[var(--admin-text-muted)] mb-0.5">Costo total</p>
                <p className="text-[17px] font-bold text-[var(--admin-text)] tabular-nums">{formatPrice(totalCost)}</p>
              </div>
              <div className="h-8 w-px bg-[var(--admin-border)]" />
              <div className="text-right">
                <p className="text-[11px] text-[var(--admin-text-muted)] mb-0.5">Costo unitario</p>
                <p className="text-[17px] font-bold text-[var(--admin-accent-text)] tabular-nums">{formatPrice(unitCost)}</p>
              </div>
            </div>

          </div>
        </div>

        {/* ── Table card ───────────────────────────────────────── */}
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--shadow-card)] overflow-hidden">

          {/* Underline tabs */}
          <div className="flex items-center border-b border-[var(--admin-border)] px-4">
            {(['desglose', 'compras'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex items-center gap-1.5 px-1 py-3 mr-6 text-[13px] font-semibold transition-colors cursor-pointer border-b-2 -mb-px',
                  tab === t
                    ? 'text-[var(--admin-accent-text)] border-[var(--admin-accent)]'
                    : 'text-[var(--admin-text-muted)] border-transparent hover:text-[var(--admin-text)]'
                )}
              >
                {t === 'desglose' ? 'Desglose' : 'Lista de compras'}
                {t === 'compras' && hasShortages && tab !== 'compras' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Table header */}
          <div
            className="flex items-center bg-[var(--admin-bg)] border-b border-[var(--admin-border)] px-4"
            style={{ height: 38 }}
          >
            <div className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
              Ingrediente
            </div>
            <div className="text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-text-muted)] shrink-0" style={{ width: 110 }}>
              Neto (×1 ud)
            </div>
            <div className="text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-text-muted)] shrink-0" style={{ width: 130 }}>
              Bruto (c/ merma)
            </div>
            {tab === 'desglose' ? (
              <div className="text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-text-muted)] shrink-0" style={{ width: 80 }}>
                Merma
              </div>
            ) : (
              <>
                <div className="text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-text-muted)] shrink-0" style={{ width: 110 }}>
                  Costo total
                </div>
                <div className="text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-text-muted)] shrink-0" style={{ width: 120 }}>
                  Disponible (Δ)
                </div>
              </>
            )}
          </div>

          {/* Table body */}
          <AnimatePresence mode="wait">
            {tab === 'desglose' ? (
              <motion.div
                key="desglose"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                {sheet.recipes.map((recipe) => (
                  <div key={recipe.recipe_id}>
                    {/* Recipe header row */}
                    <div
                      className="flex items-center gap-2 bg-[var(--admin-bg)] border-b border-[var(--admin-border)] px-4"
                      style={{ height: 40 }}
                    >
                      <ChevronDown className="h-3.5 w-3.5 text-[var(--admin-accent-text)] shrink-0" />
                      <span className="text-[13px] font-semibold text-[var(--admin-text)]">
                        Receta: {recipe.recipe_name}
                      </span>
                      {recipe.multiplier !== 1 && (
                        <span className="text-[10px] font-bold text-[var(--admin-accent-text)] bg-[var(--admin-accent)]/10 border border-[var(--admin-accent)]/20 px-2 py-0.5 rounded">
                          ×{recipe.multiplier}
                        </span>
                      )}
                    </div>
                    {/* Ingredient rows */}
                    {recipe.ingredients.map((ing, i) => (
                      <IngredientRow
                        key={ing.ingredient_id}
                        ing={ing}
                        depth={0}
                        quantity={quantity}
                        isEven={i % 2 === 0}
                      />
                    ))}
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="compras"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                {sheet.shopping_list.map((item, i) => (
                  <ShoppingRow key={item.ingredient_id} item={item} quantity={quantity} isEven={i % 2 === 0} />
                ))}

                {/* Footer total */}
                <div
                  className="flex items-center justify-between bg-[var(--admin-bg)] border-t border-[var(--admin-border)] px-4"
                  style={{ height: 48 }}
                >
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                    Total estimado ({quantity} {quantity === 1 ? 'unidad' : 'unidades'})
                  </span>
                  <span className="text-[16px] font-bold text-[var(--admin-accent-text)] tabular-nums">
                    {formatPrice(totalCost)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </AdminLayout>
  )
}
