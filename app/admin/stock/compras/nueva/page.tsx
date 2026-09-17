import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/server/auth'
import { getFullStockData } from '@/app/actions/stock'
import { AdminLayout } from '@/components/admin/layout'
import { PurchaseFormPage } from '@/components/admin/stock/purchase-form-page'

/**
 * La carga de una compra, en su propia pantalla.
 *
 * Trae sus ingredientes en vez de recibirlos de la vista de stock: entrar por
 * esta URL directamente tiene que funcionar igual que llegar desde el boton, y
 * eso es justamente lo que se gana al sacarla del dialogo.
 *
 * Reusa `getFullStockData()` —la misma lectura que alimenta la vista de stock—
 * en lugar de una consulta propia. Trae tambien los productos de reventa, que
 * esta pantalla no usa, pero van en la misma ola: no cuesta un viaje mas y evita
 * un segundo camino que mantener.
 */
export default async function NuevaCompraPage() {
  const user = await getAuthUser()
  if (!user) redirect('/admin/login')

  const { data } = await getFullStockData()

  return (
    <AdminLayout
      title="Registrar compra"
      description="Cargá los ingredientes que entraron para sumarlos al stock"
      hidePageHeader
    >
      <PurchaseFormPage ingredients={data?.ingredients ?? []} />
    </AdminLayout>
  )
}
