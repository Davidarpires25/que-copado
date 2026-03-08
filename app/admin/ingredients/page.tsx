import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IngredientsDashboard } from './ingredients-dashboard'

export default async function IngredientsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }

  const [ingredientsResult, categoriesResult] = await Promise.all([
    supabase
      .from('ingredients')
      .select('*, ingredient_categories(id, name)')
      .order('name', { ascending: true }),
    supabase
      .from('ingredient_categories')
      .select('*')
      .order('name', { ascending: true }),
  ])

  return (
    <IngredientsDashboard
      initialIngredients={ingredientsResult.data ?? []}
      categories={categoriesResult.data ?? []}
    />
  )
}
