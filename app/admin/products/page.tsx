import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductsDashboard } from './products-dashboard'
import type { RecipeWithIngredients } from '@/lib/types/database'

export default async function ProductsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }

  const [{ data: products }, { data: categories }, { data: recipes }] = await Promise.all([
    supabase
      .from('products')
      .select('*, categories(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true }),
    supabase
      .from('recipes')
      .select('*, recipe_ingredients(*, ingredients(*))')
      .order('name'),
  ])

  return (
    <ProductsDashboard
      initialProducts={products ?? []}
      categories={categories ?? []}
      recipes={(recipes ?? []) as RecipeWithIngredients[]}
    />
  )
}
