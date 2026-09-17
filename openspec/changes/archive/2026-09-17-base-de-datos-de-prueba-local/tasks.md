# Tasks

> Todo en `que-copado`. `AgentePOS` se beneficia pero no se toca.
>
> **Producción se toca solo para leer.** El único contacto es el volcado de
> estructura de la tarea 2.1, que no escribe nada. Todo lo demás ocurre contra la
> base local.

## 1. El CLI y el proyecto local

- [x] 1.1 Instalar el CLI de Supabase sin permisos de sistema —el mismo criterio
      que se usó con OpenSpec: `npm install -g --prefix ~/.local`, que ya está en
      el PATH. Verificación: `supabase --version` responde.
- [x] 1.2 `supabase init` para crear `supabase/config.toml`, cuidando que no pise
      `supabase/migrations/`. Verificación: existe el archivo y `git status` no
      muestra migraciones borradas.
- [x] 1.3 Agregar al `.gitignore` lo que genere el CLI y que no va al repo
      (`supabase/.temp/`, `supabase/.branches/`). Verificación: `git status`
      queda limpio después de un `supabase start`.

## 2. La línea base del esquema

- [x] 2.1 Volcar la estructura de producción —**sin datos**— a un archivo de
      migración de línea base. Verificación: el archivo contiene las cuatro
      tablas que hoy ninguna migración crea (`cash_register_sessions`,
      `restaurant_tables`, `payment_splits`, `ingredient_categories`), y no
      contiene ningún `INSERT` de datos del negocio.
- [x] 2.2 Mover las migraciones previas a la línea base fuera del camino del CLI,
      conservándolas en el repo como historial. Verificación: `supabase db reset`
      no las aplica y siguen versionadas en git.
- [x] 2.3 Dejar en su lugar las migraciones posteriores a la línea base, si el
      volcado no las incluye. **No hizo falta ninguna:** el volcado trajo el
      esquema completo, incluidas las migraciones 031-041. Sí hizo falta una
      migración por lo que vive FUERA de `public` y el volcado no cubre —el
      trigger `on_auth_user_created` sobre `auth.users` y el bucket de imágenes—,
      en `00000000000001_lo_que_vive_fuera_de_public.sql`.

## 3. El entorno local corriendo

- [x] 3.1 `supabase start` levanta el stack. Verificación: `supabase status`
      lista los servicios y la API responde en su puerto.
- [x] 3.2 `supabase db reset` reconstruye la base desde cero. Verificación:
      termina sin error.
- [x] 3.3 **Comparar el esquema local contra producción** y no darlo por bueno
      hasta que coincidan: tablas, columnas, funciones, triggers, políticas de
      RLS y qué tablas están publicadas en realtime. **Resultado:** mismo
      inventario de 358 objetos y misma huella md5 `fe19c086…` en las dos bases.
      La comparación encontró lo que faltaba fuera de `public` (ver 2.3) y se
      corrigió antes de dar esto por bueno.

## 4. Los datos de prueba

- [x] 4.1 Escribir `supabase/seed.sql` con lo mínimo para operar: negocio abierto
      con horarios y datos de transferencia, categorías, productos elaborados y
      de reventa, ingredientes con stock, recetas que los usen, zonas de reparto
      y mesas. Verificación: después de un `db reset`, consultar cada tabla y ver
      las filas.
- [x] 4.2 Crear en el seed un usuario admin de prueba con credenciales conocidas
      y su fila en `profiles` con rol de administrador. Verificación: iniciar
      sesión en `/admin/login` contra la base local.
- [x] 4.3 Documentar las credenciales de prueba en el README, junto a la
      aclaración de que solo sirven contra localhost. Verificación: alguien que
      no participó de esto puede entrar siguiendo el README.

## 5. Apuntar la app

- [x] 5.1 Crear `.env.local.example` con las variables que imprime
      `supabase start`, sin escribir nunca `.env.local` automáticamente.
      Verificación: el archivo existe y `.env.local` sigue siendo el de
      producción, intacto.
- [x] 5.2 Sección en el README: levantar, reiniciar, bajar, y cómo alternar entre
      la base local y la de producción sin confundirse. Verificación: seguir esos
      pasos de cero y llegar al panel con los datos del seed.
- [x] 5.3 Atajos en `package.json` (`db:start`, `db:reset`, `db:stop`) si
      simplifican. Verificación: cada uno hace lo que dice su nombre.

## 6. Que sirva para lo que se hizo

- [x] 6.1 Cerrar contra la base local las tareas que quedaron colgando en
      `registrar-compra-en-su-propia-pagina`: la pasada en navegador del
      formulario de compra, el estado vacío, y una compra registrada de verdad
      con sus `stock_movements` verificados. Verificación: esas tareas quedan
      marcadas en su propio `tasks.md`, con lo observado.
- [x] 6.2 Recorrer un pedido de punta a punta en local —abrir caja, cargar
      mostrador, cobrar— para confirmar que el seed alcanza. **Resultado:**
      pedido #1 en `pagado`, sesión con \$8.000 vendidos y 1 pedido, y el stock
      descontado por receta con la merma aplicada (Cheddar 5 → 4,9579 por 0,04 kg
      con 5%).
