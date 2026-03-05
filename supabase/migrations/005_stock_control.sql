-- ============================================================================
-- Migration 005: Stock Control System (Phase A - Manual Inventory)
-- Adds stock tracking columns to ingredients and products, creates
-- stock_movements table for audit trail of all inventory changes.
-- Does NOT include automatic sale deduction (Phase B).
-- ============================================================================

-- 1. Add stock columns to ingredients
ALTER TABLE ingredients
  ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stock_tracking_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Add stock columns to products (for 'reventa' products that are tracked directly)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stock_tracking_enabled BOOLEAN NOT NULL DEFAULT false;

-- 3. Create stock_movements table (immutable audit log)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'adjustment', 'waste', 'return', 'initial')),
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC NOT NULL,
  new_stock NUMERIC NOT NULL,
  reason TEXT,
  reference_type TEXT CHECK (reference_type IN ('manual', 'purchase')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Exactly one of ingredient_id or product_id must be NOT NULL
  CONSTRAINT stock_movement_target_check CHECK (
    (ingredient_id IS NOT NULL AND product_id IS NULL)
    OR
    (ingredient_id IS NULL AND product_id IS NOT NULL)
  )
);

-- 4. Indexes for stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON stock_movements(ingredient_id) WHERE ingredient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);

-- 5. Indexes for stock queries on ingredients/products
CREATE INDEX IF NOT EXISTS idx_ingredients_stock_tracking ON ingredients(stock_tracking_enabled) WHERE stock_tracking_enabled = true;
CREATE INDEX IF NOT EXISTS idx_products_stock_tracking ON products(stock_tracking_enabled) WHERE stock_tracking_enabled = true;

-- 6. RLS for stock_movements (immutable: SELECT and INSERT only, no UPDATE/DELETE)
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);
