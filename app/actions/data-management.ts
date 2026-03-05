'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'

export interface EntityCounts {
  orders: number
  products: number
  categories: number
  ingredients: number
  recipes: number
  stock_movements: number
}

export async function getEntityCounts(): Promise<{ data: EntityCounts | null; error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { data: null, error: 'No autorizado' }

  const [orders, products, categories, ingredients, recipes, stockMovements] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('ingredients').select('id', { count: 'exact', head: true }),
    supabase.from('recipes').select('id', { count: 'exact', head: true }),
    supabase.from('stock_movements').select('id', { count: 'exact', head: true }),
  ])

  return {
    data: {
      orders: orders.count ?? 0,
      products: products.count ?? 0,
      categories: categories.count ?? 0,
      ingredients: ingredients.count ?? 0,
      recipes: recipes.count ?? 0,
      stock_movements: stockMovements.count ?? 0,
    },
    error: null,
  }
}

// ─── Delete actions ───────────────────────────────────────────────────────────

export async function deleteAllOrders(): Promise<{ error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { error: 'No autorizado' }

  // Skip orders with status 'abierto' (active open tables/counters)
  const { data: toDelete } = await supabase
    .from('orders')
    .select('id')
    .neq('status', 'abierto')

  if (!toDelete?.length) return { error: null }

  const ids = toDelete.map((o) => o.id)

  // Delete order_items first (FK)
  await supabase.from('order_items').delete().in('order_id', ids)

  // Then orders
  const { error } = await supabase.from('orders').delete().in('id', ids)
  if (error) return { error: 'Error al eliminar pedidos' }

  return { error: null }
}

export async function deleteAllProducts(): Promise<{ error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { error: 'No autorizado' }

  // Remove FK references in order_items (keep history, just unlink product)
  await supabase.from('order_items').update({ product_id: null }).not('product_id', 'is', null)

  // Delete dependents
  await supabase.from('stock_movements').delete().not('product_id', 'is', null)
  await supabase.from('product_recipes').delete().not('product_id', 'is', null)

  const { error } = await supabase.from('products').delete().not('id', 'is', null)
  if (error) return { error: 'Error al eliminar productos' }

  return { error: null }
}

export async function deleteAllCategories(): Promise<{ error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { error: 'No autorizado' }

  // Must delete products first (FK products.category_id → categories.id)
  const productResult = await deleteAllProducts()
  if (productResult.error) return productResult

  const { error } = await supabase.from('categories').delete().not('id', 'is', null)
  if (error) return { error: 'Error al eliminar categorías' }

  return { error: null }
}

export async function deleteAllIngredients(): Promise<{ error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { error: 'No autorizado' }

  // Delete dependents first
  await supabase.from('stock_movements').delete().not('ingredient_id', 'is', null)
  await supabase.from('ingredient_sub_recipes').delete().not('id', 'is', null)
  await supabase.from('recipe_ingredients').delete().not('id', 'is', null)

  const { error } = await supabase.from('ingredients').delete().not('id', 'is', null)
  if (error) return { error: 'Error al eliminar ingredientes' }

  return { error: null }
}

export async function deleteAllRecipes(): Promise<{ error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { error: 'No autorizado' }

  await supabase.from('recipe_ingredients').delete().not('id', 'is', null)
  await supabase.from('product_recipes').delete().not('id', 'is', null)

  const { error } = await supabase.from('recipes').delete().not('id', 'is', null)
  if (error) return { error: 'Error al eliminar recetas' }

  return { error: null }
}

export async function deleteAllStockMovements(): Promise<{ error: string | null }> {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase.from('stock_movements').delete().not('id', 'is', null)
  if (error) return { error: 'Error al eliminar movimientos de stock' }

  return { error: null }
}
