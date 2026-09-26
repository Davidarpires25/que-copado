# Design

## Context

Ver `proposal.md` para el relevamiento. Lo que condiciona el cómo:

- El panel ya tiene un armazón para celular que funciona: bajo `lg` el menú
  lateral pasa a drawer y aparece una barra con el botón de menú
  (`components/admin/layout/admin-shell.tsx`). Lo roto está **dentro** de las
  pantallas, más la barra misma.
- No hay un componente común de tabla ni de encabezado de formulario: son
  `<table>` y `flex justify-between` escritos en cada pantalla. Recetas y
  compras ya apilan título y botones; los otros cinco formularios no.
- Los componentes base (`components/ui/*`) los comparten el panel y la tienda.
  La tienda está fuera de alcance y no puede cambiar.
- Los diálogos, selects y sheets salen por portal a `<body>`, fuera del árbol
  del panel. El proyecto ya resolvió eso para el tema oscuro: la clase
  `admin-dark` va en `<html>` y la variante `dark` la lee
  (`@custom-variant dark (&:is(.dark *, .admin-dark *))` en `globals.css`).
- La caja se usa todos los días en la computadora del local. Cualquier cambio
  ahí tiene que dejar ≥1024px igual.
- Tailwind 4: breakpoints `sm` (640), `md` (768), `lg` (1024) y
  `@custom-variant`.

## Goals / Non-Goals

**Goals:**
- Cumplir `specs/panel-en-el-celular` y el agregado a `specs/tablas-del-admin`
  con cambios de clases y markup, sin tocar datos ni server actions.
- Que el escritorio con mouse no cambie: cada arreglo se activa por debajo de
  un breakpoint o con puntero táctil.
- Dejar un test que recorra el panel a 390px, para que la próxima pantalla nueva
  no vuelva a desbordar ni a traer botones chicos sin que nadie se entere.

**Non-Goals:**
- Extraer un `<AdminTable>` o un `<FormHeader>` común. Ver Decisión 2.
- Rediseñar pantallas: se acomoda lo que existe, no se reinventa.
- Llevar la tienda pública a 44px.

## Decisions

### 1. Formulario de producto: apilar debajo de `lg`

La tarjeta es `flex gap-8` con la columna derecha en `w-[420px] shrink-0`, así
que la izquierda se aplasta hasta 26px. Pasa a `flex flex-col lg:flex-row`, con
la derecha en `w-full lg:w-[420px]` y el padding de la tarjeta en `p-4 sm:p-8`.
Las opciones de "Tipo de producto" (hoy `grid-cols-2`) pasan a una columna
debajo de `sm`: cada una lleva una descripción de dos renglones que a 150px no
se lee.

`lg` y no `md`: a 768px la columna derecha de 420px deja 250px para la
izquierda, que es el mismo problema en chico.

### 2. Encabezado de formularios: `flex-wrap`, pantalla por pantalla

Los cinco encabezados pasan de `flex items-center justify-between` a
`flex flex-wrap items-center justify-between gap-3`. Cuando título y botones no
entran, los botones bajan a su renglón y el título conserva el ancho. Es lo que
ya hacen recetas y compras, logrado con una línea.

**Alternativa descartada: un componente `<FormHeader>` común.** Serían cinco
archivos migrados a un componente nuevo para arreglar una clase. Los
encabezados tienen variaciones reales (breadcrumb con flecha o con chevron,
ícono en el botón o no), y la repetición de diseños en el panel es deliberada.
Se arregla en su lugar.

### 3. Tablas: la columna de acciones es `sticky right-0`

Las celdas de la columna de acciones (`<th>` y `<td>`) llevan
`sticky right-0` con el fondo opaco de la tabla y un borde izquierdo sutil.
Donde la tabla entra entera —el escritorio— `sticky` no hace nada y se ve igual
que hoy.

Tablas alcanzadas: las que tienen columna de acciones y desbordaron en la
medición — productos, recetas, insumos, stock (insumos y productos) y equipo.
La implementación confirma la lista con el test (Decisión 8), no con grep.

