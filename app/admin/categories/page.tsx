import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { CategoriesDashboard } from './categories-dashboard'
import type { Category } from '@/lib/types/database'

export default async function CategoriesPage() {
  const user = await getAuthUser()
  if (!user) {
    redirect('/admin/login')
  }

  const adminSupabase = await createAdminClient()
  const [{ data: categories }, { data: productCounts }] = await Promise.all([
    adminSupabase.from('categories').select('*').order('sort_order', { ascending: true }),
    adminSupabase.from('products').select('category_id'),
  ])

  // Build a map of category_id → product count
  const countMap: Record<string, number> = {}
  for (const p of productCounts ?? []) {
    if (p.category_id) {
      countMap[p.category_id] = (countMap[p.category_id] ?? 0) + 1
    }
  }

  return (
    <CategoriesDashboard
      initialCategories={(categories as Category[]) ?? []}
      productCountMap={countMap}
    />
  )
}
