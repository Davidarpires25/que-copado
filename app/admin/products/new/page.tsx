import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/layout'
import { ProductFormPage } from '@/components/admin/products/product-form-page'
import type { RecipeWithIngredients } from '@/lib/types/database'

export default async function NewProductPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const [{ data: categories }, { data: recipes }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('recipes').select('*, recipe_ingredients(*, ingredients(*))').order('name'),
  ])

  return (
    <AdminLayout title="Nuevo Producto" description="Agregá un nuevo producto al catálogo">
      <ProductFormPage
        mode="create"
        categories={categories ?? []}
        recipes={(recipes ?? []) as RecipeWithIngredients[]}
      />
    </AdminLayout>
  )
}
