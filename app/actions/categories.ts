'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createCategory(formData: FormData) {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  const name = formData.get('name') as string

  // Validar nombre
  if (!name?.trim()) {
    return { error: 'El nombre de la categoría es requerido' }
  }

  if (name.trim().length > 100) {
    return { error: 'El nombre no puede exceder 100 caracteres' }
  }

  const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  // Validar que el slug no esté vacío después de la transformación
  if (!slug) {
    return { error: 'El nombre debe contener al menos un carácter alfanumérico' }
  }

  const { data: maxOrder } = await supabase
    .from('categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const { error } = await supabase.from('categories').insert({
    name: name.trim(),
    slug,
    sort_order: (maxOrder?.sort_order ?? 0) + 1,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function updateCategory(categoryId: string, data: {
  name?: string
  slug?: string
  sort_order?: number
}) {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  // Validar categoryId
  if (!categoryId?.trim()) {
    return { error: 'ID de categoría inválido' }
  }

  // Validar datos si se proporcionan
  if (data.name !== undefined) {
    if (!data.name.trim()) {
      return { error: 'El nombre de la categoría no puede estar vacío' }
    }
    if (data.name.trim().length > 100) {
      return { error: 'El nombre no puede exceder 100 caracteres' }
    }
    data.name = data.name.trim()
  }

  if (data.slug !== undefined) {
    if (!data.slug.trim()) {
      return { error: 'El slug no puede estar vacío' }
    }
    data.slug = data.slug.trim()
  }

  if (data.sort_order !== undefined) {
    if (isNaN(data.sort_order) || data.sort_order < 0) {
      return { error: 'El orden debe ser un número válido' }
    }
  }

  const { error } = await supabase
    .from('categories')
    .update(data)
    .eq('id', categoryId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  // Validar categoryId
  if (!categoryId?.trim()) {
    return { error: 'ID de categoría inválido' }
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin/dashboard')
  return { success: true }
}
