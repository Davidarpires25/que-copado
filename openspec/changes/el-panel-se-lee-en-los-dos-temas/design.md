# Design

## Context

Ver `proposal.md` para el relevamiento. Lo que condiciona el cómo:

- Los colores del panel son tokens en `app/globals.css`: `:root` para el tema
  claro y `html.admin-dark` para el oscuro. Un token corregido arregla todos
  sus usos a la vez.
- Los fondos donde aparece texto terciario, medidos por axe: en claro
  `#FFFFFF`, `#F3F4F8`, `#F8F8FB`, `#FFF5E5`, `#FFF9E6`; en oscuro `#0F1117`
  y `#1C2333`.
- El texto sobre el amarillo del acento es `text-black` en 60 lugares. El
  único que no lo sigue es `period-selector.tsx`, con
  `text-[var(--admin-surface)]` (blanco en claro).
- Hay tres niveles de texto a propósito: `--admin-text`, `--admin-text-muted`
  y `--admin-text-faint`.

## Goals / Non-Goals

**Goals:**
- Cumplir el requisito "El texto se lee en los dos temas" de
  `panel-accesible`.
- Moverse lo mínimo: tokens antes que usos, el mismo tono de gris más oscuro
  (o más claro en oscuro), sin tocar los colores de marca.

**Non-Goals:**
- Rediseñar la paleta o unificar grises.
- La tienda pública.

## Decisions

### 1. `--admin-text-faint`: el valor más cercano al actual que cumple

Se interpola entre el `faint` de hoy y `muted` y se toma el primer valor que
da 4,5:1 contra **el peor** de los fondos de su tema:

| Tema | Hoy | Nuevo | Peor fondo | `muted` |
|---|---|---|---|---|
| Claro | `#94A3B8` (2,33) | `#637185` (4,52) | `#F3F4F8` | `#475569` (6,89) |
| Oscuro | `#5A677D` (2,74) | `#7C8BA3` (4,54) | `#1C2333` | `#8B9BB4` (5,57) |

`faint` sigue siendo más tenue que `muted` en los dos temas: se conserva la
jerarquía, con menos distancia.

**Alternativa descartada: eliminar `faint` y usar `muted`.** Cumple con más
margen, pero borra un nivel que el panel usa en 120 lugares para decir "esto
es de fondo".

**Alternativa descartada: corregir uso por uso.** Es un problema del token,
no de cada pantalla; 120 cambios para lo que es una línea por tema.

### 2. `muted` con opacidad pasa a `faint`

Los `text-[var(--admin-text-muted)]/NN` (74 usos) querían un gris más tenue
que `muted`: eso es exactamente `faint`. Pasan a
`text-[var(--admin-text-faint)]`, que ahora cumple. Así se ven casi igual que
hoy y dejan de depender de la transparencia sobre cada fondo.

Solo los usos en `text-`; una opacidad en un fondo o un borde no es texto y no
entra.

### 3. Texto sobre el acento: `text-black`

`period-selector.tsx` pasa de `text-[var(--admin-surface)]` a `text-black`,
como los otros 60 usos. En oscuro no cambia nada visible (el texto ya era
oscuro).

### 4. Los sueltos

- Aviso de recetas: `text-amber-600` → `text-amber-700` en claro (sigue
  ámbar); `dark:text-amber-400` no cambia.
- "—" del mínimo de stock: de `--admin-text-placeholder` a `--admin-text-faint`.
  Muestra un dato (no hay mínimo), no es un placeholder.
- `text-[var(--admin-text-muted)]q` → `text-[var(--admin-text-muted)]`.
- Placeholder del slug de categoría (4,42:1 sobre `#F8F8FB`): es un
  placeholder real y WCAG lo exceptúa, pero está a 0,08 del mínimo; se mide de
  nuevo después de los tokens y se decide ahí.
- Los que queden después de 1–3 se corrigen con el mismo criterio: el tono más
  cercano que cumple, dentro del mismo color.

### 5. Test

`e2e/admin-accesible.spec.ts` deja de apagar `color-contrast` y agrega la
dimensión del tema: el recorrido corre en claro y en oscuro (el tema se fija
con `localStorage['admin-theme']` antes de cargar, como en las capturas). Son
cuatro pasadas en lugar de dos (390/1280 × claro/oscuro), unos 4 minutos.

Por la lección 21, se corre primero contra el código de hoy: tiene que fallar
con `color-contrast` en los dos temas.

## Risks / Trade-offs

- **[Se ve distinto]** → Es el objetivo, pero es visible en casi todas las
  pantallas. Capturas antes/después de las pantallas más cargadas (Dashboard,
  Productos, Stock, Caja, Analytics) en los dos temas, mostradas a David antes
  de cerrar.
- **[Menos distancia entre secundario y terciario]** → En oscuro `faint`
  (`#7C8BA3`) y `muted` (`#8B9BB4`) quedan cerca. Si en las capturas no se
  distinguen donde importa, se oscurece `muted` en oscuro para abrir la
  distancia, no se baja `faint` debajo del mínimo.
- **[`muted/NN` que no era terciario]** → Algún uso puede haber querido
  "`muted` un poco más suave" y no "terciario". Se revisa en las capturas.

## Migration Plan

Sin migración. Rollback revirtiendo el commit.
