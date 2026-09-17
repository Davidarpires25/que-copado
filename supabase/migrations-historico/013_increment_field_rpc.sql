-- Atomic field increment function for cash register session totals.
-- Prevents read-modify-write race conditions when multiple operations
-- update session totals concurrently.
CREATE OR REPLACE FUNCTION increment_field(
  table_name text,
  row_id uuid,
  field_name text,
  increment_value numeric
) RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = %I + $1 WHERE id = $2',
    table_name, field_name, field_name
  ) USING increment_value, row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
