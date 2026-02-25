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

  const price = parseFloat(priceStr)
  if (isNaN(price) || price <= 0) {
    return { error: 'El precio debe ser un número válido mayor a 0' }
  }

  if (price > 1000000) {
    return { error: 'El precio no puede exceder $1.000.000' }
  }

  const cost = costStr ? parseFloat(costStr) : null
  if (cost !== null && (isNaN(cost) || cost < 0)) {
    return { error: 'El costo debe ser un número válido mayor o igual a 0' }
  }

  if (imageUrl && imageUrl.trim()) {
    try {
      new URL(imageUrl)
    } catch {
      return { error: 'La URL de la imagen no es válida' }
    }
  }

  const productType = (formData.get('product_type') as string) || 'elaborado'

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
      is_active: true,
      is_out_of_stock: false,
    })
    .select('*, categories(*)')
    .single()

  if (error) {
    return { error: friendlyError(error) }
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
  image_url?: string
  is_active?: boolean
  is_out_of_stock?: boolean
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

  if (data.image_url !== undefined && data.image_url) {
    try {
      new URL(data.image_url)
      data.image_url = data.image_url.trim()
    } catch {
      return { error: 'La URL de la imagen no es válida' }
    }
  }

  const { data: updatedProduct, error } = await supabase
    .from('products')
    .update(data)
    .eq('id', productId)
    .select('*, categories(*)')
    .single()

  if (error) {
    return { error: friendlyError(error) }
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
