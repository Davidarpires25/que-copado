import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IngredientsDashboard } from './ingredients-dashboard'

export default async function IngredientsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('*')
    .order('name', { ascending: true })

  return <IngredientsDashboard initialIngredients={ingredients ?? []} />
}
