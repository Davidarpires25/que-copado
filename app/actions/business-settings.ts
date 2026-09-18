'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'
import { revalidateBusinessSettings } from '@/lib/server/revalidate'
import type { BusinessSettings } from '@/lib/types/database'

// ID fijo para el singleton de configuración
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Obtener configuración del negocio (público - para checkout)
 */
export async function getBusinessSettings(): Promise<{
  data: BusinessSettings | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .single()

    if (error) {
      devError('Error fetching business settings:', error)
      // Retornar configuración por defecto si no existe
      return {
        data: {
          id: SETTINGS_ID,
          operating_days: [0, 1, 2, 3, 4, 5, 6],
          opening_time: '21:00',
          closing_time: '01:00',
          is_paused: false,
          pause_message: 'Estamos cerrados temporalmente. Volvemos pronto!',
          transfer_alias: null,
          transfer_cbu: null,
          transfer_titular: null,
          aplicar_tope_de_stock: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }
    }

    return { data, error: null }
  } catch (error) {
    devError('Error in getBusinessSettings:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Actualizar configuración del negocio (admin)
 */
export async function updateBusinessSettings(updates: {
  operating_days?: number[]
  opening_time?: string
  closing_time?: string
  is_paused?: boolean
  pause_message?: string
  transfer_alias?: string | null
  transfer_cbu?: string | null
  transfer_titular?: string | null
  aplicar_tope_de_stock?: boolean
}): Promise<{ data: BusinessSettings | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()

    const user = await getAuthUser(supabase)
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    // Validar horarios si se proporcionan
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/

    if (updates.opening_time && !timeRegex.test(updates.opening_time)) {
      return { data: null, error: 'Formato de hora de apertura inválido (HH:MM)' }
    }

    if (updates.closing_time && !timeRegex.test(updates.closing_time)) {
      return { data: null, error: 'Formato de hora de cierre inválido (HH:MM)' }
    }

    // Validar días operativos
    if (updates.operating_days) {
      const validDays = updates.operating_days.every(
        (d) => Number.isInteger(d) && d >= 0 && d <= 6
      )
      if (!validDays || updates.operating_days.length === 0) {
        return { data: null, error: 'Días operativos inválidos' }
      }
    }

    // El alias y el CBU se guardan sin espacios de sobra y vacio se guarda como
    // null: la diferencia entre "" y null decide si el checkout muestra la
    // seccion, y dos formas de decir "no hay cuenta" es una de mas.
    const limpio = { ...updates }
    for (const campo of ['transfer_alias', 'transfer_cbu', 'transfer_titular'] as const) {
      if (campo in limpio) {
        const valor = limpio[campo]?.trim() ?? ''
        limpio[campo] = valor === '' ? null : valor
      }
    }

    // El CBU argentino tiene 22 digitos y el CVU de las billeteras tambien. Se
    // valida el largo pero no el digito verificador: un CBU mal tipeado que
    // igual pasa la cuenta es raro, y bloquear a alguien que quiere guardar un
    // numero que su banco si acepta es peor que dejarlo guardar.
    if (limpio.transfer_cbu && !/^\d{22}$/.test(limpio.transfer_cbu)) {
      return { data: null, error: 'El CBU o CVU tiene que ser de 22 dígitos, sin espacios ni guiones' }
    }

    const { data, error } = await supabase
      .from('business_settings')
      .update(limpio)
      .eq('id', SETTINGS_ID)
      .select()
      .single()

    if (error) {
      devError('Error updating business settings:', error)
      return { data: null, error: 'Error al actualizar configuración' }
    }

    revalidateBusinessSettings()

    return { data: data as BusinessSettings, error: null }
  } catch (error) {
    devError('Error in updateBusinessSettings:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Pausar/reanudar pedidos (admin - atajo rápido)
 */
export async function toggleBusinessPause(
  isPaused: boolean,
  message?: string
): Promise<{ data: BusinessSettings | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()

    const user = await getAuthUser(supabase)
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const updates: { is_paused: boolean; pause_message?: string } = {
      is_paused: isPaused,
    }

    if (message) {
      updates.pause_message = message
    }

    const { data, error } = await supabase
      .from('business_settings')
      .update(updates)
      .eq('id', SETTINGS_ID)
      .select()
      .single()

    if (error) {
      devError('Error toggling pause:', error)
      return { data: null, error: 'Error al cambiar estado' }
    }

    revalidateBusinessSettings()

    return { data: data as BusinessSettings, error: null }
  } catch (error) {
    devError('Error in toggleBusinessPause:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/** Datos de cobro que el checkout le muestra al cliente. */
export interface DatosTransferencia {
  alias: string | null
  cbu: string | null
  titular: string | null
}

/**
 * Verificar si el negocio está aceptando pedidos (público - para checkout)
 *
 * Devuelve tambien los datos de transferencia porque salen de la misma fila que
 * el horario: pedirlos aparte seria un segundo viaje para leer el mismo registro
 * que ya esta en la mano. Van null cuando no estan cargados, y ahi el checkout
 * no muestra la seccion.
 */
export async function checkIfAcceptingOrders(): Promise<{
  accepting: boolean
  message: string | null
  transferencia: DatosTransferencia
}> {
  const sinDatos: DatosTransferencia = { alias: null, cbu: null, titular: null }

  try {
    const { data: settings, error } = await getBusinessSettings()

    if (error || !settings) {
      return { accepting: true, message: null, transferencia: sinDatos }
    }

    const transferencia: DatosTransferencia = {
      alias: settings.transfer_alias?.trim() || null,
      cbu: settings.transfer_cbu?.trim() || null,
      titular: settings.transfer_titular?.trim() || null,
    }

    const { checkBusinessStatus } = await import('@/lib/services/business-hours')
    const status = checkBusinessStatus(settings)

    if (status.isPaused) {
      return { accepting: false, message: status.message, transferencia }
    }

    if (!status.isOpen) {
      return { accepting: false, message: status.message, transferencia }
    }

    return { accepting: true, message: null, transferencia }
  } catch (error) {
    devError('Error in checkIfAcceptingOrders:', error)
    return { accepting: true, message: null, transferencia: sinDatos }
  }
}
