import { redirect, notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { AdminLayout } from '@/components/admin/layout'
import { RecipeFormPage } from '@/components/admin/recipes/recipe-form-page'
import type { RecipeWithIngredients } from '@/lib/types/database'

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) redirect('/admin/login')

  const [{ data: recipeData }, { data: ingredients }] = await Promise.all([
    supabase
      .from('recipes')
      .select('*, recipe_ingredients(*, ingredients(*))')
      .eq('id', id)
      .single(),
    supabase
      .from('ingredients')
      .select('*')
      .order('name'),
  ])

  if (!recipeData) notFound()

  return (
    <AdminLayout title="Editar Receta" description={`Editando: ${(recipeData as unknown as RecipeWithIngredients).name}`}>
      <RecipeFormPage
        mode="edit"
        recipe={recipeData as unknown as RecipeWithIngredients}
        ingredients={ingredients ?? []}
      />
    </AdminLayout>
  )
}
