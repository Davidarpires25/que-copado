-- 035_el_bridge_marca_sus_jobs.sql
--
-- El print-bridge imprimia pero no lograba marcar los jobs: desde el 28/05 todo
-- quedo en 'pending'. Como al arrancar procesa los pendientes, cada reinicio de
-- la PC del local reimprimia la cola entera.
--
-- La causa no era el WITH CHECK de "bridge marca impreso" —'printed' cumple la
-- condicion— sino que en Postgres la fila RESULTANTE de un UPDATE tiene que
-- seguir siendo visible por las policies SELECT del rol. La policy de anon es
-- `status = 'pending'`, asi que al pasar a 'printed' la fila desaparece de su
-- vista y el UPDATE se rechaza con "new row violates row-level security policy".
--
-- Ampliar el SELECT de anon a `using (true)` lo arreglaria, pero expondria
-- todos los print_jobs —que llevan items, totales y nombres de clientes— a
-- cualquiera con la anon key, que es publica. En vez de eso, una funcion
-- `security definer` que hace exactamente una cosa y nada mas.

BEGIN;

create or replace function public.marcar_print_job(
  p_id     uuid,
  p_status text,
  p_error  text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- El bridge solo puede cerrar un job, nunca reabrirlo ni tocar su contenido.
  if p_status not in ('printed', 'error') then
    raise exception 'Estado no valido para un print job: %', p_status;
  end if;

  update print_jobs
     set status = p_status,
         error_msg = case when p_status = 'error' then p_error else null end
   where id = p_id
     and status = 'pending';   -- idempotente: un job ya cerrado no se vuelve a tocar

  return found;
end;
$$;

revoke all on function public.marcar_print_job(uuid, text, text) from public;
grant execute on function public.marcar_print_job(uuid, text, text) to anon, authenticated;

COMMIT;
