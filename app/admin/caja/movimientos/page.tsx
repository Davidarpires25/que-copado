import { redirect } from 'next/navigation'

interface MovimientosPageProps {
  searchParams: Promise<{ session?: string }>
}

export default async function MovimientosPage({ searchParams }: MovimientosPageProps) {
  const { session } = await searchParams
  const params = new URLSearchParams({ tab: 'movimientos' })
  if (session) params.set('session', session)
  redirect(`/admin/caja/arqueos?${params.toString()}`)
}
