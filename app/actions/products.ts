'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { revalidateStorefront } from '@/lib/server/revalidate'
import { friendlyError } from '@/lib/server/error-messages'

export async function createProduct(formData: FormData) {
  const supabase = await createAdminClient()

  const user = await getAuthUser(supabase)
  if (!user) {
    return { error: 'No autorizado' }
  }

  // Validación de inputs
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const priceStr = formData.get('price') as string
  const costStr = formData.get('cost') as string
  const categoryId = formData.get('category_id') as string
  const imageUrl = formData.get('image_url') as string

  if (!name?.trim()) {
    return { error: 'El nombre del producto es requerido' }
  }

  if (name.trim().length > 200) {
    return { error: 'El nombre no puede exceder 200 caracteres' }
  }

  if (!categoryId?.trim()) {
    return { error: 'La categoría es requerida' }
  }

  const productType = (formData.get('product_type') as string) || 'elaborado'

  const price = parseFloat(priceStr)
  // 'mitad' products use price=0 as placeholder (real price is calculated dynamically)
  if (isNaN(price) || (price <= 0 && productType !== 'mitad')) {
    return { error: 'El precio debe ser un número válido mayor a 0' }
  }

  if (price > 1000000) {
    return { error: 'El precio no puede exceder $1.000.000' }
  }

  const cost = costStr ? parseFloat(costStr) : null
  if (cost !== null && (isNaN(cost) || cost < 0)) {
    return { error: 'El costo debe ser un número válido mayor o igual a 0' }
  }
  const stationRaw = (formData.get('station') as string) || 'none'
  const station = stationRaw === 'none' ? null : stationRaw

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      price,
      cost,
      product_type: productType,
      category_id: categoryId,
      image_url: imageUrl?.trim() || null,
      station,
      is_active: true,
      is_out_of_stock: false,
    })
    .select('*, categories(*)')
    .single()

  if (error) {
    return { error: friendlyError(error) }
  }

  // If type is 'mitad', create half config (source_category_id derived from product.category_id)
  if (productType === 'mitad') {
    const halfPricingMethod = (formData.get('half_pricing_method') as string) || 'max'
    const halfMarkupPctStr = formData.get('half_pricing_markup_pct') as string | null
    const halfMarkupPct = halfMarkupPctStr ? parseFloat(halfMarkupPctStr) : null

    await supabase.from('product_half_configs').insert({
      product_id: data.id,
      source_category_id: categoryId,  // use same category as the product
      pricing_method: halfPricingMethod,
      pricing_markup_pct: halfPricingMethod === 'cost_markup' ? halfMarkupPct : null,
    })
  }

  revalidateStorefront()
  return { success: true, product: data }
}

export async function updateProduct(productId: string, data: {
  name?: string
  description?: string
  price?: number
  cost?: number | null
  product_type?: string
  category_id?: string
  image_url?: string | null
  station?: string | null
  is_active?: boolean
  is_out_of_stock?: boolean
  // half pizza config fields (handled separately, not sent to products table)
  half_source_category_id?: string | null
  half_pricing_method?: string
  half_pricing_markup_pct?: number | null
}) {
  const supabase = await createAdminClient()

  const user = await getAuthUser(supabase)
  if (!user) {
    return { error: 'No autorizado' }
  }

  if (!productId?.trim()) {
    return { error: 'ID de producto inválido' }
  }

  if (data.name !== undefined) {
    if (!data.name.trim()) {
      return { error: 'El nombre del producto no puede estar vacío' }
    }
    if (data.name.trim().length > 200) {
      return { error: 'El nombre no puede exceder 200 caracteres' }
    }
    data.name = data.name.trim()
  }

  if (data.description !== undefined && data.description !== null) {
    data.description = data.description.trim() || undefined
  }

  if (data.price !== undefined) {
    if (isNaN(data.price) || data.price <= 0) {
      return { error: 'El precio debe ser un número válido mayor a 0' }
    }
    if (data.price > 1000000) {
      return { error: 'El precio no puede exceder $1.000.000' }
    }
  }

  if (data.image_url !== undefined) {
    data.image_url = data.image_url?.trim() || null
  }

  // Extract half config fields before passing to products table
  const { half_source_category_id, half_pricing_method, half_pricing_markup_pct, ...productData } = data

  const { data: updatedProduct, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', productId)
    .select('*, categories(*)')
    .single()

  if (error) {
    return { error: friendlyError(error) }
  }

  // Handle half config upsert/delete based on product_type
  const newType = data.product_type ?? updatedProduct.product_type
  if (newType === 'mitad') {
    // source_category_id = product's own category
    const sourceCategoryId = data.category_id ?? updatedProduct.category_id
    await supabase.from('product_half_configs').upsert({
      product_id: productId,
      source_category_id: sourceCategoryId,
      pricing_method: half_pricing_method ?? 'max',
      pricing_markup_pct: half_pricing_method === 'cost_markup' ? (half_pricing_markup_pct ?? null) : null,
    }, { onConflict: 'product_id' })
  } else if (data.product_type !== undefined && data.product_type !== 'mitad') {
    // Type changed away from 'mitad' — delete config
    await supabase.from('product_half_configs').delete().eq('product_id', productId)
  }

  revalidateStorefront()
  return { success: true, product: updatedProduct }
}

export async function deleteProduct(productId: string) {
  const supabase = await createAdminClient()

  const user = await getAuthUser(supabase)
  if (!user) {
    return { error: 'No autorizado' }
  }

  if (!productId?.trim()) {
    return { error: 'ID de producto inválido' }
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) {
    return { error: friendlyError(error) }
  }

  revalidateStorefront()
  return { success: true }
}

export async function toggleProductStock(productId: string, isOutOfStock: boolean) {
  return updateProduct(productId, { is_out_of_stock: isOutOfStock })
}

export async function toggleProductActive(productId: string, isActive: boolean) {
  return updateProduct(productId, { is_active: isActive })
}

export async function updateProductPrice(productId: string, price: number) {
  return updateProduct(productId, { price })
}

// Bulk operations

export async function bulkToggleActive(productIds: string[], isActive: boolean) {
  const supabase = await createAdminClient()

  const user = await getAuthUser(supabase)
  if (!user) {
    return { error: 'No autorizado' }
  }

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return { error: 'No se seleccionaron productos' }
  }

  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .in('id', productIds)

  if (error) {
    return { error: friendlyError(error) }
  }

  revalidateStorefront()
  return { success: true, count: productIds.length }
}

export async function bulkDelete(productIds: string[]) {
  const supabase = await createAdminClient()

  const user = await getAuthUser(supabase)
  if (!user) {
    return { error: 'No autorizado' }
  }

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return { error: 'No se seleccionaron productos' }
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .in('id', productIds)

  if (error) {
    return { error: friendlyError(error) }
  }

  revalidateStorefront()
  return { success: true, count: productIds.length }
}
