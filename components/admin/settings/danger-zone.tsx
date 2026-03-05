'use client'

import { useState, useEffect } from 'react'
import { ShieldAlert, Trash2, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  getEntityCounts,
  deleteAllOrders,
  deleteAllProducts,
  deleteAllCategories,
  deleteAllIngredients,
  deleteAllRecipes,
  deleteAllStockMovements,
  type EntityCounts,
} from '@/app/actions/data-management'

// ─── Entity config ────────────────────────────────────────────────────────────

interface EntityConfig {
  key: keyof EntityCounts
  label: string
  description: string
  warning: string
  action: () => Promise<{ error: string | null }>
}

const ENTITIES: EntityConfig[] = [
  {
    key: 'stock_movements',
    label: 'Movimientos de Stock',
    description: 'Historial de entradas y salidas de stock',
    warning: 'Se eliminará todo el historial de movimientos.',
    action: deleteAllStockMovements,
  },
  {
    key: 'orders',
    label: 'Pedidos',
    description: 'Historial de pedidos (excepto los activos)',
    warning: 'Se eliminarán todos los pedidos cerrados. Los pedidos activos (abiertos) no se tocan.',
    action: deleteAllOrders,
  },
  {
    key: 'recipes',
    label: 'Recetas',
    description: 'Recetas e ingredientes asociados',
    warning: 'Se eliminarán todas las recetas y sus vínculos con productos e ingredientes.',
    action: deleteAllRecipes,
  },
  {
    key: 'ingredients',
    label: 'Ingredientes',
    description: 'Ingredientes, sub-recetas y stock asociado',
    warning: 'Se eliminarán todos los ingredientes, sus sub-recetas, movimientos de stock y vínculos con recetas.',
    action: deleteAllIngredients,
  },
  {
    key: 'products',
    label: 'Productos',
    description: 'Productos del menú',
    warning: 'Se eliminarán todos los productos. Los pedidos existentes conservarán su historial.',
    action: deleteAllProducts,
  },
  {
    key: 'categories',
    label: 'Categorías',
    description: 'Categorías y todos los productos dentro de ellas',
    warning: 'Se eliminarán las categorías Y todos sus productos. Esta acción es la más destructiva.',
    action: deleteAllCategories,
  },
]

// ─── Step 1: Password dialog ──────────────────────────────────────────────────

interface PasswordStepProps {
  onConfirmed: (email: string) => void
  onCancel: () => void
}

function PasswordStep({ onConfirmed, onCancel }: PasswordStepProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return

    setIsLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const email = session?.user?.email

    if (!email) {
      toast.error('No se pudo obtener la sesión activa')
      setIsLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setIsLoading(false)

    if (error) {
      toast.error('Contraseña incorrecta')
      setPassword('')
      return
    }

    onConfirmed(email)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-2">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
        <ShieldAlert className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-red-300">
          Esta sección permite eliminar datos de forma permanente. Confirmá tu identidad para continuar.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--admin-text-muted)]">Contraseña actual</Label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresá tu contraseña"
            autoFocus
            className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-2)]"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!password || isLoading}
          className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verificar identidad'}
        </Button>
      </div>
    </form>
  )
}

// ─── Step 2: Entity selection + confirmation ──────────────────────────────────

interface DeleteStepProps {
  counts: EntityCounts
  onDeleted: () => void
  onCancel: () => void
}

