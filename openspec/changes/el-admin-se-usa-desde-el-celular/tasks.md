# Tasks

Todo se prueba contra el stack local (`npm run db:start`); `playwright.config.ts`
ya fuerza las variables del local, así que ningún test toca producción.

## 1. El test primero, fallando contra el código de hoy

- [x] 1.1 Crear `e2e/admin-celular.spec.ts` con el recorrido de desborde a
      390×844 (Decisión 8): rutas sacadas de `app/admin/**/page.tsx` sin
      `/print` ni `/login`, cada `[id]` resuelto con `rest()`, rutas sin datos
      anotadas. Verifica: `npx playwright test admin-celular` falla nombrando
      al menos products/new, products/[id]/edit, ingredients/new y
      stock/ficha/[productId].
- [x] 1.2 Agregar el recorrido táctil (`hasTouch`, `isMobile`) que prueba con
      `elementFromPoint` el área de 44×44 de cada control visible, con las
      excepciones de la Decisión 5. Verifica: falla y reporta una cantidad del
      orden de los 298 controles medidos en el relevamiento.
- [x] 1.3 Agregar los casos puntuales y las pasadas de control de la Decisión
      8 (producto, tablas, caja, barra superior, campana, 1280px con mouse,
      checkout táctil). La caja se prepara abriendo una sesión en
      `cash_register_sessions` del local y se limpia al terminar, como en
      `mesa-comensales.spec.ts`; la campana, poniendo un insumo del local bajo
      su mínimo y restaurándolo. Verifica: cada caso nuevo falla contra el
      código de hoy, y las pasadas de control (1280px, checkout) pasan.

## 2. Barra superior

- [x] 2.1 Crear `MobileTopBar` (menú 44×44 con `aria-label`, sección con
      `isActiveRoute` + `visibleNavGroups`, campana a `/admin/stock` solo con
      alertas y permiso `stock.view`) y usarla en `AdminShell` en lugar de la
      barra con el logo falso. Verifica: pasan los casos de barra y campana de
      1.3.
- [x] 2.2 Confirmar con grep que `AdminLayout` no se monta fuera del shell y
      borrar su modo standalone (con la segunda copia del logo falso).
      Verifica: `npm run build` pasa, `grep -rn ChefHat components/admin/layout`
      no devuelve la barra, y dashboard, analytics y pedidos se ven igual en la
      captura.

## 3. Formularios

- [x] 3.1 Formulario de producto: tarjeta `flex-col lg:flex-row`, columna
      derecha `w-full lg:w-[420px]`, padding `p-4 sm:p-8`, "Tipo de producto"
      en una columna debajo de `sm`. Verifica: pasan los casos de producto de
      1.3 (390px y 1280px) y la captura a 390px muestra las secciones apiladas.
- [x] 3.2 Encabezado con `flex-wrap gap-3` en los formularios de producto,
      categoría, insumo, empleado y rol. Verifica: el recorrido de 1.1 pasa en
      esas rutas y en la captura los botones se ven enteros debajo del título.

## 4. Tablas

- [x] 4.1 Columna de acciones `sticky right-0` con fondo opaco y hover por
      `group-hover` en productos, recetas, insumos, stock (insumos y productos)
      y equipo; `whitespace-nowrap` en los encabezados de stock. Verifica:
      pasan los casos de "editar dentro de la ventana" de 1.3, y una captura
      con la tabla deslizada muestra los datos pasando por debajo.
- [x] 4.2 El resaltado de fila sigue viéndose en la celda fija. Verifica:
      `npx playwright test tablas-resaltado` pasa.
- [x] 4.3 Revisar con el recorrido si otra tabla con acciones sigue
      ocultándolas y sumarla a 4.1. Verifica: salida del recorrido adjunta.

## 5. Pantallas puntuales

- [x] 5.1 Ficha técnica: producción y costo debajo del nombre bajo `sm`,
      botones con `flex-wrap`. Verifica: `stock/ficha/[productId]` pasa el
      recorrido de desborde y el costo total se ve entero en la captura.
- [x] 5.2 Analytics: `chart-container.tsx` en `flex-col sm:flex-row`. Verifica:
      en la captura "Rentabilidad por Producto" se lee en un renglón.
- [x] 5.3 Mesas: el nombre toma el ancho sobrante y admite dos renglones.
      Verifica: en la captura "Mesa 1" y su descripción se leen sin "(…".

## 6. 44px táctil

- [x] 6.1 Clase `admin-panel` en `<html>` desde `AdminRouteShell` (puesta y
      sacada junto a `admin-dark`) y `@custom-variant tactil` en
      `globals.css`. Verifica: la pasada del checkout táctil de 1.3 pasa (la
      clase no queda al salir del panel) y en el panel `html.admin-panel`
      existe.
- [x] 6.2 Componentes base: `Button`, `Input`, `SelectTrigger`, `NumberInput`,
      ítems de `Select`, `Switch` y `Checkbox` con sus clases `tactil:`
      (Decisión 5). Verifica: el recorrido táctil vuelve a correr y la cuenta
      baja; se anota cuántos quedan. La pasada de 1280px con mouse sigue en
      36px.