La colisión de encabezados en stock ("Stock ActuEstado") se arregla con
`whitespace-nowrap` en los `<th>`: hoy el texto se parte y se monta sobre la
columna vecina. Con `nowrap` la tabla pide su ancho real y desliza.

**Alternativas descartadas:**
- *Tarjetas en vez de filas en celular:* duplica el markup de cada tabla (dos
  renders por pantalla) y dos versiones divergen, como ya pasó con la fórmula
  del costo.
- *Ocultar columnas debajo de `sm`:* el dato se pierde en vez de quedar a un
  deslizamiento, y no hay una regla de qué ocultar que sirva para todas.

**Cuidado con el resaltado de fila.** La fila cambia de fondo al pasar el mouse
(`tablas-resaltado.spec.ts`). Una celda `sticky` con fondo propio tapa ese
cambio: la celda toma el fondo de hover con `group-hover` desde el `<tr>`.

### 4. Ficha técnica, Analytics y mesas: `flex-wrap` / `flex-col` debajo de `sm`

- **Ficha técnica** (`ficha-tecnica-dialog.tsx`): el bloque de producción
  simulada y costo total pasa debajo del nombre del producto. Los botones
  Imprimir / Exportar PDF se envuelven.
- **Analytics** (`chart-container.tsx`): `flex-col sm:flex-row`. El selector de
  período baja debajo del título. Es un solo componente y arregla todas las
  tarjetas.
- **Mesas** (`tables-dashboard.tsx`): el nombre toma el ancho sobrante
  (`min-w-0 flex-1`) y puede ocupar dos renglones antes de truncar.

### 5. 44px táctil: una variante `tactil` que solo existe dentro del panel

**El estándar.** WCAG 2.2, criterio 2.5.5 (Target Size, Enhanced, nivel AAA):
el área que responde al puntero mide al menos 44×44 px CSS. Es el mismo número
que el de Apple (44pt). Material pide 48dp; se eligió WCAG porque es un
estándar que se puede medir en la página, y 44 está entre los dos.

**La variante.** `AdminRouteShell` ya pone y saca `admin-dark` en `<html>`; se
le suma `admin-panel`, que está puesta mientras se está en el panel y se saca
al salir. En `globals.css`:

```css
@custom-variant tactil {
  @media (pointer: coarse) {
    &:is(.admin-panel *) { @slot; }
  }
}
```

`tactil:` aplica solo con puntero táctil **y** dentro del panel, portales
incluidos. Con mouse no aplica; en la tienda no aplica.

**Dónde se usa, en tres capas:**

1. **Componentes base** — donde está la mayoría de los 298 casos:
   - `Button`: `tactil:min-h-11` en todos los tamaños; los `icon*` además
     `tactil:min-w-11`.
   - `Input`, `SelectTrigger`, `NumberInput`: `tactil:min-h-11`.
   - `Switch` y `Checkbox`: se ven igual; el área crece con un pseudo-elemento
     (`relative tactil:before:absolute tactil:before:-inset-[Npx]`) hasta
     44×44.
   - Los ítems de `Select` y de menús desplegables: `tactil:min-h-11`.
2. **`<button>` y `<Link>` escritos a mano** en `components/admin/**` y
   `app/admin/**`: cada uno recibe `tactil:min-h-11 tactil:min-w-11`, o el
   pseudo-elemento si su tamaño visual es parte del diseño (flechas de
   reordenar, ícono de `ayuda-campo`, puntos de color de categoría). La lista
   sale del test, no de grep.
3. **Controles vecinos**: cuando dos áreas agrandadas se pisarían (subir/bajar,
   la grilla de colores), se separan con `tactil:gap-*` en el contenedor. La
   regla es que el área crece hacia donde hay espacio.

**Excepciones** (las de WCAG más la del alcance): links dentro de texto
corrido, y los controles de Leaflet/Geoman en zonas de envío.

**Alternativas descartadas:**
- *Cambiar los tamaños base de los componentes para todos:* cambia la tienda,
  que está fuera de alcance, y el escritorio con mouse, que tiene que quedar
  igual.
- *Una regla CSS global* (`.admin-panel button { min-height: 44px }`): alcanza
  cosas que no son controles de verdad y no se puede exceptuar caso por caso
  sin pelear contra la especificidad.
