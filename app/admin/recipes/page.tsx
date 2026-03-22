import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { RecipesDashboard } from './recipes-dashboard'
import type { RecipeWithIngredients } from '@/lib/types/database'

export default async function RecipesPage() {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) redirect('/admin/login')

  const { data: recipes } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(*, ingredients(*))')
    .order('name')

  return (
    <RecipesDashboard
      initialRecipes={(recipes ?? []) as RecipeWithIngredients[]}
    />
  )
}
