# Design

## Context

- **Grilla:** `app/admin/caja/page.tsx:31` trae los productos con
  `.order('name')`. `PosProductGrid` filtra por categoría y búsqueda, pero no
  reordena. Los productos no tienen `sort_order`; las categorías sí.
- **Categorías:** una fila de pestañas con `overflow-x-auto no-scrollbar`, sin
  indicador de desborde.
- **Aviso al agregar:** `pos-interface.tsx:302`,
  `toast.success(\`${product.name} agregado\`)`.
- **Avisos en general:** `components/ui/sonner.tsx` toma el tema de
  `next-themes` (el de la tienda), no del store del panel. Por eso en el panel
  oscuro salen claros.
- **Tipografía:** `.admin-layout { font-family: Inter; --accent: … }` en
  `globals.css:436`. Los diálogos, hojas, menús y avisos salen por portal a
  `<body>`, fuera de `.admin-layout`, y heredan la fuente de la tienda. Desde
  `el-admin-se-usa-desde-el-celular`, `AdminRouteShell` pone `admin-panel` en
  `<html>` mientras se está en el panel.
- **Breakpoint del carrito:** `md` (768px), en `pos-interface.tsx:770`, `:853`
  y `:883`.
- **Tokens hoy:** `--admin-bg/surface/surface-2/border/text/text-muted/
  text-faint/text-placeholder/accent/accent-text/price`, en los dos temas.
  Hay radios de shadcn (`--radius-*`). No hay estados, escala de texto ni
  tamaños de control.
- **Media pizza:** `calcHalfPizzaPrice(método, recargo, mitad1, mitad2,
  precioBase)` calcula el precio de un par. La tarjeta muestra
  `product.price`, que para un producto `mitad` suele ser 0.

## Goals / Non-Goals

**Goals:**

- Posiciones estables. Menos opciones compitiendo en el momento de decidir, y
  las que compiten, agrupadas.
- Que cada control tenga un solo tamaño y cada estado un solo color, definidos
  una vez.
- Que nada que aparece sobre la caja tape lo que el cajero necesita.

**Non-Goals:**

- Cambiar el flujo del cobro o cuántos pasos tiene.
- Reescribir el panel entero con los tokens nuevos.

## Decisions

### 1. Orden: categoría y después nombre, en el cliente

`PosProductGrid` ordena `availableProducts` por
`(orden de la categoría, nombre)`, con `localeCompare('es')` para los acentos.
Los productos sin categoría van al final. La consulta del servidor no cambia:
ordenar en la base pediría un join solo para esto, y en el cliente son 50
elementos.

*Alternativa descartada:* secciones con título por categoría dentro de
"Todos". Ayuda a escanear, pero agrega un nivel más a la pantalla y le quita
lugar a la grilla en la netbook. Si con el orden no alcanza, es el paso
siguiente.

### 2. Categorías: se envuelven desde `lg`, deslizan con indicador debajo

Desde `lg` la fila usa `flex-wrap`. Con 11 categorías a 1366 quedan dos
renglones, y todas se ven. Por debajo de `lg` sigue deslizable, con una
máscara de degradado en el borde que tiene contenido oculto (se calcula con
`scrollLeft` y `scrollWidth`, y se actualiza en `scroll` y `resize`).

Las pestañas subrayadas no se ven bien en dos renglones, así que desde `lg`
pasan a chips con el mismo esquema de color que usan hoy.

### 3. Sin aviso al agregar; los avisos siguen al tema del panel

Se borran los dos `toast.success` de `handleAddItem`: el de "agregado" y el
de "x2". Además estaban mal ubicados: se disparaban dentro del *updater* de
`setItems`, que tiene que ser puro. Con StrictMode corría dos veces, y por eso
en dev se veían avisos apilados. El resto de los avisos
(errores, "Mesa 1 abierta", cobros) se queda. En `sonner.tsx`, si
`html.admin-panel` está presente, el tema sale del store del panel
(`admin-theme`) y no de `next-themes`.

### 4. Pendientes: donde están, con el énfasis correcto

La fila se queda debajo de la grilla y sigue apareciendo solo si hay
pendientes. La maqueta la subió arriba de la búsqueda; David vio las capturas
y prefirió que quede donde la busca hoy. Cambian solo los estilos:

- pedido elegido: ámbar lleno, texto negro (el más marcado);
- pendiente sin elegir: borde ámbar sobre la superficie, texto normal;
- remoto: el ícono de globo que ya tiene, más el nombre del cliente si entra;
- "Nuevo pedido": botón fantasma con `+`, separado por un divisor, sin ámbar.

### 5. Carrito

- El nombre pasa de `truncate` a `line-clamp-2`.
- El monto del renglón deja el ancho fijo de 52px y usa `min-w` con
  `tabular-nums`. El tacho va en su propia columna, sin margen negativo.
- Con el envío apagado, el bloque se reduce a un renglón "Envío" con el
  switch, sin la tarjeta que lo rodea.
- El breakpoint del carrito lateral y del panel de mesa pasa de `md` a `lg`.
  Por debajo de 1024px se usa la hoja y el botón flotante que ya existen para
  el celular. La tablet horizontal (1180) queda como hoy.

### 6. Media pizza: "desde" es el mínimo de los pares

La tarjeta calcula `min(calcHalfPizzaPrice(...))` sobre todos los pares de
opciones: con 5 pizzas son 10 pares, y se memoiza. Así sirve para cualquier
método de precio sin duplicar su lógica. Si no hay al menos 2 opciones, la
tarjeta muestra el precio del producto, como hoy. En el selector, cada opción
lleva su precio a la derecha, y el pie muestra el precio resultante apenas hay
dos mitades.

