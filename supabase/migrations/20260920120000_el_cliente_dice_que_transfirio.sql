-- El cliente dice que transfirió, y alguien tiene que verificarlo.
--
-- Por WhatsApp el agente le pasa el alias, el cliente transfiere y avisa. Eso
-- no es un cobro: nadie del local miró todavía si la plata entró. Hasta que
-- alguien la vea, el pedido sigue exactamente donde estaba.
--
-- Por eso una columna aparte y no un `status` nuevo. El estado del pedido
-- gobierna la cocina y la caja --`pagado` descuenta stock, cierra el arqueo,
-- sale del listado de pendientes-- y una transferencia que el cliente *dice*
-- haber hecho no puede disparar nada de eso. Son dos preguntas distintas:
-- "¿en qué anda este pedido?" y "¿alguien dijo que ya pagó?".
--
-- Un timestamp y no un booleano: saber **cuándo** avisó es parte de lo que
-- necesita quien verifica --hace dos minutos o hace una hora cambia qué
-- esperar del banco-- y no cuesta una columna más.

alter table public.orders
  add column if not exists transfer_claimed_at timestamptz;

comment on column public.orders.transfer_claimed_at is
  'Cuándo el cliente dijo haber transferido. No es un cobro: el pedido sigue en su estado hasta que alguien del local verifique que la plata entró.';

-- Se consulta "qué transferencias hay por verificar", que son pocas sobre el
-- total de pedidos.
create index if not exists idx_orders_transfer_claimed
  on public.orders (transfer_claimed_at)
  where transfer_claimed_at is not null;
