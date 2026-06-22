-- RLS policies for kitchen audit and hybrid payment records
-- Ejecutar en Supabase Dashboard > SQL Editor o como parte del flujo de migraciones

-- ============================================
-- payment_splits
-- ============================================
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to select payment_splits" ON payment_splits;
DROP POLICY IF EXISTS "Allow authenticated to insert payment_splits" ON payment_splits;
DROP POLICY IF EXISTS "Allow authenticated to update payment_splits" ON payment_splits;
DROP POLICY IF EXISTS "Allow authenticated to delete payment_splits" ON payment_splits;

CREATE POLICY "Allow authenticated to select payment_splits"
  ON payment_splits
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated to insert payment_splits"
  ON payment_splits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to update payment_splits"
  ON payment_splits
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to delete payment_splits"
  ON payment_splits
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- comandas
-- ============================================
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to select comandas" ON comandas;
DROP POLICY IF EXISTS "Allow authenticated to insert comandas" ON comandas;
DROP POLICY IF EXISTS "Allow authenticated to update comandas" ON comandas;
DROP POLICY IF EXISTS "Allow authenticated to delete comandas" ON comandas;

CREATE POLICY "Allow authenticated to select comandas"
  ON comandas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated to insert comandas"
  ON comandas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to update comandas"
  ON comandas
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to delete comandas"
  ON comandas
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- comanda_items
-- ============================================
ALTER TABLE comanda_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to select comanda_items" ON comanda_items;
DROP POLICY IF EXISTS "Allow authenticated to insert comanda_items" ON comanda_items;
DROP POLICY IF EXISTS "Allow authenticated to update comanda_items" ON comanda_items;
DROP POLICY IF EXISTS "Allow authenticated to delete comanda_items" ON comanda_items;

CREATE POLICY "Allow authenticated to select comanda_items"
  ON comanda_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated to insert comanda_items"
  ON comanda_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to update comanda_items"
  ON comanda_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated to delete comanda_items"
  ON comanda_items
  FOR DELETE
  TO authenticated
  USING (true);
