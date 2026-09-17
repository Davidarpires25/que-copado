-- El checkout ofrece "Transferencia" con la leyenda "Te enviamos los datos", y
-- esos datos no existen en ningun lado del sistema: se los pasa una persona por
-- WhatsApp, uno por uno, cada vez. El cliente que elige transferencia se queda
-- esperando a que alguien le conteste para poder pagar.
--
-- Van en business_settings y no en una constante del codigo porque el local los
-- tiene que poder cambiar desde su panel: una cuenta se cambia, y hacerlo no
-- deberia necesitar un despliegue.
--
-- Nulo o vacio significa "no configurado", y ahi el checkout no muestra la
-- seccion en vez de mostrarla vacia. El sistema tiene que andar antes de que
-- alguien cargue la cuenta.

alter table public.business_settings
  add column if not exists transfer_alias text,
  add column if not exists transfer_cbu   text;

comment on column public.business_settings.transfer_alias is
  'Alias de la cuenta para pagos por transferencia. Null o vacio = no configurado: el checkout no muestra nada.';
comment on column public.business_settings.transfer_cbu is
  'CBU/CVU de la cuenta para pagos por transferencia. Null o vacio = no configurado.';