function DeleteStep({ counts, onDeleted, onCancel }: DeleteStepProps) {
  const [selectedEntity, setSelectedEntity] = useState<EntityConfig | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!selectedEntity || confirmText !== 'ELIMINAR') return

    setIsDeleting(true)
    const result = await selectedEntity.action()
    setIsDeleting(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${selectedEntity.label} eliminados correctamente`)
      setSelectedEntity(null)
      setConfirmText('')
      onDeleted()
    }
  }

  if (selectedEntity) {
    const count = counts[selectedEntity.key]
    return (
      <div className="space-y-5 mt-2">
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
          <p className="text-sm font-semibold text-red-300">
            {count === 0
              ? `No hay ${selectedEntity.label.toLowerCase()} para eliminar`
              : `Se eliminarán ${count} ${selectedEntity.label.toLowerCase()}`}
          </p>
          <p className="text-xs text-red-400/80">{selectedEntity.warning}</p>
        </div>

        {count > 0 && (
          <div className="space-y-2">
            <Label className="text-[var(--admin-text-muted)] text-sm">
              Escribí <span className="font-mono font-bold text-red-400">ELIMINAR</span> para confirmar
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              autoFocus
              className="bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] h-10 font-mono"
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => { setSelectedEntity(null); setConfirmText('') }}
            className="flex-1 border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-2)]"
          >
            Volver
          </Button>
          {count > 0 && (
            <Button
              onClick={handleDelete}
              disabled={confirmText !== 'ELIMINAR' || isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50"
            >
              {isDeleting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Eliminando...</>
                : `Eliminar ${counts[selectedEntity.key]} registros`}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 mt-2">
      <p className="text-sm text-[var(--admin-text-muted)]">
        Identidad verificada. Seleccioná qué datos querés eliminar permanentemente.
      </p>

      <div className="space-y-2">
        {ENTITIES.map((entity) => {
          const count = counts[entity.key]
          return (
            <button
              key={entity.key}
              type="button"
              onClick={() => setSelectedEntity(entity)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] hover:border-red-500/40 hover:bg-red-500/5 transition-all duration-200 text-left group"
            >
              <div className="min-w-0">
                <p className="font-medium text-[var(--admin-text)] group-hover:text-red-400 transition-colors text-sm">
                  {entity.label}
                </p>
                <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">{entity.description}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span className={`text-sm font-semibold tabular-nums ${count === 0 ? 'text-[var(--admin-text-faint)]' : 'text-[var(--admin-text)]'}`}>
                  {count}
                </span>
                <Trash2 className="h-4 w-4 text-[var(--admin-text-muted)] group-hover:text-red-400 transition-colors" />
              </div>
            </button>
          )
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="w-full mt-2 border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-2)]"
      >
        Cerrar
      </Button>
    </div>
  )
}

// ─── Main DangerZone component ────────────────────────────────────────────────

export function DangerZone() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'password' | 'delete'>('password')
  const [counts, setCounts] = useState<EntityCounts | null>(null)
  const [isLoadingCounts, setIsLoadingCounts] = useState(false)

  const fetchCounts = async () => {
    setIsLoadingCounts(true)
    const result = await getEntityCounts()
    setIsLoadingCounts(false)
    if (result.data) setCounts(result.data)
  }

  const handleOpen = () => {
    setStep('password')
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => setStep('password'), 300)
  }

  const handlePasswordConfirmed = async () => {
    await fetchCounts()
    setStep('delete')
  }

  const handleDeleted = async () => {
    await fetchCounts()
  }

  return (
    <>
      {/* Danger Zone section */}
      <div className="mt-8 pt-8 border-t border-red-500/20">
        <div className="flex items-start gap-4 p-6 rounded-xl border border-red-500/30 bg-red-500/5">
          <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldAlert className="h-5 w-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-red-400 mb-1">Zona de Peligro</h3>
            <p className="text-sm text-[var(--admin-text-muted)] mb-4">
              Eliminación permanente de datos. Estas acciones no se pueden deshacer.
              Se requiere verificación de contraseña.
            </p>
            <Button
              type="button"
              onClick={handleOpen}
              className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 hover:border-red-500/60 transition-all duration-200"
              variant="outline"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Gestionar eliminación de datos
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="bg-[var(--admin-surface)] border-[var(--admin-border)] max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--admin-text)]">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              {step === 'password' ? 'Verificar identidad' : 'Eliminar datos'}
            </DialogTitle>
          </DialogHeader>

          {step === 'password' ? (
            <PasswordStep
              onConfirmed={handlePasswordConfirmed}
              onCancel={handleClose}
            />
          ) : (
            counts && !isLoadingCounts ? (
              <DeleteStep
                counts={counts}
                onDeleted={handleDeleted}
                onCancel={handleClose}
              />
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--admin-text-muted)]" />
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