- *`pointer-coarse:` de Tailwind sin la clase del panel:* cambia la tienda en
  el celular.

### 6. Caja: una sola barra, dos renglones en celular

- `caja-dashboard.tsx` muestra su banda con el menú **solo cuando no hay
  `ShiftBar`**, es decir en la pantalla de abrir turno, y esa banda es la misma
  barra superior de la Decisión 7 (con "Caja" como sección). Durante el turno
  el menú lo pone `ShiftBar`, que ya sabe hacerlo.
- `ShiftBar` debajo de `sm` pasa de una fila con `overflow-x-auto` a dos
  renglones: arriba el menú, el estado ("Caja abierta") y las dos acciones;
  abajo "Vendido" y "En caja". Con `flex-wrap` y el orden fijado por clases
  `order-*` debajo de `sm`, sin duplicar markup. Se deja de deslizar
  (`overflow-x-auto` solo desde `sm`).
- Desde `sm` la barra es la de hoy, de un solo renglón.

**Alternativa descartada: ocultar "En caja" en celular.** Fue la primera
propuesta; se prefirió que se vea siempre. El segundo renglón cuesta unos 32px
de alto.

### 7. Barra superior: menú, sección, campana

Un componente `MobileTopBar` en `components/admin/layout/`, que usan
`AdminShell` y la banda de la caja:

- **Izquierda:** botón de menú, 44×44, `aria-label="Abrir menú"`.
- **Centro-izquierda:** el nombre de la sección, calculado con `isActiveRoute`
  sobre `visibleNavGroups(permissions)` —la misma función y la misma lista que
  enciende el ítem del menú—. No se escribe un segundo mapa de rutas a nombres:
  si mañana se agrega una sección al menú, la barra la nombra sola. Si ningún
  ítem coincide (mi cuenta), dice el nombre de esa pantalla o, como último
  recurso, "Panel".
- **Derecha:** la campana, un `<Link>` de 44×44 a `/admin/stock` con la cuenta
  en una burbuja y `aria-label="3 alertas de stock"`. Usa el mismo
  `stockAlertCount` que ya carga `AdminShell` para el menú. No se muestra si la
  cuenta es 0 (resaltar lo normal es no resaltar nada) ni si el rol no tiene
  `stock.view`.
- Altura 56px (hoy 64). El logo falso se elimina.

Va a `/admin/stock` sin pestaña: la cuenta es de insumos bajo el mínimo, y esos
se ven en la pestaña por defecto ("Stock Actual") con su cartel arriba. La
pestaña que se llama "Alertas" es la de productos, otra cuenta.

**El otro logo falso.** `AdminLayout` tiene un modo standalone con una copia de
la barra y del cuadrado con el gorro. Solo corre si la pantalla se monta fuera
de `AdminShell`, y hoy las tres que lo usan (dashboard, analytics, pedidos)
están siempre adentro. Se borra ese modo en vez de arreglarlo: es un segundo
lugar donde la barra puede divergir. Antes de borrarlo, la implementación
confirma con grep que no quedó ningún uso fuera del shell.

### 8. Un test que recorre el panel a 390px

`e2e/admin-celular.spec.ts`, contra el stack local como los demás:

- **Recorrido de desborde:** todas las rutas del panel que no terminan en
  `/print` (ni `/login`), sacadas de `app/admin/**/page.tsx` y no escritas a
  mano, para que una pantalla nueva entre sola. Afirma
  `scrollWidth === clientWidth`. Cada `[id]` se resuelve con el primer registro
  de su tabla vía `rest()`; una ruta sin datos se anota, no se saltea en
  silencio.
- **Recorrido táctil** (`hasTouch: true, isMobile: true`, que activa
  `pointer: coarse`): en cada ruta, para cada control visible, se prueba con
  `elementFromPoint` que los puntos a ±22px del centro caen en el control o en
  un descendiente. Así se mide el área que responde de verdad, pseudo-elemento
  incluido, y de paso detecta que el área no la tape un vecino. Excepciones
  explícitas: links dentro de párrafos y los controles del mapa.
