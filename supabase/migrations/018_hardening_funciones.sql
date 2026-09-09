-- Hardening de funciones expuestas por la API
--
-- Sale de correr los advisors de seguridad de Supabase despues de aplicar la
-- 016. Hay un hallazgo previo a todo este trabajo que es grave.

BEGIN;

-- ============================================================================
-- 1. increment_field — agujero previo, expuesto a internet
-- ============================================================================
-- Como estaba (migracion 013): SECURITY DEFINER, sin search_path, y con EXECUTE
-- para `anon`. O sea que cualquiera con la anon key —que viaja en el bundle del
-- navegador— podia llamar /rest/v1/rpc/increment_field y sumar o restar
-- cualquier columna numerica de cualquier tabla con `id` uuid, salteandose RLS:
--
--   POST /rest/v1/rpc/increment_field
--   { "table_name": "products", "row_id": "...",
--     "field_name": "price", "increment_value": -8500 }
--
-- En el codigo se usa en un solo lugar (app/actions/cash-register.ts:282) y
-- siempre con la misma tabla y los mismos dos campos, asi que se puede acotar
-- a eso exactamente sin cambiar el comportamiento.

CREATE OR REPLACE FUNCTION public.increment_field(
  table_name      text,
  row_id          uuid,
  field_name      text,
  increment_value numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo el uso real: acumular totales de un turno de caja.
  IF table_name <> 'cash_register_sessions'
     OR field_name NOT IN ('total_withdrawals', 'total_deposits') THEN
    RAISE EXCEPTION 'increment_field: combinacion no permitida (%, %)',
      table_name, field_name;
  END IF;

  -- SECURITY DEFINER saltea RLS, asi que el permiso se chequea a mano.
  IF auth_role() IS NULL OR auth_role() NOT IN ('admin', 'cajero') THEN
    RAISE EXCEPTION 'increment_field: sin permiso';
  END IF;

  EXECUTE format(
    'UPDATE %I SET %I = %I + $1 WHERE id = $2',
    table_name, field_name, field_name
  ) USING increment_value, row_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_field(text, uuid, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_field(text, uuid, text, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_field(text, uuid, text, numeric) TO authenticated;

-- ============================================================================
-- 2. Los helpers de rol no tienen por que ser llamables sin sesion
-- ============================================================================
REVOKE ALL ON FUNCTION public.auth_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.auth_role() TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- 3. Funciones de trigger — nadie las llama por RPC
-- ============================================================================
-- El trigger las ejecuta igual; esto solo saca el endpoint de la API publica.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

-- search_path fijo, para que nadie pueda anteponer un esquema propio.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM authenticated;

COMMIT;

-- ============================================================================
-- Queda pendiente, fuera de SQL
-- ============================================================================
-- Los advisors tambien marcan que esta desactivada la proteccion contra
-- contraseñas filtradas (chequeo contra HaveIBeenPwned). Se activa en
-- Dashboard > Authentication > Policies, y conviene hacerlo antes de dar de
-- alta empleados, que van a elegir sus propias claves.
