-- Fase 4: indices para la trazabilidad de turnos
--
-- Nota: `cash_register_sessions.opened_by` y `closed_by` YA EXISTIAN, con FK a
-- auth.users, y el codigo ya las venia llenando (openSession y closeSession).
-- No figuraban en ninguna migracion del repo porque se crearon desde el
-- dashboard, igual que buena parte del esquema base.
--
-- O sea que el dato de quien abrio y cerro cada turno estaba guardado desde
-- siempre; lo que faltaba era mostrarlo. Esta migracion solo agrega los indices
-- para poder cruzarlo con `profiles` sin escanear la tabla entera.
--
-- El ADD COLUMN queda por si se levanta el proyecto desde cero: sobre la base
-- actual es un no-op.

ALTER TABLE cash_register_sessions
  ADD COLUMN IF NOT EXISTS opened_by uuid,
  ADD COLUMN IF NOT EXISTS closed_by uuid;

CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_by ON cash_register_sessions(opened_by);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_closed_by ON cash_register_sessions(closed_by);

COMMENT ON COLUMN cash_register_sessions.opened_by IS
  'Empleado que abrio el turno. Null en los turnos anteriores a que existiera la columna.';
COMMENT ON COLUMN cash_register_sessions.closed_by IS
  'Empleado que cerro el turno y firmo el arqueo.';
