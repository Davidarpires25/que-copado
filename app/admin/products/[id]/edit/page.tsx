import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/layout'
import { ProductFormPage } from '@/components/admin/products/product-form-page'
import type { RecipeWithIngredients, Category, Product } from '@/lib/types/database'
import { getProductRecipes } from '@/app/actions/recipes'

type ProductWithCategory = Product & { categories: Category | null }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const [{ data: productData }, { data: categories }, { data: recipes }, recipesResult] =
    await Promise.all([
      supabase.from('products').select('*, categories(*), product_half_configs(*)').eq('id', id).single(),
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('recipes').select('*, recipe_ingredients(*, ingredients(*))').order('name'),
      getProductRecipes(id),
    ])

  if (!productData) notFound()

  const product = productData as unknown as ProductWithCategory

  const initialRecipes = recipesResult.data?.map((pr) => ({
    recipe_id: pr.recipe_id,
    quantity: pr.quantity,
  })) ?? []

  return (
    <AdminLayout title="Editar Producto" description={`Editando: ${product.name}`}>
      <ProductFormPage
        mode="edit"
        product={product}
        categories={categories ?? []}
        recipes={(recipes ?? []) as RecipeWithIngredients[]}
        initialRecipes={initialRecipes}
      />
    </AdminLayout>
  )
}
