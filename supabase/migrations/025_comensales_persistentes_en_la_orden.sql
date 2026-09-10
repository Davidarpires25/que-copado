-- Los comensales de una mesa existian solamente como una etiqueta en los items
-- (`order_items.sale_tag`) mas un useState en el panel. Un comensal recien
-- creado, sin items todavia, no estaba en ningun lado: al tocar "Agregar Items"
-- el panel se desmonta —esa vista lo reemplaza— y al volver montaba de cero,
-- asi que sobrevivian unicamente los que ya tenian algo pedido. Tambien se
-- perdian recargando la pagina o desde otro dispositivo.
--
-- Un comensal es parte del pedido: la mesa se sento, hay tres personas, y eso
-- vale aunque todavia no hayan pedido nada.

alter table public.orders
  add column if not exists sale_tags text[] not null default '{}';

-- Backfill: los comensales que hoy se pueden deducir de los items ya cargados,
-- para que las mesas abiertas no pierdan lo que tienen.
update public.orders o
   set sale_tags = coalesce(t.tags, '{}')
  from (
    select oi.order_id, array_agg(distinct oi.sale_tag) as tags
      from public.order_items oi
     where oi.sale_tag is not null
       and oi.status is distinct from 'cancelado'
     group by oi.order_id
  ) t
 where t.order_id = o.id
   and o.sale_tags = '{}';
