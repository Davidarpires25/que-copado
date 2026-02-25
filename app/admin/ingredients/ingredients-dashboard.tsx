'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Wheat, Check, X, Pencil, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AdminLayout } from '@/components/admin/layout'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IngredientFormDialog } from '@/components/admin/ingredients/ingredient-form-dialog'
import { deleteIngredient, updateIngredient } from '@/app/actions/ingredients'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import type { Ingredient } from '@/lib/types/database'
import { INGREDIENT_UNIT_ABBR, type IngredientUnit } from '@/lib/types/database'

interface IngredientsDashboardProps {
  initialIngredients: Ingredient[]
}

export function IngredientsDashboard({ initialIngredients }: IngredientsDashboardProps) {
  const [ingredients, setIngredients] = useState(initialIngredients)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const formatCost = (cost: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cost)

  const filteredIngredients = ingredients.filter(
    (i) => !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = ingredients.filter((i) => i.is_active).length
  const inactiveCount = ingredients.length - activeCount

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingIngredient(null)
  }

  const handleCreated = (ingredient: Ingredient) => {
    setIngredients((prev) => [...prev, ingredient].sort((a, b) => a.name.localeCompare(b.name)))
    setIsFormOpen(false)
  }

  const handleUpdated = (updated: Ingredient) => {
    setIngredients((prev) =>
      prev.map((i) => (i.id === updated.id ? updated : i)).sort((a, b) => a.name.localeCompare(b.name))
    )
    setEditingIngredient(null)
    setIsFormOpen(false)
  }

  const handleToggleActive = async (ingredient: Ingredient) => {
    const newValue = !ingredient.is_active
    setIngredients((prev) => prev.map((i) => (i.id === ingredient.id ? { ...i, is_active: newValue } : i)))
    const result = await updateIngredient(ingredient.id, { is_active: newValue })
    if (result.error) {
      toast.error(result.error)
      setIngredients((prev) => prev.map((i) => (i.id === ingredient.id ? { ...i, is_active: !newValue } : i)))
    } else {
      toast.success(newValue ? 'Ingrediente activado' : 'Ingrediente desactivado')
    }
  }

  const handleDelete = async (id: string) => {
    const prev = ingredients
    setIngredients((list) => list.filter((i) => i.id !== id))
    setDeleteTarget(null)
    const result = await deleteIngredient(id)
    if (result.error) {
      toast.error(result.error)
      setIngredients(prev)
    } else {
      toast.success('Ingrediente eliminado')
    }
  }

  return (
    <AdminLayout title="Ingredientes" description="Gestiona los ingredientes y sus costos">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-4 lg:p-6 hover:border-[#FEC501]/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#a8b5c9] text-sm font-medium">Total</p>
              <p className="text-2xl lg:text-3xl font-bold text-[#f0f2f5] mt-1">{ingredients.length}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#FEC501]/10 rounded-xl flex items-center justify-center">
              <Wheat className="h-5 w-5 lg:h-6 lg:w-6 text-[#FEC501]" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-4 lg:p-6 hover:border-green-500/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#a8b5c9] text-sm font-medium">Activos</p>
              <p className="text-2xl lg:text-3xl font-bold text-[#f0f2f5] mt-1">{activeCount}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Check className="h-5 w-5 lg:h-6 lg:w-6 text-green-500" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1a1d24] border border-[#2a2f3a] rounded-xl p-4 lg:p-6 hover:border-red-500/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#a8b5c9] text-sm font-medium">Inactivos</p>
              <p className="text-2xl lg:text-3xl font-bold text-[#f0f2f5] mt-1">{inactiveCount}</p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
              <X className="h-5 w-5 lg:h-6 lg:w-6 text-red-500" />
            </div>
          </div>
        </motion.div>
      </div>

      {ingredients.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#2a2f3a] bg-[#1a1d24] overflow-hidden"
        >
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-[#252a35] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Wheat className="h-10 w-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-[#f0f2f5] mb-2">No hay ingredientes todavia</h3>
            <p className="text-[#a8b5c9] mb-6 max-w-sm mx-auto">
              Comienza agregando ingredientes para armar las recetas de tus productos.
            </p>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[#FEC501]/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Ingrediente
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8b5c9]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ingrediente..."
                className="bg-[#1a1d24] border-[#2a2f3a] text-[#f0f2f5] text-sm h-9 pl-9 placeholder:text-[#a8b5c9] focus:border-[#FEC501]/50 focus:ring-2 focus:ring-[#FEC501]/20"
              />
            </div>
            <p className="text-[#a8b5c9] text-sm hidden sm:block">
              {filteredIngredients.length} {filteredIngredients.length === 1 ? 'ingrediente' : 'ingredientes'}
            </p>
            <div className="ml-auto">
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-[#FEC501] hover:bg-[#E5B001] text-black font-semibold shadow-lg shadow-[#FEC501]/20 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nuevo Ingrediente</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </div>
          </div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-[#2a2f3a] bg-[#1a1d24] overflow-hidden backdrop-blur"
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[#1a1d24]">
                <TableRow className="border-[#2a2f3a] hover:bg-[#1a1d24]">
                  <TableHead className="text-[#a8b5c9] font-semibold">Nombre</TableHead>
                  <TableHead className="text-[#a8b5c9] font-semibold">Unidad</TableHead>
                  <TableHead className="text-[#a8b5c9] font-semibold">Costo / Unidad</TableHead>
                  <TableHead className="text-[#a8b5c9] font-semibold text-center hidden sm:table-cell">Activo</TableHead>
                  <TableHead className="text-[#a8b5c9] font-semibold text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredients.map((ingredient, index) => (
                  <motion.tr
                    key={ingredient.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-[#2a2f3a] hover:bg-[#252a35] transition-colors group"
                  >
                    <TableCell>
                      <p className="font-semibold text-[#f0f2f5] group-hover:text-[#FEC501] transition-colors text-sm lg:text-base">
                        {ingredient.name}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-[#2a2f3a] text-[#c4cdd9] bg-[#252a35] font-medium">
                        {INGREDIENT_UNIT_ABBR[ingredient.unit as IngredientUnit] ?? ingredient.unit}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[#FEC501] font-semibold text-sm lg:text-base">
                        {formatCost(ingredient.cost_per_unit)}
                      </span>
                      <span className="text-[#a8b5c9] text-xs ml-1">
                        / {INGREDIENT_UNIT_ABBR[ingredient.unit as IngredientUnit] ?? ingredient.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center">
                              <Switch
                                checked={ingredient.is_active}
                                onCheckedChange={() => handleToggleActive(ingredient)}
                                className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#2a2f3a]"
                                aria-label={ingredient.is_active ? 'Activo' : 'Inactivo'}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {ingredient.is_active ? 'Activo' : 'Inactivo'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 lg:h-9 lg:w-9 text-[#a8b5c9] hover:text-[#f0f2f5] hover:bg-[#2a2f3a] transition-all"
                                onClick={() => handleEdit(ingredient)}
                              >
                                <Pencil className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 lg:h-9 lg:w-9 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-all"
                                onClick={() => setDeleteTarget(ingredient.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        </>
      )}

      <IngredientFormDialog
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        ingredient={editingIngredient}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar ingrediente"
        description="Esta accion no se puede deshacer. Si el ingrediente esta en uso en recetas, no se podra eliminar."
        confirmLabel="Eliminar"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </AdminLayout>
  )
}
