import type {
  PaymentMethod,
  PosOrderType,
  CashRegisterSessionStatus,
  CashMovementType,
  Order,
} from './database'
import type { OrderItem } from './orders'

// Cash Register Session with proper types
export interface CashRegisterSession {
  id: string
  opened_at: string
  closed_at: string | null
  opened_by: string | null
  closed_by: string | null
  opening_balance: number
  expected_cash: number | null
  actual_cash: number | null
  cash_difference: number | null
  total_sales: number
  total_orders: number
  total_cash_sales: number
  total_card_sales: number
  total_transfer_sales: number
  total_withdrawals: number
  total_deposits: number
  notes: string | null
  status: CashRegisterSessionStatus
}

// Cash Movement
export interface CashMovement {
  id: string
  session_id: string
  type: CashMovementType
  amount: number
  reason: string
  created_by: string | null
  created_at: string
}

// Data to open a new session
export interface OpenSessionData {
  opening_balance: number
}

// Data to close a session
export interface CloseSessionData {
  actual_cash: number
  notes?: string
}

// Data to create a POS order
export interface CreatePosOrderData {
  items: OrderItem[]
  total: number
  payment_method: PaymentMethod
  order_type: PosOrderType
  table_number?: number | null
  notes?: string | null
  session_id: string
}

// Data to create a mostrador order (goes to kitchen first)
export interface CreateMostadorOrderData {
  items: OrderItem[]
  total: number
  notes?: string | null
  session_id: string
}

// A single payment split (for hybrid payments)
export interface PaymentSplit {
  amount: number
  method: PaymentMethod
}

// Order with its payment splits (for historial)
export interface OrderWithSplits extends Order {
  payment_splits: Array<{ amount: number; method: string }> | null
}

// Data to create a cash movement
export interface CreateCashMovementData {
  session_id: string
  type: CashMovementType
  amount: number
  reason: string
}

// Session summary for close screen
export interface SessionSummary {
  session: CashRegisterSession
  orders: Order[]
  movements: CashMovement[]
  currentCash: number
}
