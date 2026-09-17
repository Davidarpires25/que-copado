# Proposal

## Why

No hay dónde probar. Cada verificación real de esta sesión se hizo contra la base
de producción con el local operando: tres pedidos de prueba creados y borrados a
mano, y una compra que quedó sin verificar porque cargarla habría ensuciado el
historial de stock. Salió bien las tres veces, pero es exactamente la clase de
cosa que un día sale mal con gente esperando la comida.

Y al ir a armarlo apareció algo peor: **el repositorio ya no puede recrear la base
de datos.** Producción tiene 48 migraciones aplicadas y `supabase/migrations/`
tiene 41 archivos, pero no son las mismas: 16 migraciones aplicadas no tienen
archivo y 9 archivos nunca quedaron registrados como aplicados. Verificado tabla
por tabla, ninguna migración del repo crea:

- `cash_register_sessions` — la caja
- `restaurant_tables` — las mesas
- `payment_splits` — los pagos divididos
- `ingredient_categories` — las categorías de insumos

Un `db reset` sobre lo que hay en el repo no levanta el sistema: levanta una
versión vieja sin caja ni mesas. Eso deja de ser un problema de testing y pasa a
ser uno de recuperación: si hoy hubiera que reconstruir la base, no se podría
desde el repositorio.

## What Changes

**Primero, recuperar la línea base del esquema.**

- Se incorpora el CLI de Supabase al flujo del proyecto y se crea `supabase/config.toml`.
- Se trae desde producción un volcado de **estructura, sin datos**, que pasa a ser
  la migración base del repo. A partir de ahí, `supabase/migrations/` vuelve a
  describir la base real.
- Las migraciones previas quedan como historial, no como fuente de verdad: se
  archivan sin borrarlas, porque cuentan por qué el esquema es como es.

**Después, el entorno local.**

- `supabase start` levanta Postgres, auth y storage en Docker; `supabase db reset`
  aplica la base más las migraciones y deja la base lista.
- Un **seed** siembra lo mínimo para operar: negocio abierto con horarios y datos
  de transferencia, categorías, productos elaborados y de reventa, ingredientes
  con stock y sus recetas, zonas de reparto, mesas y un usuario admin de prueba
  con credenciales conocidas.
- `.env.local.example` documenta cómo apuntar la app a la base local, y el README
  explica el ciclo de levantarla y reiniciarla.

**Lo que habilita:** verificar en el navegador contra datos que se pueden ensuciar.
Las cuatro tareas que quedaron colgando en `registrar-compra-en-su-propia-pagina`
se cierran ahí, sin cargar compras inventadas en el inventario real.

## Capabilities

### New Capabilities

Ninguna. Este cambio no altera lo que el sistema hace para quien lo usa: agrega
herramientas de desarrollo y devuelve al repo la capacidad de recrear su base. Se
marca `skip_specs: true`.

Queda anotado para cuando exista la costumbre: si alguna vez se escribe una
capability sobre respaldo y recuperación, la línea base del esquema es parte de
esa historia.

### Modified Capabilities

Ninguna.

## Impact

**Repos:** lidera `que-copado`. `AgentePOS` usa el mismo Supabase y se beneficia
—podrá correr contra la base local—, pero no se toca en este cambio.

**Nuevo:**

- `supabase/config.toml`, `supabase/seed.sql`
- una migración de línea base con el esquema volcado de producción
- `.env.local.example` y la sección del README

**Modificado:** `supabase/migrations/` se reorganiza; `.gitignore` para lo que
genere el CLI; `package.json` si conviene un atajo tipo `npm run db:local`.

**Sin cambios:** nada del código de la aplicación. La app no se entera de contra
qué base corre: eso lo deciden las variables de entorno.

**Producción:** se le hace **solo lectura**. El volcado de estructura no escribe
nada, y el entorno local es otra base.

## Fuera de alcance

- **Copiar datos de producción a local.** El seed es inventado a propósito: datos
  reales de clientes en una base de desarrollo es un problema que no queremos.
- **Reconciliar el historial migración por migración.** No se va a averiguar cuál
  de las 16 se aplicó a mano ni en qué orden: la línea base hace innecesaria esa
  arqueología, y el historial viejo queda archivado.
- **CI.** Correr esto en un pipeline es un paso natural después, pero primero
  tiene que funcionar en la máquina de quien desarrolla.
- **Ramas de Supabase** (el entorno remoto pago). Se evalúa si el local no
  alcanza.
