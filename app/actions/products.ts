'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createProduct(formData: FormData) {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const categoryId = formData.get('category_id') as string
  const imageUrl = formData.get('image_url') as string

  const { error } = await supabase.from('products').insert({
    name,
    description,
    price,
    category_id: categoryId,
    image_url: imageUrl || null,
    is_active: true,
    is_out_of_stock: false,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function updateProduct(productId: string, data: {
  name?: string
  description?: string
  price?: number
  category_id?: string
  image_url?: string
  is_active?: boolean
  is_out_of_stock?: boolean
}) {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('products')
    .update(data)
    .eq('id', productId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function deleteProduct(productId: string) {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin/dashboard')
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
