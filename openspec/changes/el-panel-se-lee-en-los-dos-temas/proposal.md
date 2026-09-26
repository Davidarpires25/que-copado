# Proposal

## Why

El panel tiene tema claro y oscuro, y en los dos hay texto que no se lee bien:
gris claro sobre blanco, gris oscuro sobre casi negro. Se midió con axe-core
(regla `color-contrast`, WCAG 2.2 AA) en todas las rutas del panel a 1280px,
en los dos temas: **161 textos** por debajo del mínimo de 4,5:1.

Es lo que quedó fuera de `el-panel-se-usa-sin-ver-y-sin-mouse`: la spec
`panel-accesible` dice que el contraste "queda fuera hasta que se revise la
paleta". Este cambio es esa revisión.

## Qué se rompe hoy en el local

No se cae nada: se lee mal. Con luz de día sobre la pantalla del mostrador, o
con la vista cansada al cierre, el texto secundario se pierde:

- **`--admin-text-faint`** —el gris de lo secundario: "0 pedidos", las fechas,
  los contadores, los textos de ayuda— da **2,33:1** en claro (`#94A3B8`) y
  **2,74:1** en oscuro (`#5A677D`). Son unos 70 de los 161 casos, en 120 usos.
- **`--admin-text-muted` con opacidad** (`/70`, `/60`) en encabezados de tabla
  y rótulos: el token cumple, pero al 70% baja a **3,39:1** en claro y
  **3,87:1** en oscuro. 56 casos, en 74 usos.
- **Texto blanco sobre el amarillo** del acento en tema claro: **1,59:1**. El
  período elegido en Analytics, entre otros (9 casos).
- Sueltos: el aviso naranja de recetas (`amber-600` sobre crema, 2,96:1), el
  "—" del mínimo de stock pintado con el color de placeholder (1,48:1), y un
  error de tipeo —`text-[var(--admin-text-muted)]q`— que deja "Agregar
  receta" sin su color.

La memoria del proyecto tenía anotado que `--admin-accent-text` daba 1,59:1 en
claro; eso ya se corrigió (hoy es `#0F172A`). Lo que queda es lo de arriba.

## What Changes

- `--admin-text-faint` pasa a un valor que cumple 4,5:1 en cada tema, sin
  llegar a `--admin-text-muted`: se conservan los tres niveles de texto
  (principal, secundario, terciario), más juntos.
  - Claro: `#94A3B8` → `#637185` (4,52:1 en el peor fondo; `muted` da 6,89).
  - Oscuro: `#5A677D` → `#7C8BA3` (4,54:1; `muted` da 5,57).
- Los `text-[var(--admin-text-muted)]/NN` dejan la opacidad: el tono lo da el
  token, no una transparencia que depende del fondo.
- El texto sobre el amarillo usa el color oscuro que ya está definido para eso
  (11,54:1), no blanco.
- Los sueltos, uno por uno, y el error de tipeo.
- El recorrido de axe de `admin-accesible.spec.ts` deja de apagar
  `color-contrast` y corre en los dos temas.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `panel-accesible`: se agrega el requisito de contraste; su propósito deja de
  excluirlo.

## Fuera de alcance

- **La tienda pública**: tiene su propia paleta (naranja/ámbar) y no se midió.
- **Rediseñar la paleta**: se mueven los tonos lo mínimo para cumplir; los
  colores de marca (`--admin-accent`) no cambian.
- **Estados de las tablas**: `Bajo`, `Agotado`, etc. conservan su color y su
  texto (`tablas-del-admin`). Si alguno no cumpliera, se oscurece su tono
  dentro del mismo color, no se cambia de color.
- **Texto deshabilitado y placeholders de campos**: WCAG los exceptúa. Un
  placeholder que se usa como dato (el "—" del mínimo) no es placeholder y sí
  entra.
- **Contraste de componentes no textuales** (bordes de campos, íconos): WCAG
  1.4.11 pide 3:1; se mide en otro cambio si hace falta.

## Impact

- **Solo este repo.** No toca AgentePOS.
- `app/globals.css` (dos tokens, uno por tema) y unos 74 usos de
  `muted/NN` repartidos en `app/admin` y `components/admin`, más los sueltos.
- **Cambia cómo se ve el panel**: el texto terciario se oscurece en claro y se
  aclara en oscuro. Es el objetivo, pero es visible en casi todas las
  pantallas: antes de cerrar, David mira capturas de antes y después en los dos
  temas.
