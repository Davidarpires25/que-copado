-- ============================================================================
-- Migration 006: Extend stock_movements for sale tracking
-- Adds 'sale' and 'sale_reversal' to movement_type constraint.
-- Adds 'order' to reference_type constraint.
-- Adds order_id column for traceability.
-- ============================================================================

-- 1. Drop existing constraints and recreate with new values
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN ('purchase', 'adjustment', 'waste', 'return', 'initial', 'sale', 'sale_reversal'));

ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_reference_type_check;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_reference_type_check
  CHECK (reference_type IN ('manual', 'purchase', 'order'));

-- 2. Add order_id column for traceability
ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- 3. Index for querying movements by order
CREATE INDEX IF NOT EXISTS idx_stock_movements_order ON stock_movements(order_id) WHERE order_id IS NOT NULL;
