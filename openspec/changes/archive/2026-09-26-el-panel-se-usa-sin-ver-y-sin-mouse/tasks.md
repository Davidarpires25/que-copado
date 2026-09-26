# Tasks

Todo se prueba contra el stack local (`npm run db:start`); `playwright.config.ts`
ya fuerza las variables del local. Lo que toca la caja usa una sesión de prueba
propia que se borra en un `finally`: no se cobra ni se cierra nada real.

## 1. Los tests primero, fallando contra el código de hoy

- [x] 1.1 Agregar `axe-core` a `devDependencies` a la versión instalada
      (4.11.x). Verifica: `npm ls axe-core` lo muestra como dependencia directa.
- [x] 1.2 Crear `e2e/admin-accesible.spec.ts` con el recorrido de axe de la
      Decisión 9 (rutas de las carpetas, 390 táctil y 1280 mouse, menú abierto,
      sin `color-contrast`, sin `.leaflet-container`, `bypassCSP`). Verifica:
      falla nombrando al menos `button-name`, `label`, `select-name`,
      `target-size`, `heading-order`, `landmark-unique` y `empty-table-header`.
- [x] 1.3 Agregar los casos de teclado de la Decisión 9 (medio de pago, pedido,
      menú, margen plegado), con sesión de caja y pedido de prueba borrados en
      un `finally`. Verifica: los cuatro fallan contra el código de hoy.

## 2. Nombres

- [x] 2.1 `aria-label` en los botones de ícono (Decisión 1), pantalla por
      pantalla según la lista de axe. Verifica: el recorrido no reporta
      `button-name` en botones de ícono.
- [x] 2.2 Interruptores, casillas y selectores con su etiqueta asociada
      (Decisión 2), y los campos de la ficha técnica y el selector de rol.
      Verifica: el recorrido no reporta `button-name`, `label` ni
      `select-name`.
- [x] 2.3 El ojo de mostrar contraseña del login recibe nombre sin entrar al
      orden de Tab. Verifica: axe sin fallas en `/admin/login`.

## 3. Teclado

- [x] 3.1 Filas de medio de pago con botón real (Decisión 3). Verifica: el caso
      de teclado del cobro pasa, y con mouse se sigue eligiendo tocando la
      fila (caso de `admin-celular.spec.ts` "cobro con dos medios" en verde).
- [x] 3.2 Filas de Pedidos con botón en la primera celda (Decisión 4).
      Verifica: el caso de teclado de Pedidos pasa y `pedidos.spec.ts` sigue
      verde.
- [x] 3.3 Menú lateral del celular, detalle de pedido y detalle de arqueo como
      `Sheet` (Decisión 5). Verifica: pasan los casos de teclado del menú y del
      detalle de pedido; `navbar.spec.ts`, `navbar-reflow.spec.ts` y los
      casos del menú en `admin-celular.spec.ts` siguen verdes; captura del menú
      abierto antes y después mostrada a David.
- [x] 3.4 `inert` en el margen plegado de "Mitad y mitad" (Decisión 6) y
      `tabIndex={0}` con nombre en la región deslizable que marque axe.
      Verifica: el caso del margen pasa y axe no reporta
      `scrollable-region-focusable`.

## 4. Tamaño con mouse y estructura

- [x] 4.1 Flechas de categorías en 24×24 con mouse (Decisión 7). Verifica: axe
      no reporta `target-size` a 1280px y la captura muestra las flechas.
- [x] 4.2 Títulos en orden, `<nav>` con nombre, encabezados vacíos con texto
      para lectores, link de roles subrayado (Decisión 8). Verifica: axe no
      reporta `heading-order`, `landmark-unique`, `empty-table-header`,
      `link-in-text-block` ni `region`.

## 5. Cierre

- [x] 5.1 El recorrido de axe pasa entero; se rompe a propósito un caso de cada
      tipo (quitar un `aria-label`, quitar `inert`) y el test se entera.
      Verifica: salida de las corridas.
- [x] 5.2 A 1280px con mouse, comparación de píxeles contra `main` en las
      pantallas tocadas: iguales salvo categorías (flechas) y equipo/roles
      (subrayado). Verifica: la tabla de diferencias.
- [x] 5.3 `npm run lint`, `npm run build` y la suite completa pasan. Verifica:
      salida de los tres.
- [x] 5.4 Si alguna corrección de David deja un patrón, agregarlo a
      `tasks/lessons.md`. Verifica: la entrada, o la nota de que no hubo.

## Notas de implementación

- Hallazgo fuera de alcance: `/admin/caja/movimientos` (redirige a Arqueos ›
  Movimientos) tira "Rendered more hooks than during the previous render" en
  el navegador, a 390 y 1280px. Existía antes de este cambio; queda para
  investigar aparte.
- 3.3, alcance ampliado (decidido por David): además del menú, el detalle de
  pedido y el de arqueo también pasaron a `Sheet`. `SheetContent` devuelve el
  foco al elemento que lo tenía al abrir (Radix sin `Trigger` lo dejaba en
  `<body>`) y acepta `overlayClassName` para conservar el fondo de antes.
- 5.2: a 1280px con mouse, 20 pantallas contra `main` (en otro checkout):
  iguales salvo categorías (flechas a 24px) y alta de empleado (link
  subrayado), más antialiasing en Dashboard (93px) y Zonas (7px). Menú del
  celular antes/después: igual a la vista.
- 5.3: suite completa 100 de 100, lint sin errores, build OK.
- 5.4: sin correcciones de David; se agregaron las lecciones 41 (Radix sin
  Trigger no devuelve el foco) y 42 (una captura depende de dónde quedó el
  mouse).
