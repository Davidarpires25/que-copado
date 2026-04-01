'use client'

import { Minus, Plus, Trash2, Utensils } from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'
import { TAG_COLORS } from '@/lib/types/tables'
import type { OrderItemRow } from '@/lib/types/tables'

interface TableOrderItemsProps {
  items: OrderItemRow[]
  filterTag?: string | null
  allTags: string[]       // ordered list for color assignment
  canModify: boolean
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
}


function getTagColor(tag: string, allTags: string[]) {
  const idx = allTags.indexOf(tag)
  return TAG_COLORS[idx % TAG_COLORS.length] ?? TAG_COLORS[0]
}

export function TableOrderItems({
  items,
  filterTag,
  allTags,
  canModify,
  onUpdateQuantity,
  onRemoveItem,
}: TableOrderItemsProps) {
  const allActiveItems = items.filter((item) => item.status !== 'cancelado')
  const activeItems = filterTag
    ? allActiveItems.filter((item) => item.sale_tag === filterTag)
    : allActiveItems

  if (activeItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-[var(--admin-text-muted)]">
        <Utensils className="h-8 w-8 mb-2 text-[var(--admin-text-placeholder)]" />
        <p className="text-sm">Sin productos aún</p>
      </div>
    )
  }

  return (
    <div>
      {activeItems.map((item) => {
        const subtotal = item.product_price * item.quantity
        const tagColor = item.sale_tag ? getTagColor(item.sale_tag, allTags) : null

        return (
          <div
            key={item.id}
            className="flex items-center gap-3 py-3.5 border-b border-[var(--admin-border)]"
          >
            {/* Comensal tag pill — only shown when there are multiple tags and not filtering */}
            {tagColor && item.sale_tag && !filterTag && (
              <div className={cn(
                'flex items-center gap-1 px-1.5 rounded-full shrink-0',
                tagColor.bg
              )} style={{ height: 20 }}>
                <div className={cn('w-1 h-1 rounded-full shrink-0', tagColor.dot)} />
                <span className={cn('text-[11px] font-semibold leading-none', tagColor.text)}>
                  {item.sale_tag}
                </span>
              </div>
            )}

            {/* Name + price per unit */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[13px] font-medium text-[var(--admin-text)] truncate leading-tight">
                {item.product_name}
              </span>
              {item.notes && (
                <span className="text-xs text-[var(--admin-text-faint)] truncate">{item.notes}</span>
              )}
              <span className="text-xs text-[var(--admin-text-faint)]">
                {formatPrice(item.product_price)} c/u
              </span>
            </div>

            {/* Qty control */}
            {canModify ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    if (item.quantity > 1) onUpdateQuantity(item.id, item.quantity - 1)
                    else onRemoveItem(item.id)
                  }}
                  className="flex items-center justify-center rounded-md bg-[var(--admin-surface-2)] border border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40 transition-all active:scale-90 cursor-pointer"
                  style={{ width: 26, height: 26 }}
                >
                  <Minus className="h-3 w-3 text-[var(--admin-text-muted)]" />
                </button>
                <span className="text-[13px] font-semibold tabular-nums text-center text-[var(--admin-text)]" style={{ width: 18 }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="flex items-center justify-center rounded-md bg-[var(--admin-accent)] hover:opacity-90 active:scale-90 transition-all cursor-pointer"
                  style={{ width: 26, height: 26 }}
                >
                  <Plus className="h-3 w-3 text-black" />
                </button>
              </div>
            ) : (
              <span className="text-[12px] text-[var(--admin-text-muted)] shrink-0 tabular-nums">
                ×{item.quantity}
              </span>
            )}

            {/* Line subtotal */}
            <span className="text-[13px] font-semibold tabular-nums text-[var(--admin-text)] shrink-0" style={{ width: 52, textAlign: 'right' }}>
              {formatPrice(subtotal)}
            </span>

            {/* Trash */}
            {canModify && (
              <button
                onClick={() => onRemoveItem(item.id)}
                className="text-[var(--admin-text-faint)] hover:text-red-400 transition-colors cursor-pointer shrink-0"
                aria-label="Quitar ítem"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
