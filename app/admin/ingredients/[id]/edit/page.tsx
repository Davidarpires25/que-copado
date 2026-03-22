import { redirect, notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { AdminLayout } from '@/components/admin/layout'
import { IngredientFormPage } from '@/components/admin/ingredients/ingredient-form-page'
import type { IngredientWithCategory } from '@/lib/types/database'

export default async function EditIngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) redirect('/admin/login')

  const [{ data: ingredientData }, { data: categories }] = await Promise.all([
    supabase
      .from('ingredients')
      .select('*, ingredient_categories(id, name)')
      .eq('id', id)
      .single(),
    supabase
      .from('ingredient_categories')
      .select('*')
      .order('name'),
  ])

  if (!ingredientData) notFound()

  return (
    <AdminLayout
      title="Editar Ingrediente"
      description={`Editando: ${(ingredientData as unknown as IngredientWithCategory).name}`}
    >
      <IngredientFormPage
        mode="edit"
        ingredient={ingredientData as unknown as IngredientWithCategory}
        categories={categories ?? []}
      />
    </AdminLayout>
  )
}
