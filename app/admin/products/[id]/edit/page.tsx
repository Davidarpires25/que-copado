import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/layout'
import { ProductFormPage } from '@/components/admin/products/product-form-page'
import type { RecipeWithIngredients, Category, Product } from '@/lib/types/database'
import { getProductRecipes } from '@/app/actions/recipes'
import { getProductComponents } from '@/app/actions/products'

type ProductWithCategory = Product & { categories: Category | null }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const user = await getAuthUser()
  if (!user) redirect('/admin/login')

  const [{ data: productData }, { data: categories }, { data: recipes }, recipesResult, { data: candidatos }, componentsResult] =
    await Promise.all([
      supabase.from('products').select('*, categories(*), product_half_configs(*)').eq('id', id).single(),
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('recipes').select('*, recipe_ingredients(*, ingredients(*))').order('name'),
      getProductRecipes(id),
      // Candidatos a componente: activos, que no sean combos, y sin el producto
      // que se esta editando —un combo no se contiene a si mismo—.
      supabase
        .from('products')
        .select('id, name, price, cost, product_type, station')
        .eq('is_active', true)
        .neq('product_type', 'combo')
        .neq('id', id)
        .order('name'),
      getProductComponents(id),
    ])

  if (!productData) notFound()

  const product = productData as unknown as ProductWithCategory

  const initialRecipes = recipesResult.data?.map((pr) => ({
    recipe_id: pr.recipe_id,
    quantity: pr.quantity,
  })) ?? []

  const initialComponents = componentsResult.data?.map((c) => ({
    component_id: c.component_id,
    quantity: Number(c.quantity),
  })) ?? []

  return (
    <AdminLayout title="Editar Producto" description={`Editando: ${product.name}`} hidePageHeader>
      <ProductFormPage
        mode="edit"
        product={product}
        categories={categories ?? []}
        recipes={(recipes ?? []) as RecipeWithIngredients[]}
        initialRecipes={initialRecipes}
        componentCandidates={candidatos ?? []}
        initialComponents={initialComponents}
      />
    </AdminLayout>
  )
}
