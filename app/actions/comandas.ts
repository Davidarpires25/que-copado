'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'
import type { Comanda, ComandaStatus, Station } from '@/lib/types/comandas'

/**
 * Genera comandas desde los order_items de una orden, agrupando por station.
 * Omite productos sin station (reventa/bebidas).
 */
export async function sendToKitchen(orderId: string): Promise<{
  data: Comanda[]
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: [], error: 'No autenticado' }

    // Fetch order_items with their product station and type
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('id, product_id, product_name, quantity, notes, sale_tag, products(station, product_type)')
      .eq('order_id', orderId)
      .eq('status', 'pendiente')

    if (itemsError) {
      devError('Error fetching order items for kitchen:', itemsError)
      return { data: [], error: 'Error al obtener items de la orden' }
    }

    if (!items || items.length === 0) {
      return { data: [], error: null }
    }

    // Filter items with a station and group by station
    type ItemWithStation = {
      id: string
      product_name: string
      quantity: number
      notes: string | null
      sale_tag: string | null
      station: Station
    }

    const grouped = new Map<Station, ItemWithStation[]>()

    for (const item of items) {
      const product = item.products as unknown as { station: string | null; product_type: string | null } | null
      if (product?.product_type === 'reventa') continue // reventa products never go to kitchen
      const station = product?.station as Station | null
      if (!station) continue // skip items without station

      if (!grouped.has(station)) grouped.set(station, [])
      grouped.get(station)!.push({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        notes: item.notes ?? null,
        sale_tag: (item as Record<string, unknown>).sale_tag as string | null ?? null,
        station,
      })
    }

    if (grouped.size === 0) {
      return { data: [], error: null }
    }

    const createdComandas: Comanda[] = []

    for (const [station, stationItems] of grouped) {
      // Insert comanda
      const { data: comanda, error: comandaError } = await supabase
        .from('comandas')
        .insert({
          order_id: orderId,
          station,
          status: 'pendiente',
        })
        .select()
        .single()

      if (comandaError || !comanda) {
        devError('Error creating comanda:', comandaError)
        continue
      }

      // Insert comanda_items
      const comandaItemsToInsert = stationItems.map((item) => ({
        comanda_id: comanda.id,
        order_item_id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        sale_tag: item.sale_tag,
        notes: item.notes,
      }))

      const { data: insertedItems, error: itemsInsertError } = await supabase
        .from('comanda_items')
        .insert(comandaItemsToInsert)
        .select()

      if (itemsInsertError) {
        devError('Error creating comanda_items:', itemsInsertError)
      }

      createdComandas.push({
        id: comanda.id,
        order_id: comanda.order_id,
        station: comanda.station as Station,
        status: comanda.status as ComandaStatus,
        notes: comanda.notes,
        created_at: comanda.created_at,
        updated_at: comanda.updated_at,
        items: (insertedItems ?? []).map((ci) => ({
          id: ci.id,
          comanda_id: ci.comanda_id,
          order_item_id: ci.order_item_id,
          product_name: ci.product_name,
          quantity: ci.quantity,
          sale_tag: ci.sale_tag,
          notes: ci.notes,
        })),
      })
    }

    return { data: createdComandas, error: null }
  } catch (error) {
    devError('Error in sendToKitchen:', error)
    return { data: [], error: 'Error inesperado' }
  }
}

/**
 * Actualiza el status de una comanda
 */
export async function updateComandaStatus(
  comandaId: string,
  status: ComandaStatus
): Promise<{ error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { error: 'No autenticado' }

    const { error } = await supabase
      .from('comandas')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', comandaId)

    if (error) {
      devError('Error updating comanda status:', error)
      return { error: 'Error al actualizar comanda' }
    }

    return { error: null }
  } catch (error) {
    devError('Error in updateComandaStatus:', error)
    return { error: 'Error inesperado' }
  }
}

/**
 * Obtiene las comandas activas (no 'listo') para la pantalla de cocina.
 * Opcionalmente filtra por station.
 */
export async function getActiveComandas(station?: Station): Promise<{
  data: (Comanda & { order_type: string | null; table_number: number | null })[]
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: [], error: 'No autenticado' }

    let query = supabase
      .from('comandas')
      .select(`
        *,
        comanda_items (*),
        orders:order_id (order_type, table_number)
      `)
      .neq('status', 'listo')
      .order('created_at', { ascending: true })

    if (station) {
      query = query.eq('station', station)
    }

    const { data, error } = await query

    if (error) {
      devError('Error fetching active comandas:', error)
      return { data: [], error: 'Error al obtener comandas' }
    }

    const result = (data ?? []).map((c) => {
      const order = c.orders as { order_type: string | null; table_number: number | null } | null
      return {
        id: c.id,
        order_id: c.order_id,
        station: c.station as Station,
        status: c.status as ComandaStatus,
        notes: c.notes,
        created_at: c.created_at,
        updated_at: c.updated_at,
        items: (c.comanda_items ?? []).map((ci: Record<string, unknown>) => ({
          id: ci.id as string,
          comanda_id: ci.comanda_id as string,
          order_item_id: ci.order_item_id as string | null,
          product_name: ci.product_name as string,
          quantity: ci.quantity as number,
          sale_tag: ci.sale_tag as string | null,
          notes: ci.notes as string | null,
        })),
        order_type: order?.order_type ?? null,
        table_number: order?.table_number ?? null,
      }
    })

    return { data: result, error: null }
  } catch (error) {
    devError('Error in getActiveComandas:', error)
    return { data: [], error: 'Error inesperado' }
  }
}
