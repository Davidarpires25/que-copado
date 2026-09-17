-- El alias y el CBU (migracion 040) dicen a donde va la plata, pero no a quien.
--
-- Cuando alguien transfiere, el banco le muestra el nombre del titular antes de
-- confirmar y le pide que verifique que es el correcto. Sin el nombre publicado,
-- el cliente ve aparecer una persona que no conoce y tiene que decidir solo si
-- esa es la cuenta del local o se equivoco de alias. La mitad frena ahi y
-- pregunta por WhatsApp, que es justo el ida y vuelta que la 040 vino a sacar.

alter table public.business_settings
  add column if not exists transfer_titular text;

comment on column public.business_settings.transfer_titular is
  'Nombre del titular de la cuenta. Es lo que el cliente ve en su banco al transferir: sin esto, paga a un alias y no sabe si es el del local.';
