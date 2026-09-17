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

  const [{ data: categories }, { data: recipes }, { data: candidatos }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('recipes').select('*, recipe_ingredients(*, ingredients(*))').order('name'),
    // Lo que puede ser componente de un combo: cualquier producto activo que no
    // sea otro combo. Se trae siempre porque el tipo se elige en la misma
    // pantalla y pedirlo despues seria un viaje mas con el formulario abierto.
    supabase
      .from('products')
      .select('id, name, price, cost, product_type, station')
      .eq('is_active', true)
      .neq('product_type', 'combo')
      .order('name'),
  ])

  return (
    <AdminLayout title="Nuevo Producto" description="Agregá un nuevo producto al catálogo" hidePageHeader>
      <ProductFormPage
        mode="create"
        categories={categories ?? []}
        recipes={(recipes ?? []) as RecipeWithIngredients[]}
        componentCandidates={candidatos ?? []}
      />
    </AdminLayout>
  )
}
