import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CategoriesDashboard } from './categories-dashboard'
import type { Category } from '@/lib/types/database'

export default async function CategoriesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }

  const adminSupabase = await createAdminClient()
  const { data: categories } = await adminSupabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  return <CategoriesDashboard initialCategories={(categories as Category[]) ?? []} />
}
