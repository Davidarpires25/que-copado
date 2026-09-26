# Design

## Context

Ver `proposal.md` para el relevamiento. Lo que condiciona el cómo:

- La auditoría se hizo con `axe-core` 4.11, que ya está en `node_modules` como
  dependencia de `eslint-plugin-jsx-a11y`. La app tiene una CSP que bloquea
  scripts inyectados, así que la auditoría corre con `bypassCSP` en el
  contexto de Playwright; la app no se toca.
- Los botones sin nombre salen de pocos patrones: botones de ícono envueltos
  en un `Tooltip` (el tooltip no es nombre accesible), interruptores y casillas
  de Radix sin etiqueta asociada, y `SelectTrigger` de Radix con un `<Label>`
  al lado pero sin `id`/`htmlFor`.
- El proyecto ya tiene un diálogo lateral accesible: `components/ui/sheet.tsx`
  es un `Dialog` de Radix, y lo usa la tienda (`cart-drawer.tsx`).
- React 19 soporta el atributo `inert`.
- La repetición de diseños en el panel es deliberada: no se extraen componentes
  nuevos para agrupar patrones repetidos sin preguntar.

## Goals / Non-Goals

**Goals:**
- Cumplir `specs/panel-accesible` y el requisito modificado de
  `specs/panel-en-el-celular`.
- Que con mouse y a la vista el panel quede igual, salvo las flechas de
  reordenar categorías (de 18 a 24px) y el subrayado de un link.
- Dejar un test con axe que corra en la suite y otro con teclado para lo que
  axe no ve.

**Non-Goals:**
- Contraste de colores (cambio aparte).
- Un componente `<BotonIcono>` que envuelva tooltip + botón. Ver Decisión 1.
- Reescribir el mapa de zonas.

## Decisions

### 1. Botones de ícono: `aria-label` igual al tooltip, en cada lugar

Cada botón de un solo ícono lleva `aria-label` con el mismo texto que su
tooltip ("Editar", "Eliminar", "Imprimir ticket"). Donde hay una fila con
nombre, el label lo incluye cuando ayuda a distinguir: "Editar Mesa 2".

**Alternativa descartada: un `<BotonIcono label icon>` que arme el tooltip y
el botón.** Son unos 32 lugares con variaciones reales de color y tamaño, y la
repetición de diseños es deliberada en el panel. Un atributo por lugar es el
cambio mínimo; si más adelante David quiere el componente, el label ya está.

**Alternativa descartada: que `TooltipTrigger` copie el contenido como
`aria-label` automáticamente.** Radix no lo hace, y hacerlo a mano en el
componente base obliga a leer el texto de `TooltipContent` desde el trigger:
acopla dos piezas que hoy son independientes, para ahorrar un atributo.

### 2. Interruptores, casillas y selectores: asociar la etiqueta que ya se ve

- `SelectTrigger`: se le da `id` y el `<Label>` de al lado recibe `htmlFor`. Son
  16 lugares.
- `Switch` junto a un texto ("Visible en el menú"): `aria-labelledby` al texto
  (con `id`), o `aria-label` si el texto no está a mano. Son 13.
- `Checkbox` de selección en tablas: `aria-label` con el nombre de la fila
  ("Seleccionar Hamburguesa simple") y "Seleccionar todos" en el encabezado.
- Campos de la ficha técnica y el selector de rol: `aria-label`.

Se prefiere asociar lo visible antes que duplicar el texto en `aria-label`: si
alguien cambia la etiqueta visible, el nombre accesible cambia con ella.

### 3. Filas de medio de pago: un botón real dentro de la fila

La fila (`Row` en `payment-methods.tsx`) contiene a veces un botón del monto,
así que no puede ser ella misma un `<button>` (no se anidan botones). La fila
pasa a tener un `<button type="button">` que ocupa la zona del nombre y el
indicador, con `aria-pressed` en el modo de varios medios y `role="radio"` +
`aria-checked` dentro de un `role="radiogroup"` en el selector de uno solo. El
botón del monto queda al lado, como hermano. Con mouse se sigue pudiendo
tocar toda la fila: el `onClick` del contenedor se queda, y el del botón hace
lo mismo.

### 4. Filas de Pedidos: un botón en la primera celda

La fila entera abre el detalle con click. Una `<tr>` con `role="button"` rompe
la semántica de tabla, así que la primera celda (el número de pedido) pasa a
ser un `<button>` "Ver pedido #45" que hace lo mismo que el click de la fila.
Con teclado se llega a ese botón; con mouse, la fila sigue respondiendo
entera.

