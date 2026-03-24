'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, Search, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INGREDIENT_UNIT_ABBR } from '@/lib/types/database'
import { formatCost } from '@/lib/constants/recipe-units'
import type { Ingredient, IngredientUnit } from '@/lib/types/database'

interface IngredientComboboxProps {
  availableIngredients: Ingredient[]
  onSelect: (ingredientId: string) => void
  onCreateRequest: (name: string) => void
  disabled?: boolean
}

export function IngredientCombobox({
  availableIngredients,
  onSelect,
  onCreateRequest,
  disabled,
}: IngredientComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = availableIngredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const exactMatch = availableIngredients.some(
    (i) => i.name.toLowerCase() === search.toLowerCase()
  )

  const showCreateOption = !exactMatch

  useEffect(() => {
    if (!open) { setSearch(''); return }
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 h-9 px-3 rounded-md border border-dashed text-sm transition-colors',
          'bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text-muted)]',
          'hover:border-[var(--admin-accent)]/50 hover:text-[var(--admin-text)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          open && 'border-[var(--admin-accent)]/50 text-[var(--admin-text)]'
        )}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Agregar ingrediente</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--admin-border)]">
            <Search className="h-3.5 w-3.5 text-[var(--admin-text-muted)] shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ingrediente..."
              className="flex-1 bg-transparent text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-0.5 rounded hover:bg-[var(--admin-border)] text-[var(--admin-text-muted)] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && !showCreateOption && (
              <li className="px-3 py-2 text-xs text-[var(--admin-text-muted)] text-center">
                No hay ingredientes disponibles
              </li>
            )}
            {filtered.map((ing) => (
              <li key={ing.id}>
                <button
                  type="button"
                  onClick={() => { onSelect(ing.id); setOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] transition-colors text-left"
                >
                  <span className="truncate">{ing.name}</span>
                  <span className="text-xs text-[var(--admin-text-muted)] shrink-0 ml-2">
                    {formatCost(ing.cost_per_unit)} / {INGREDIENT_UNIT_ABBR[ing.unit as IngredientUnit] ?? ing.unit}
                  </span>
                </button>
              </li>
            ))}

            {showCreateOption && (
              <li className="border-t border-[var(--admin-border)] mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => { setOpen(false); onCreateRequest(search.trim()) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--admin-accent-text)] hover:bg-[var(--admin-accent)]/10 transition-colors text-left"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {search.trim()
                      ? <>Crear <span className="font-semibold">&ldquo;{search.trim()}&rdquo;</span></>
                      : 'Crear nuevo ingrediente'
                    }
                  </span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