- [x] 6.3 Controles escritos a mano, pantalla por pantalla según lo que
      reporte el recorrido: `min-h-11 min-w-11` o pseudo-elemento, y
      `tactil:gap-*` donde dos áreas se pisarían (flechas de reordenar,
      grilla de colores, `ayuda-campo`). Verifica: el recorrido táctil pasa
      completo; `npx playwright test ayuda-campo` sigue pasando.

## 7. Caja

Todo contra el stack local, con una sesión de caja abierta por el test y
borrada al final: no se cobra ni se cierra ningún turno real.

- [x] 7.1 `caja-dashboard.tsx`: la banda con el menú solo en la pantalla de
      abrir turno, usando `MobileTopBar` con "Caja". Verifica: con turno
      abierto, un solo "Abrir menú"; sin turno (borrando la sesión en el test),
      también uno.
- [x] 7.2 `ShiftBar` en dos renglones debajo de `sm` (acciones arriba,
      "Vendido" y "En caja" abajo), sin `overflow-x-auto` en celular. Verifica:
      pasa el caso de caja de 1.3 (cerrar caja, vendido y en caja dentro de la
      ventana) y la pasada a 1280px con un renglón y los mismos textos.

## 8. Cierre

- [x] 8.1 Suite completa: `npm run lint`, `npm run build` y `npx playwright
      test` pasan. Verifica: salida de los tres comandos.
- [x] 8.2 Capturas antes/después a 390px de las pantallas del relevamiento
      (barra superior, producto, insumo, stock, ficha, analytics, mesas,
      categorías, caja) y una pasada a 1280px de producto, stock y caja para
      confirmar que el escritorio no cambió. Verifica: las capturas, mostradas
      a David antes de dar el cambio por terminado.
- [x] 8.3 Si alguna corrección de David durante la revisión deja un patrón,
      agregarlo a `tasks/lessons.md`. Verifica: la entrada nueva, o la nota de
      que no hubo correcciones.

## 9. Estados que el recorrido no veía

El recorrido de 1.x mide cada ruta en su estado inicial. Esto agrega lo que se
abre desde ahí. Todo en modo táctil a 390px, con desborde de página y 44×44.

- [x] 9.1 Login y menú lateral abierto. Verifica: casos nuevos en
      `admin-celular.spec.ts` sin fallas.
- [x] 9.2 Pestañas secundarias: stock (Alertas, Movimientos, Consumo),
      configuración (Pausa, Cobros, Stock, Apariencia), equipo (Roles), costos
      (Insumos), ficha técnica (Lista de compras). Verifica: sin fallas.
- [x] 9.3 Diálogos: ajuste de stock, planilla, alta de mesa, nueva zona,
      actualización de precios, confirmación de borrado, movimiento de caja.
      Se abren y se cierran sin guardar. Verifica: sin fallas.
- [x] 9.4 Caja con turno abierto: pestañas Mesas e Historial, el pedido desde el
      botón flotante, la pantalla de cobro y la de cierre (sin confirmar el
      cierre). Una venta de prueba en el local deja un pedido y una comanda para
      que Pedidos, Cocina y Dashboard se midan con datos; se borran al final.
      Verifica: sin fallas, y la base local queda sin los registros de prueba.

## 10. Otros celulares, iPhone y tema oscuro

- [x] 10.1 Los recorridos de desborde y 44×44 corren también a 360px.
      Verifica: los dos casos a 360px sin fallas.
- [x] 10.2 iPhone: ningún campo con letra de menos de 16px en táctil (recorrido
      y dentro de pestañas, diálogos y caja). WebKit no corre en esta máquina
      (le faltan libicu74 y libflite); la regla depende solo del tamaño de
      letra y se mide en Chromium. Sin `viewport-fit=cover` ni manifest, la
      barra de gestos no tapa contenido. Verifica: caso "ningun campo hace zoom"
      sin fallas, y comprobado que falla si se saca `tactil:text-base` de Input.
- [x] 10.3 Tema oscuro a 390px táctil: barra, tablas con columna fija, equipo,
      producto, caja, categorías y mesas. Verifica: capturas revisadas.

## 11. Segunda pasada: flujos con datos cargados

Mismo criterio que el grupo 9 (táctil, desborde, 44×44, zoom de iPhone),
abriendo y tocando lo que el usuario toca.

- [x] 11.1 Caja: el pedido de una mesa (hoja de la mesa, agregar productos,
      cobro de mesa) y el cobro con medio de pago elegido y pago dividido. Sin
      confirmar el cobro. Verifica: sin fallas y la base local sin los
      registros de prueba.
- [x] 11.2 Media pizza: con un producto "mitad" de prueba en el local, el
      selector de mitades en la caja. Verifica: sin fallas y el producto de
      prueba borrado.
- [x] 11.3 Formularios cargados: producto Combo y Mitad y mitad, el
      desplegable de ingredientes de una receta abierto, una compra con ítems.
      Verifica: sin fallas.