### 5. Paneles laterales: `Sheet` de Radix

Se aplica a los tres paneles armados a mano con framer-motion: el menú del
celular (`MobileSidebar`), el detalle de un pedido (`OrderDetailsDrawer`) y el
detalle de un arqueo (en `caja-historial.tsx`). Los dos detalles aparecieron al
implementar —se abren con Enter desde el cambio anterior, pero el foco quedaba
atrás— y David decidió sumarlos. Lo que sigue vale para los tres.

#### El menú

`MobileSidebar` hoy es un `motion.aside` con un fondo que cierra al tocar. Pasa
a ser `Sheet` + `SheetContent side="left"` con el mismo contenido y clases:
Radix da el rol de diálogo, el nombre (con `SheetTitle` visualmente oculto),
el foco atrapado, Escape y la vuelta del foco al botón. La animación pasa a ser
la de `SheetContent` (deslizar desde la izquierda), que es la misma idea sin
el resorte de framer-motion.

**Alternativa descartada: agregar `role="dialog"` y un focus trap a mano.** Es
reescribir lo que Radix ya resuelve y el proyecto ya usa.

### 6. Lo plegado no recibe el foco: `inert`

El margen de "Mitad y mitad" se pliega con `max-h-0 opacity-0`. Mientras está
plegado lleva `inert`, que lo saca del orden de Tab y de los lectores. Es un
atributo, sin cambiar la animación.

### 7. Con mouse, 24px: las flechas de categorías

Las flechas pasan de `p-0.5` con ícono de 14px a `size-6` (24×24) con el mismo
ícono. En táctil ya miden 44 (`tactil:size-11`). Si el recorrido con axe
encuentra otro `target-size` con mouse, se corrige igual.

### 8. Estructura

- Títulos: los `h3` que siguen directo a un `h1` pasan a `h2` con las mismas
  clases (Analytics, Mesas, Dashboard). No cambia cómo se ven.
- `<nav>` del menú: `aria-label="Menú principal"` en el de escritorio y en el
  del celular.
- Encabezados vacíos: `<span className="sr-only">Acciones</span>` o
  "Seleccionar".
- "Crear un rol nuevo": `underline` siempre, no solo al pasar el mouse.
- Región deslizable sin foco: el contenedor recibe `tabIndex={0}` y un
  `aria-label` con el nombre de la tabla.

### 9. Tests

`e2e/admin-accesible.spec.ts`, contra el stack local:

- **Recorrido con axe**: las mismas rutas de `admin-celular.spec.ts` (sacadas
  de las carpetas), a 390 táctil y a 1280 con mouse, más el menú lateral
  abierto. Reglas WCAG 2.2 A/AA y best-practice, **sin** `color-contrast`
  (cambio aparte) y excluyendo `.leaflet-container`. Contexto con
  `bypassCSP: true`. Falla con la lista de violaciones por pantalla.
- **Teclado** (lo que axe no ve): elegir Tarjeta en el cobro con Tab +
  Espacio; abrir un pedido con Tab + Enter; abrir el menú con Enter, comprobar
  que Tab no sale de él, cerrarlo con Escape y que el foco vuelva; que Tab no
  entre al margen plegado de "Mitad y mitad".
- `axe-core` pasa a `devDependencies` a la misma versión que ya está
  instalada: el test no puede depender de que otra librería la siga trayendo.

Por la lección 21, antes de arreglar se corre contra el código de hoy y tiene
que fallar en cada caso; por la 37, al terminar se rompe a propósito un caso
de cada tipo para confirmar que el test se entera.

## Risks / Trade-offs

- **[El menú cambia de componente]** → Es el cambio más visible. Se compara la
  captura del menú abierto antes y después, y se corren `navbar.spec.ts` y
  `navbar-reflow.spec.ts` (el menú de escritorio no se toca).
- **[Las filas de pago en la caja]** → La caja se usa todos los días. Se prueba
  con mouse y con teclado en el stack local, con una sesión de prueba que se
  borra en un `finally`, y la pasada a 1280px con mouse compara la barra y el
  cobro contra `main`.
- **[axe cambia de versión y encuentra reglas nuevas]** → Se fija la versión en
  `devDependencies`; actualizarla es una decisión explícita.
- **[`aria-label` que se desactualiza del tooltip]** → Es texto duplicado. Se
  acepta: el test de axe detecta que falte, no que difiera. Anotado como
  argumento a favor del componente si David lo quiere más adelante.

## Migration Plan

Sin migración de datos. Se despliega con el resto; rollback revirtiendo el
commit.
