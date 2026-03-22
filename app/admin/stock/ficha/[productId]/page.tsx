import { getProductionSheet } from '@/app/actions/stock'
import { FichaTecnicaView } from '@/components/admin/stock/ficha-tecnica-view'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ productId: string }>
}

export default async function FichaTecnicaPage({ params }: Props) {
  const { productId } = await params
  const { data, error } = await getProductionSheet(productId)
  if (error || !data) notFound()

  return <FichaTecnicaView sheet={data} />
}
