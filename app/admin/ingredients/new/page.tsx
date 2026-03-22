import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { AdminLayout } from '@/components/admin/layout'
import { IngredientFormPage } from '@/components/admin/ingredients/ingredient-form-page'

export default async function NewIngredientPage() {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) redirect('/admin/login')

  const { data: categories } = await supabase
    .from('ingredient_categories')
    .select('*')
    .order('name')

  return (
    <AdminLayout title="Nuevo Ingrediente" description="Agrega un nuevo ingrediente para tus recetas">
      <IngredientFormPage mode="create" categories={categories ?? []} />
    </AdminLayout>
  )
}
