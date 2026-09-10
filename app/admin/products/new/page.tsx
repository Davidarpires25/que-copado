import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/layout'
import { ProductFormPage } from '@/components/admin/products/product-form-page'
import type { RecipeWithIngredients } from '@/lib/types/database'

export default async function NewProductPage() {
  const supabase = await createClient()

  const user = await getAuthUser()
  if (!user) redirect('/admin/login')

  const [{ data: categories }, { data: recipes }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('recipes').select('*, recipe_ingredients(*, ingredients(*))').order('name'),
  ])

  return (
    <AdminLayout title="Nuevo Producto" description="Agregá un nuevo producto al catálogo" hidePageHeader>
      <ProductFormPage
        mode="create"
        categories={categories ?? []}
        recipes={(recipes ?? []) as RecipeWithIngredients[]}
      />
    </AdminLayout>
  )
}
