'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('business_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching business settings:', error)
      }
      // Retornar configuración por defecto si no existe
      return {
        data: {
          id: SETTINGS_ID,
          operating_days: [0, 1, 2, 3, 4, 5, 6],
          opening_time: '21:00',
          closing_time: '01:00',
          is_paused: false,
          pause_message: 'Estamos cerrados temporalmente. Volvemos pronto!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }
    }

    return { data, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in getBusinessSettings:', error)
    }
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
}): Promise<{ data: BusinessSettings | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('business_settings')
      .update(updates)
      .eq('id', SETTINGS_ID)
      .select()
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating business settings:', error)
      }
      return { data: null, error: 'Error al actualizar configuración' }
    }

    // Revalidar páginas
    revalidatePath('/admin/settings')
    revalidatePath('/checkout')

    return { data: data as BusinessSettings, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in updateBusinessSettings:', error)
    }
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
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }

    const updates: { is_paused: boolean; pause_message?: string } = {
      is_paused: isPaused,
    }

    if (message) {
      updates.pause_message = message
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('business_settings')
      .update(updates)
      .eq('id', SETTINGS_ID)
      .select()
      .single()

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error toggling pause:', error)
      }
      return { data: null, error: 'Error al cambiar estado' }
    }

    revalidatePath('/admin/settings')
    revalidatePath('/checkout')
    revalidatePath('/')

    return { data: data as BusinessSettings, error: null }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in toggleBusinessPause:', error)
    }
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Verificar si el negocio está aceptando pedidos (público - para checkout)
 */
export async function checkIfAcceptingOrders(): Promise<{
  accepting: boolean
  message: string | null
}> {
  try {
    const { data: settings, error } = await getBusinessSettings()

    if (error || !settings) {
      // Si hay error, permitir pedidos pero con advertencia
      return {
        accepting: true,
        message: null,
      }
    }

    // Importar aquí para evitar problemas de dependencias circulares
    const { checkBusinessStatus } = await import('@/lib/services/business-hours')
    const status = checkBusinessStatus(settings)

    if (status.isPaused) {
      return {
        accepting: false,
        message: status.message,
      }
    }

    if (!status.isOpen) {
      return {
        accepting: false,
        message: status.message,
      }
    }

    return {
      accepting: true,
      message: null,
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in checkIfAcceptingOrders:', error)
    }
    // En caso de error, permitir pedidos
    return {
      accepting: true,
      message: null,
    }
  }
}