### 7. Cierre: un panel, primero contar, todo a la vista

Un solo panel (la memoria del proyecto: un panel con secciones separadas por
una línea fina, no una tarjeta por tema). La maqueta lo partió en dos
tarjetas y el resumen quedó fuera de la vista; David lo descartó.

Desde `lg`, el panel tiene dos columnas separadas por una línea fina:

- **Izquierda, la tarea:** conciliación (desglose, esperado, contado,
  diferencia), notas, lo que impide cerrar (de `la-caja-dice-lo-que-paso`) y
  los botones.
- **Derecha, el turno:** ventas, pedidos y ticket promedio en una línea de
  tres cifras sin tarjetas propias; medios de pago con sus barras; horario
  (apertura, ahora, duración) en una línea.

Con eso todo entra en 1366×768 sin desplazarse. Por debajo de `lg` las
columnas se apilan en el mismo orden (primero contar), y ahí sí se desplaza.

El encabezado propio del cierre ("QC Que Copado · Sesión #XXXX") se reduce a
"Volver a la caja" y el horario del turno, para ganar alto.

Detalles:

- Horas con `{ hour: '2-digit', minute: '2-digit', hour12: false }`.
- El contado se muestra formateado al perder el foco ("$ 40.000") y crudo
  mientras se escribe, igual que los montos del cobro.
- El ticket promedio usa `Math.round` antes de `formatPrice`.
- Íconos: faltante con `TrendingDown`, sobrante con `TrendingUp`, cero con
  `CheckCircle`. El botón de confirmar pierde el triángulo de advertencia.
- En celular, el encabezado propio del cierre se reemplaza por `MobileTopBar`
  y la celda del ticket promedio se envuelve en lugar de desbordar.

### 8. La tipografía y el remapeo de `--accent`, en `html.admin-panel body`

Dos piezas, las dos probadas en la maqueta del 2026-09-27:

- La variable de Inter (`inter.variable`) hoy está en un `div` del layout. Se
  pasa a `<html>`: `AdminRouteShell` la agrega junto con `admin-panel` y la
  saca al salir.
- El bloque `.admin-layout { … }` se aplica también a
  `html.admin-panel body`. Tiene que ser `body` y no `html`: el `<body>` tiene
  su propia fuente (la de la tienda), y los portales la heredan de ahí.

Las reglas de números tabulares siguen el mismo selector. `.admin-layout` se
conserva como alias mientras haya algo que dependa de él, y se busca con
`grep` antes de sacarlo.

### 9. Tokens nuevos

En `:root` (claro) y en `html.admin-dark` (el único bloque oscuro):

| Token | Utilidad | Uso |
|---|---|---|
| `--admin-exito`, `--admin-exito-texto` | `bg-exito/10`, `border-exito/25`, `text-exito-texto` | libre, pagado, cierra justo |
| `--admin-peligro`, `--admin-peligro-texto` | `…-peligro…` | faltante, cancelar, errores |
| `--admin-aviso`, `--admin-aviso-texto` | `…-aviso…` | ocupada, stock bajo, sin cobrar |
| `--admin-info`, `--admin-info-texto` | `…-info…` | tarjeta, sobrante |

Éxito y peligro tienen además un tono **sólido** (`bg-exito-solido`,
`bg-peligro-solido`: green-700 y red-700, iguales en los dos temas) para los
botones de fondo lleno con texto blanco. Salió al aplicar: el botón
"Registrar ingreso" era `green-600` con blanco, 3,3:1, y ningún test lo
veía porque el recorrido de axe no abre ese diálogo.

Cada estado tiene dos tonos: el base para fondos, bordes y puntos, con
opacidad de Tailwind (`bg-peligro/10`), y el de texto. No hace falta un
`-bg` aparte. Los valores son los mismos de la paleta de Tailwind que ya se
usaban sueltos (500 el base; 700 el texto en claro y 400 en oscuro), así que
el contraste medido en `el-panel-se-lee-en-los-dos-temas` no cambia.

- **Escala de texto:** `text-panel-2xs` 11px, `-xs` 12px, `-sm` 13px,
  `-base` 14px, `-lg` 16px, `-xl` 18px. Llevan el prefijo `panel` para no pisar
  la escala de Tailwind, que la tienda sigue usando. Los 12 tamaños
  arbitrarios de la caja se llevan al paso más cercano, salvo el vuelto y el
  total, que conservan su tamaño a propósito.
- **Controles:** `h-control`/`size-control` de 36px (con mouse) y
  `size-control-sm` de 28px; con el dedo manda `tactil:` a 44px. El `−`/`+`
  del carrito de mesa pasa al mismo tamaño que el de mostrador.

*Alternativa descartada:* reemplazar los colores crudos de todo el panel en
este cambio. Son unos 100 archivos y se mezclaría con cualquier otro trabajo
en curso. Se hace en la caja, y el resto se migra cuando se toca.

## Risks / Trade-offs

- **Las categorías en dos renglones** le quitan unos 40px a la grilla en la
  netbook. A cambio, ninguna categoría queda escondida.
- **El carrito como hoja entre 768 y 1024px** suma un toque para ver el pedido
  en la tablet vertical. A cambio, la grilla pasa de 3 columnas angostas a 4
  legibles. La tablet horizontal no cambia.
- **Tipografía en portales:** si algún diálogo de la tienda se abre con
  `admin-panel` puesto (no debería, porque la clase se saca al salir del
  panel), tomaría Inter. `admin-celular.spec` ya navega entre los dos.
