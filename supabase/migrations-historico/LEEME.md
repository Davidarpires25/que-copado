# Historial de migraciones anterior a la línea base

Estos archivos **ya no los aplica el CLI**: viven fuera de `supabase/migrations/`
a propósito. Se conservan porque cuentan por qué el esquema es como es, y porque
varios traen el razonamiento del cambio escrito arriba.

## Por qué dejaron de ser la fuente de verdad

Producción tenía 48 migraciones aplicadas y esta carpeta 41 archivos, y no eran
las mismas: 16 aplicadas no tenían archivo y 9 archivos nunca quedaron
registrados como aplicados. Verificado tabla por tabla, ninguna de estas
migraciones crea `cash_register_sessions`, `restaurant_tables`, `payment_splits`
ni `ingredient_categories`.

O sea que reconstruir la base desde acá no daba el sistema: daba una versión
vieja sin caja ni mesas. Viene de cuando los cambios se aplicaban desde el editor
SQL de Supabase, sin dejar archivo.

La línea base en `supabase/migrations/` es un volcado de la estructura real de
producción y reemplaza a todo esto como punto de partida.

## Qué hacer con ellas

Leerlas cuando haga falta entender una decisión vieja. No editarlas: lo que
cambie el esquema de ahora en más va como migración nueva sobre la línea base.