- [x] 11.4 Diálogos restantes: email y clave en Equipo y en Mi cuenta,
      edición de mesa y de zona, la barra de selección múltiple de productos.
      Verifica: sin fallas.

## Notas de implementación

- 1.x contra el código de hoy (2026-09-25): desbordan categories/[id]/edit
  (+8), ingredients/new (+40), products/new y products/[id]/edit (+111),
  stock/ficha (+131). Recorrido táctil: 389 controles bajo 44×44 (más que los
  298 del relevamiento porque ahora se mide dónde responde el toque, incluidas
  pestañas y opciones). Ya pasaban sin cambios, y quedan como guarda: la
  acción de la primera fila en recetas, la caja sin turno, y las pasadas de
  1280px y de la tienda.
- 5.1: la pantalla usa `ficha-tecnica-view.tsx` (no el diálogo que nombra el
  diseño). Además de la tarjeta, la tabla de desglose/lista de compras dejaba
  los ingredientes **sin nombre** a 390px (columnas numéricas fijas de 320 y
  470px); pasó a deslizarse con ancho mínimo de 34rem/44rem.
- 4.3: `arqueos-table.tsx` y `movimientos-table.tsx` no se importan en ningún
  lado (código muerto, fuera de este cambio). Arqueos real (`caja-historial`)
  se verificó con una sesión cerrada de prueba en el local, luego borrada.
- 8.2: a 1280px con mouse, 15 pantallas comparadas píxel a píxel contra `main`:
  13 idénticas, recetas y equipo con 1 píxel de antialiasing. La primera pasada
  encontró un ícono nuevo en "Dar de baja" en escritorio; quedó solo para
  celular.
- 8.3: sin correcciones de David durante la implementación. Se agregó la
  lección 39 (CSS viejo servido después de un `git stash`), que invalidó y
  obligó a repetir dos mediciones.
- Fuera de alcance, anotado: el drawer del menú no tiene `role="dialog"` ni
  cierra con Escape; los interruptores del formulario de producto no tienen
  nombre accesible.
- 9.x: lo que apareció al abrir lo que el recorrido no abría —la X de los
  diálogos (16px), el ojo de la contraseña del login, "Cambiar tema", la
  planilla, los colores de zona, el pedido y el cobro de la caja, Retiro /
  Ingreso, "Volver al POS", los botones de las comandas— quedó en 44×44.
  `area-toque` dejó de fijar `position`: la X de un diálogo ya es `absolute`.
  `BottomSheet` ganó `role="dialog"`; los botones de insumos que en el celular
  son solo ícono ganaron `aria-label`.
- 9.4, cambio de comportamiento (decidido por David, agregado a la spec): en el
  celular, "Enviar a cocina" cerraba la hoja y dejaba el pedido seleccionado en
  Pendientes; el primer toque en el chip lo deseleccionaba y había que tocarlo
  dos veces para cobrar. Ahora la hoja pasa a "Cobrar #N", como en escritorio.
- 9.4: una corrida con el nombre de columna equivocado (`session_id` en vez de
  `cash_register_session_id`) cortó el `afterAll` y dejó borrada la sesión de
  caja local; se repuso a mano con sus datos originales y la limpieza pasó a un
  `finally`.
- 10.1: a 360px apareció que los íconos y prefijos dibujados sobre un campo
  (lupas, "$") no dejaban pasar el toque: tocar ahí no enfocaba el campo. Son
  23 en el panel; todos pasaron a `pointer-events-none`.
- 11.1, dos errores de la caja en el celular que existían antes: "Agregar
  Items" de una mesa abría la pantalla de agregar **detrás** de la hoja (no se
  podía cargar nada a una mesa desde el celular), y esa pantalla ponía el
  carrito de 380px fijos al lado del menú, dejándole 10px. Ahora la hoja se
  cierra, menú y carrito se apilan debajo de `md`, y al confirmar o volver se
  abre de nuevo la hoja de la mesa.
- 11.1: la hoja de mesa, el cobro de mesa y la media pizza tienen más de diez
  botones chicos con alturas en línea; llevan `tactil:[&_button]:min-h-11
  tactil:[&_button]:min-w-11` en su raíz, acotado a cada componente.
- 11.2: la media pizza tenía dos botones de cerrar superpuestos (el propio y la
  X automática del diálogo), en todos los tamaños. Se apagó la automática.
- 11.x: el recorrido pasó a medir también lo clickeable que no es un control
  (`cursor: pointer`): encontró las filas de medio de pago (`<div onClick>`,
  40px) y los permisos de un rol (41px). Las filas de pago siguen sin poder
  usarse con teclado: fuera de este cambio.
- 11.4: "Cambiar email" en Equipo usa `window.prompt`, que dibuja el navegador;
  no se mide.
- 11.x cierre: las filas de Pedidos se tocan para abrir el pedido y medían
  39px (las encontró la detección por `cursor: pointer`, con datos cargados);
  pasaron a 44 con el dedo. Suite completa: 95 de 95.
