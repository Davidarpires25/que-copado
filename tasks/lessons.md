# Lecciones

Patrones que costaron tiempo o errores, para no repetirlos.
Cada entrada: qué pasó, por qué, y la regla que queda.

---

## 1. Leer `tasks/` ANTES de diseñar cualquier cosa

**Qué pasó (2026-09-09).** Diseñé de cero la arquitectura de roles y permisos.
Recién al final apareció `tasks/plan-roles-y-permisos.md`, un plan de 518 líneas
que ya existía y que proponía un modelo distinto —rol como plantilla más
overrides granulares por usuario, con 22 claves `seccion.view` /
`seccion.manage`— en vez del enum de tres roles que construí.

**Por qué pasó.** Fui directo al código y a la base para entender el estado
actual. `tasks/` no es código, así que no apareció en ninguna búsqueda.

**Regla.** Al arrancar cualquier tarea no trivial, listar `tasks/` y `docs/`
antes de tocar nada. Si hay un plan sobre el tema, leerlo y decir explícitamente
si se sigue o por qué no.

---

## 2. Inspeccionar la base real, no deducirla de las migraciones

**Qué pasó (2026-09-09).** Escribí una migración de RLS mirando
`supabase/migrations/`. Al obtener acceso a Supabase resultó que el esquema base
se había creado desde el dashboard: había tres tablas y varias policies que no
figuraban en ningún archivo. Corrida como estaba, esa migración habría dejado la
impresora térmica muerta, dos tablas sin acceso, y productos y zonas
desactivados visibles en la tienda pública.

**Regla.** Las migraciones del repo son una hipótesis, no el estado. Antes de
escribir DDL que borre o reemplace algo, consultar `pg_tables` y `pg_policies`.
Y envolver toda migración destructiva en `BEGIN/COMMIT`.

---

## 3. Para un cambio de estilos, buscar la intención, no el rango de tonos

**Qué pasó (2026-09-09).** El admin estaba calibrado solo para tema oscuro.
Migré los tonos `-400` y `-500` a pares `-700 dark:-400`. Dos días después David
mandó una captura de un diálogo ilegible en tema claro: quedaban 62 clases con
`-200`/`-300` de texto y `-900`/`-950` de fondo. Hubo que hacer una tercera
pasada.

**Por qué pasó.** Busqué por rango de tonos en vez de por la pregunta correcta:
*¿qué clase asume un fondo oscuro?*

**Regla.** En una migración de estilos, definir el criterio por intención y
después derivar el patrón de búsqueda. Verificar la cobertura con un grep
negativo —"que no quede ninguna sin `dark:`"— y no con el conteo de reemplazos.

---

## 4. Verificar el efecto, no la sintaxis

**Qué pasó (2026-09-09).** Los 65 tokens de shadcn estaban definidos como
tripletes HSL crudos (`--primary: 18 100% 60%`) y mapeados sin `hsl()`. Todo
`bg-primary`, `bg-accent` y `border-border` producía un color inválido que el
navegador descartaba. Los switches y checkboxes nunca mostraban su estado
marcado, en 11 pantallas. Estuvo así hasta que un botón "no se veía" y hubo que
mirar el CSS compilado.

**Regla.** Cuando algo de estilos no se comporta como dice el código, leer el
CSS que sale del build (`.next/static/chunks/*.css`), no el que se escribió.
Vale también para RLS: probar con `SET LOCAL ROLE anon` y `ROLLBACK` en vez de
razonar sobre las policies.

---

## 5. Un patrón repetido puede ser una decisión, no un descuido

**Qué pasó (2026-09-09).** Reporté la tarjeta de KPI repetida en 9 archivos como
duplicación a limpiar. David la había reutilizado a propósito porque le gustaba
el diseño.

**Regla.** Extraer el patrón a un componente sigue estando bien, pero
encuadrarlo como "consolidar algo que ya usás", no como "arreglar duplicación".
La distinción importa para constantes de dominio que sí divergieron —métodos de
pago con tres paletas, estados de mesa con dos colores—: ahí sí hay bug, porque
el mismo dato se ve distinto según la pantalla.
