# Design

## Context

Ver `proposal.md` — Why. Lo que condiciona todo el diseño es el estado del
historial de migraciones, así que conviene tenerlo preciso:

- Producción: 48 migraciones registradas en `supabase_migrations.schema_migrations`.
- Repo: 41 archivos en `supabase/migrations/`.
- 16 aplicadas sin archivo, 9 archivos sin registro.
- Ninguna migración del repo crea `cash_register_sessions`, `restaurant_tables`,
  `payment_splits` ni `ingredient_categories`.

Las migraciones nuevas —de la 031 en adelante— sí están completas y ordenadas: se
escribieron como archivo y se aplicaron con el mismo contenido. El agujero es
histórico, de cuando los cambios se aplicaban desde el editor SQL de Supabase.

Docker 29.7.2 está instalado y corriendo. El CLI de Supabase no está instalado y
no existe `supabase/config.toml`.

## Goals / Non-Goals

**Goals**

- Que `supabase db reset` en limpio produzca el esquema de producción, no una
  versión vieja.
- Que levantar el entorno sea un comando y no un instructivo.
- Que el seed alcance para operar el POS: abrir caja, cargar un pedido, cobrarlo,
  registrar una compra.

**Non-Goals**

- Que el local sea idéntico a producción en datos. Alcanza con que sea
  representativo.
- Resolver el historial de migraciones viejo. Se archiva, no se arregla.

## Decisions

### La línea base sale de un volcado de estructura de producción

`supabase db dump` contra producción, solo estructura, y ese archivo pasa a ser la
primera migración del repo.

**Alternativa considerada:** escribir a mano las 16 migraciones faltantes a partir
del esquema actual. Es semanas de arqueología para llegar al mismo esquema, con
más chances de equivocarse. El historial de por qué cada tabla es como es no se
pierde: las migraciones viejas quedan archivadas y legibles.

**Alternativa considerada:** `supabase db pull`, que genera la migración y además
marca el historial remoto como sincronizado. Es lo mismo con un efecto extra sobre
producción, y la regla de este cambio es que producción se toca solo para leer. Si
al implementarlo `db pull` resulta ser el único camino práctico, se decide ahí y se
deja escrito qué escribió.

**Riesgo asumido:** la línea base va a traer el esquema tal como está hoy,
incluidas las cosas que ya sabemos que están mal —por ejemplo que `anon` no puede
leer `ingredients`, que hace que el control de stock de elaborados no valide nada
en el checkout web—. Eso es correcto: la línea base tiene que reproducir lo que
hay, no lo que nos gustaría. Arreglarlo es otro cambio, y ahora va a poder
probarse en local antes de tocar producción.

### El seed es un archivo SQL, no un script de la aplicación

`supabase/seed.sql` corre solo con cada `db reset`. Sin dependencias del código de
la app, sin orden de ejecución que recordar.

**Alternativa considerada:** un script en TypeScript que use las server actions
para crear los datos "como los crearía un usuario". Más fiel, pero necesita la app
levantada y sesión iniciada, que es justo lo que se quiere poder probar. El seed
tiene que existir antes que eso.

### El usuario admin de prueba se crea en el seed con credenciales conocidas

Sin usuario no se entra al panel, y sin entrar no se prueba nada. Va con una
contraseña fija y documentada, porque es una base local descartable.

**Lo que no se hace:** reusar un usuario real ni copiar `auth.users` de
producción. Las credenciales del seed solo sirven contra localhost.

### La app apunta a local por variables de entorno, sin cambiar código

`supabase start` imprime la URL y las claves del entorno local; van en un
`.env.local` propio. La app no distingue una base de otra, que es lo que permite
probar el código real.

**Riesgo:** pisar el `.env.local` que apunta a producción y no darse cuenta.
Mitigación en la tarea correspondiente: el ejemplo se llama `.env.local.example`,
nunca se escribe `.env.local` automáticamente, y el README dice cómo alternar.

## Risks / Trade-offs

**El volcado trae objetos que el CLI no puede recrear igual** (extensiones,
políticas de storage, configuración de auth) → Se verifica comparando el esquema
local contra el remoto después del primer `db reset`, tabla por tabla y función
por función. Si algo falta, se agrega a la línea base.

**El seed queda viejo cuando cambie el esquema** → Vive en el repo y se toca en el
mismo cambio que rompe algo. Cuando un `db reset` falle, falla ruidoso y en local.

**Arrancar Docker consume máquina** → El stack de Supabase son varios contenedores.
Se levanta cuando se necesita y se baja con `supabase stop`; el README lo dice.

## Migration Plan

Nada que migrar en producción: el cambio agrega archivos al repo y crea una base
local. Producción se lee una vez, para el volcado.

Para revertir alcanza con borrar la base local (`supabase stop --no-backup`) y
revertir el commit.

## Open Questions

- **Dónde quedan las migraciones viejas**: una carpeta `supabase/migrations/archivo/`
  dentro del repo, o fuera de `supabase/` para que el CLI no las mire. Se resuelve
  al implementar, mirando qué ignora el CLI; no cambia el alcance ni las tareas.
