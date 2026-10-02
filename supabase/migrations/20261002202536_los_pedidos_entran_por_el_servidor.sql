-- Un pedido solo entra por el servidor o por el personal (change
-- los-pedidos-entran-por-el-servidor, spec pedidos-seguros).
--
-- Con la clave pública —la del navegador— cualquiera podía insertar en
-- `orders` un pedido con el total, el estado y el turno que quisiera, llamar a
-- `crear_pedido_remoto` directo por la API, o escribir el historial de
-- estados. Todo eso se saltea lo que valida `createOrder` en el servidor
-- (precios, envío, horario, límite y stock). Lo marcó la revisión de seguridad
-- de Supabase el 2026-10-02.
--
-- La tienda y el agente crean sus pedidos con `createOrder`, que ahora llama a
-- la función con la clave de servicio. La caja inserta con la sesión del
-- cajero: esa vía queda, exigiendo poder operar.
--
-- Se aplica DESPUÉS de desplegar ese código: con el código viejo, la tienda no
-- podría crear pedidos.

drop policy if exists "web crea pedidos" on public.orders;
create policy "operacion crea pedidos" on public.orders
  for insert to authenticated with check (public.puede_operar());

drop policy if exists "web escribe historial estado" on public.order_status_history;
create policy "operacion escribe historial estado" on public.order_status_history
  for insert to authenticated with check (public.puede_operar());

revoke execute on function public.crear_pedido_remoto(text, text, text, jsonb, numeric, text, text, jsonb, numeric, uuid, text)
  from public, anon, authenticated;
grant execute on function public.crear_pedido_remoto(text, text, text, jsonb, numeric, text, text, jsonb, numeric, uuid, text)
  to service_role;
