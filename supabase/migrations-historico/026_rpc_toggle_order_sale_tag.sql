-- Agregar o sacar un comensal sin leer-modificar-escribir, para que dos
-- dispositivos tocando la misma mesa no se pisen.
create or replace function public.toggle_order_sale_tag(
  p_order_id uuid,
  p_tag      text,
  p_agregar  boolean
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders
     set sale_tags = case
           when p_agregar then
             case when p_tag = any(sale_tags) then sale_tags
                  else array_append(sale_tags, p_tag) end
           else array_remove(sale_tags, p_tag)
         end,
         updated_at = now()
   where id = p_order_id;
$$;

-- La llama una server action con la clave de servicio. No tiene por que estar
-- publicada en /rest/v1/rpc para el navegador.
revoke execute on function public.toggle_order_sale_tag(uuid, text, boolean)
  from anon, authenticated, public;
