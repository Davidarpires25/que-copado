import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { AdminLayout } from '@/components/admin/layout'
import { RecipeFormPage } from '@/components/admin/recipes/recipe-form-page'

export default async function NewRecipePage() {
  const supabase = await createAdminClient()
  const user = await getAuthUser(supabase)
  if (!user) redirect('/admin/login')

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('*')
    .order('name')

  return (
    <AdminLayout title="Nueva Receta" description="Crea una receta reutilizable para tus productos">
      <RecipeFormPage mode="create" ingredients={ingredients ?? []} />
    </AdminLayout>
  )
}
