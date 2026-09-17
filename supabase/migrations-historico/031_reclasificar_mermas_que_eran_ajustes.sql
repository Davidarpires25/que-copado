-- 031_reclasificar_mermas_que_eran_ajustes.sql
--
-- Contexto: hasta ahora el dialogo de stock pedia un delta ("cuanto sumar o
-- restar") en vez del stock real contado. Para BAJAR stock, la unica opcion era
-- "Merma / Desperdicio", asi que durante el inventario del 10/09/2026 se
-- registraron 25 movimientos de tipo 'waste' que en realidad eran correcciones
-- de inventario: todos tienen como motivo "ajuste", "correccion" o "AJUSTE".
--
-- Ninguno es merma real. Se reclasifican a 'adjustment' para que el historial
-- de merma arranque limpio y la primera merma que se cargue sea de verdad la
-- primera.
--
-- Se filtra por motivo y no por fecha: es mas preciso y se auto-documenta.
-- Ningun reporte consume movement_type = 'waste' hoy, asi que el cambio no
-- altera ningun numero mostrado, solo la trazabilidad.

BEGIN;

UPDATE stock_movements
SET movement_type = 'adjustment'
WHERE movement_type = 'waste'
  AND lower(trim(reason)) IN ('ajuste', 'correccion', 'corrección');

COMMIT;
