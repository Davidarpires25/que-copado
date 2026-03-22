import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/layout'
import { CategoryFormPage } from '@/components/admin/categories/category-form-page'
import type { Category } from '@/lib/types/database'

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: categoryData } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (!categoryData) notFound()

  const category = categoryData as unknown as Category

  return (
    <AdminLayout title="Editar Categoría" description={`Editando: ${category.name}`}>
      <CategoryFormPage mode="edit" category={category} />
    </AdminLayout>
  )
}