- **Casos puntuales:** nombre del producto ≥250px y "Guardar Producto" dentro
  de la ventana; botón de editar de la primera fila dentro de la ventana en
  stock, productos, recetas, insumos y equipo; caja con un solo "Abrir menú",
  "Cerrar caja", "Vendido" y "En caja" dentro de la ventana; barra superior con
  "Productos" en `/admin/products/new`; campana presente con alertas y ausente
  sin ellas (el test pone y saca un insumo bajo el mínimo en el local).
- **Pasadas de control:** a 1280px con mouse, el formulario de producto en dos
  columnas y un botón con la misma altura que antes (36px); la barra de la caja
  en un renglón con los mismos textos. Y el checkout de la tienda en modo
  táctil con los botones a su altura de hoy.

Por la lección 21, antes de arreglar nada se corre el test contra el código de
hoy y tiene que fallar en cada caso nuevo.

## Ajustes durante la implementación

Lo que cambió respecto de las decisiones de arriba, y por qué:

- **Decisión 4 — ficha técnica.** La página usa `ficha-tecnica-view.tsx`, no el
  diálogo. Además de la tarjeta, su tabla de desglose dejaba los ingredientes
  sin nombre a 390px: pasó a deslizarse con ancho mínimo.
- **Decisión 5 — `area-toque`.** No fija `position`: la X de un diálogo ya es
  `absolute` y pasarla a `relative` la movía. Los controles no posicionados
  llevan `tactil:relative` al lado.
- **Decisión 5 — regla por contenedor.** La hoja de mesa, el cobro de mesa y la
  media pizza tienen más de diez botones chicos cada uno, con alturas en línea.
  Llevan `tactil:[&_button]:min-h-11 tactil:[&_button]:min-w-11` en su raíz. No
  contradice la alternativa descartada (una regla global en `globals.css`):
  queda acotada a cada componente y visible donde se aplica.
- **Decisión 5 — iPhone.** Se agregó `tactil:text-base` en `Input`, `Textarea`
  y los campos escritos a mano (ver el requisito de zoom en la spec). Se
  descartó `maximum-scale=1` porque en Android bloquea el zoom con dos dedos.
- **Decisión 6 — `ShiftBar`.** Los montos van en un contenedor propio con
  `order-last w-full` debajo de `sm`, en lugar de `order-*` en cada hijo.
- **Decisión 7 — `AdminLayout`.** No lo usan tres pantallas sino unas treinta;
  se confirmó que ninguna se monta fuera del shell, y el modo standalone se
  borró igual.
- **Decisión 8 — el test.** Además de lo previsto, mide lo clickeable que no es
  un control (`cursor: pointer`), corre a 390 y a 360px, y abre pestañas,
  diálogos y flujos de la caja con datos de prueba que se borran en un
  `finally`.

## Risks / Trade-offs

- **[Superficie grande]** → Decenas de archivos. Se implementa por capas
  (componentes base primero, que resuelven la mayoría), y después de cada capa
  se corre el recorrido táctil para ver cuántos quedan.
- **[Botones más altos cambian el diseño en el celular]** → Filas de tablas y
  barras de herramientas van a crecer en alto. Es lo que pide el estándar; se
  revisa en las capturas de cierre que nada quede montado.
- **[La caja cambia en el local]** → El cambio de `ShiftBar` va bajo `sm` y con
  `tactil:`; la computadora del local tiene mouse. La pasada a 1280px lo
  afirma.
- **[La celda sticky tapa el resaltado de fila]** → `tablas-resaltado.spec.ts`
  se corre después de tocar las tablas.
- **[`admin-panel` queda puesta al salir del panel]** → Se saca en el mismo
  cleanup que ya saca `admin-dark`, que está probado. La pasada del checkout en
  modo táctil lo cubre.
- **[El recorrido táctil es lento]** → 29 pantallas tardaron un minuto en la
  medición. Es aceptable; no se paraleliza porque la base es compartida.
- **[Una notebook táctil]** → `pointer: coarse` depende del dispositivo
  principal; una notebook con pantalla táctil suele reportar `fine` y ve el
  panel como hoy. No es un problema.

## Migration Plan

Sin migración: son clases CSS y markup. Se despliega con el resto; el rollback
es revertir el commit.
