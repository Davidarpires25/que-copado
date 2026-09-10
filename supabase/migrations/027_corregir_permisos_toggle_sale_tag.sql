-- La migracion 026 dejo esta funcion como SECURITY DEFINER y le revoco EXECUTE
-- a `authenticated`, con el comentario "la llama una server action con la clave
-- de servicio". Eso es falso en este repo: `createAdminClient()` usa la clave
-- ANON con las cookies del usuario —lo dice su propio comentario— asi que las
-- server actions corren como `authenticated` y con RLS activo.
--
-- Resultado: le saque el permiso al unico rol que la iba a llamar, y crear un
-- comensal fallaba con 42501 permission denied for function.
--
-- Y siendo que el cliente respeta RLS, la funcion no necesita privilegios
-- elevados: con SECURITY INVOKER la gobierna la policy "operacion actualiza
-- pedidos", que ya exige puede_operar(). Un definer aca era ademas un agujero:
-- cualquier usuario autenticado podia tocar los comensales de cualquier pedido,
-- tuviera o no permiso de operacion.

create or replace function public.toggle_order_sale_tag(
  p_order_id uuid,
  p_tag      text,
  p_agregar  boolean
)
returns void
language sql
security invoker
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

grant execute on function public.toggle_order_sale_tag(uuid, text, boolean)
  to authenticated;

-- El checkout publico no tiene nada que hacer aca.
revoke execute on function public.toggle_order_sale_tag(uuid, text, boolean)
  from anon;

notify pgrst, 'reload schema';
