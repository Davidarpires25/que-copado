'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/server/auth'
import { devError } from '@/lib/server/logger'
import { revalidateCaja } from '@/lib/server/revalidate'
import type {
  CashRegisterSession,
  CashMovement,
  OpenSessionData,
  CloseSessionData,
  CreateCashMovementData,
  SessionSummary,
} from '@/lib/types/cash-register'
import type { Order } from '@/lib/types/database'

/**
 * Abrir una nueva sesion de caja
 */
export async function openSession(
  data: OpenSessionData
): Promise<{ data: CashRegisterSession | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    // Check no open session exists
    const { data: existing } = await supabase
      .from('cash_register_sessions')
      .select('id')
      .eq('status', 'open')
      .maybeSingle()

    if (existing) {
      return { data: null, error: 'Ya hay una caja abierta' }
    }

    const { data: session, error } = await supabase
      .from('cash_register_sessions')
      .insert({
        opening_balance: data.opening_balance,
        opened_by: user.id,
        status: 'open',
      })
      .select()
      .single()

    if (error) {
      devError('Error opening session:', error)
      return { data: null, error: 'Error al abrir la caja' }
    }

    revalidateCaja()
    return { data: session as CashRegisterSession, error: null }
  } catch (error) {
    devError('Error in openSession:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener sesion activa (abierta)
 */
export async function getActiveSession(): Promise<{
  data: CashRegisterSession | null
  error: string | null
}> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const { data: session, error } = await supabase
      .from('cash_register_sessions')
      .select('*')
      .eq('status', 'open')
      .maybeSingle()

    if (error) {
      devError('Error getting active session:', error)
      return { data: null, error: 'Error al obtener sesion activa' }
    }

    return { data: session as CashRegisterSession | null, error: null }
  } catch (error) {
    devError('Error in getActiveSession:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Cerrar una sesion de caja con arqueo
 */
export async function closeSession(
  sessionId: string,
  data: CloseSessionData
): Promise<{ data: CashRegisterSession | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    // Get current session to compute expected cash
    const { data: currentSession, error: fetchError } = await supabase
      .from('cash_register_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'open')
      .single()

    if (fetchError || !currentSession) {
      return { data: null, error: 'Sesion no encontrada o ya cerrada' }
    }

    const s = currentSession as CashRegisterSession
    const expectedCash =
      s.opening_balance +
      s.total_cash_sales +
      s.total_deposits -
      s.total_withdrawals

    const cashDifference = data.actual_cash - expectedCash

    const { data: session, error } = await supabase
      .from('cash_register_sessions')
      .update({
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        expected_cash: expectedCash,
        actual_cash: data.actual_cash,
        cash_difference: cashDifference,
        notes: data.notes || null,
        status: 'closed',
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      devError('Error closing session:', error)
      return { data: null, error: 'Error al cerrar la caja' }
    }

    revalidateCaja()
    return { data: session as CashRegisterSession, error: null }
  } catch (error) {
    devError('Error in closeSession:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener ordenes de una sesion
 */
export async function getSessionOrders(
  sessionId: string
): Promise<{ data: Order[] | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('cash_register_session_id', sessionId)
      .order('created_at', { ascending: false })

    if (error) {
      devError('Error fetching session orders:', error)
      return { data: null, error: 'Error al cargar ordenes' }
    }

    return { data: data as Order[], error: null }
  } catch (error) {
    devError('Error in getSessionOrders:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener resumen completo de una sesion
 */
export async function getSessionSummary(
  sessionId: string
): Promise<{ data: SessionSummary | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const [sessionResult, ordersResult, movementsResult] = await Promise.all([
      supabase
        .from('cash_register_sessions')
        .select('*')
        .eq('id', sessionId)
        .single(),
      supabase
        .from('orders')
        .select('*')
        .eq('cash_register_session_id', sessionId)
        .order('created_at', { ascending: false }),
      supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false }),
    ])

    if (sessionResult.error || !sessionResult.data) {
      return { data: null, error: 'Sesion no encontrada' }
    }

    const session = sessionResult.data as CashRegisterSession
    const orders = (ordersResult.data || []) as Order[]
    const movements = (movementsResult.data || []) as CashMovement[]

    const currentCash =
      session.opening_balance +
      session.total_cash_sales +
      session.total_deposits -
      session.total_withdrawals

    return {
      data: { session, orders, movements, currentCash },
      error: null,
    }
  } catch (error) {
    devError('Error in getSessionSummary:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Crear un movimiento de caja (retiro/ingreso)
 */
export async function createCashMovement(
  data: CreateCashMovementData
): Promise<{ data: CashMovement | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    // Verify session is open
    const { data: session } = await supabase
      .from('cash_register_sessions')
      .select('id, status')
      .eq('id', data.session_id)
      .eq('status', 'open')
      .single()

    if (!session) {
      return { data: null, error: 'La caja no esta abierta' }
    }

    // Insert movement
    const { data: movement, error } = await supabase
      .from('cash_movements')
      .insert({
        session_id: data.session_id,
        type: data.type,
        amount: data.amount,
        reason: data.reason,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      devError('Error creating cash movement:', error)
      return { data: null, error: 'Error al registrar movimiento' }
    }

    // Update session totals
    const updateField =
      data.type === 'withdrawal' ? 'total_withdrawals' : 'total_deposits'

    const { error: updateError } = await supabase.rpc('increment_field', {
      table_name: 'cash_register_sessions',
      row_id: data.session_id,
      field_name: updateField,
      increment_value: data.amount,
    })

    // Fallback: if RPC doesn't exist, update manually
    if (updateError) {
      const { data: currentSession } = await supabase
        .from('cash_register_sessions')
        .select(updateField)
        .eq('id', data.session_id)
        .single()

      if (currentSession) {
        const currentVal = (currentSession as Record<string, number>)[updateField] || 0
        await supabase
          .from('cash_register_sessions')
          .update({ [updateField]: currentVal + data.amount })
          .eq('id', data.session_id)
      }
    }

    revalidateCaja()
    return { data: movement as CashMovement, error: null }
  } catch (error) {
    devError('Error in createCashMovement:', error)
    return { data: null, error: 'Error inesperado' }
  }
}

/**
 * Obtener historial de sesiones cerradas
 */
export async function getRecentSessions(
  limit: number = 10
): Promise<{ data: CashRegisterSession[] | null; error: string | null }> {
  try {
    const supabase = await createAdminClient()
    const user = await getAuthUser(supabase)
    if (!user) return { data: null, error: 'No autenticado' }

    const { data, error } = await supabase
      .from('cash_register_sessions')
      .select('*')
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(limit)

    if (error) {
      devError('Error fetching recent sessions:', error)
      return { data: null, error: 'Error al cargar historial' }
    }

    return { data: data as CashRegisterSession[], error: null }
  } catch (error) {
    devError('Error in getRecentSessions:', error)
    return { data: null, error: 'Error inesperado' }
  }
}
