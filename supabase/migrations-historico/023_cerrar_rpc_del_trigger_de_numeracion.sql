-- assign_order_number es una funcion de trigger, no una API. PostgREST publica
-- todo lo que este en `public` con EXECUTE para anon/authenticated, asi que
-- quedaba expuesta en /rest/v1/rpc/assign_order_number como SECURITY DEFINER.
--
-- Llamarla fuera de un trigger falla igual ("can only be called as a trigger"),
-- pero una funcion definer publicada sin motivo es superficie de mas, y ensucia
-- los advisors donde despues hay que distinguir el ruido de lo que importa.
revoke execute on function public.assign_order_number() from anon, authenticated, public;
