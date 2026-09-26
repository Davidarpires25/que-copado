# Proposal

## Why

El panel se diseñó para la computadora del local, pero cargar un producto,
corregir un precio o mirar el stock desde el celular es lo que se hace cuando
no se está en el local, y hoy varias de esas tareas **no se pueden hacer**.

Se midió con Playwright a 390×844 (un celular común) recorriendo las 29
pantallas del panel sobre el stack local, una vez con mouse y otra en modo
táctil. Lo que sigue es lo que se vio en las capturas y en los números, no lo
que se deduce del código.

## Qué se rompe hoy en el local

- **No se puede crear ni editar un producto desde el celular.** El formulario
  tiene dos columnas lado a lado y la derecha mide 420px fijos, así que nunca
  se apilan: se superponen. El campo "Nombre" queda de 26px de ancho, la
  descripción muestra una letra por renglón, los cuatro botones de "Tipo de
  producto" quedan uno encima del otro, y la página desborda 111px a lo ancho.
- **El botón de guardar se sale de la pantalla.** En los formularios de
  producto, categoría, insumo, empleado y rol, el título y los botones
  Cancelar/Guardar comparten una fila que no entra: el título se parte en dos o
  tres renglones y "Crear Ingrediente" o "Guardar Cambios" quedan cortados en el
  borde derecho.
- **La columna para editar una fila no se ve.** Las tablas de productos,
  recetas, stock, insumos y equipo desbordan (de 33 a 464px) y lo que queda
  afuera es justo la columna de acciones. Nada indica que haya que deslizar la
  tabla. En stock, además, los encabezados "Stock Actual" y "Estado" se pisan.
- **La ficha técnica desborda 131px** y el costo total queda cortado.
- **La caja muestra dos barras con botón de menú**, una encima de la otra. La
  barra del turno se desliza de costado (390→584px) y "Cerrar caja" queda fuera
  de la vista.
- **En Analytics, el selector de período le come el ancho al título** de cada
  tarjeta: "Rentabilidad por Producto" se lee una palabra por renglón.
- **Casi nada se toca bien con el dedo.** En modo táctil hay 298 controles por
  debajo de 44×44px en las 29 pantallas. La mayoría son los botones, campos y
  selectores base del panel (36px de alto); los peores son las flechas para
  reordenar categorías (18×18px), las de mesas (24×24px) y el ícono de ayuda de
  los campos (14×14px). En mesas, además, el nombre queda cortado ("Mesa 1 (…").
- **La barra de arriba no dice dónde estás y tiene un logo falso.** Muestra un
  cuadrado amarillo con el ícono de gorro de chef —el mismo que usa "Cocina" en
  el menú— en lugar del logo del local, que sí está en el menú lateral. No dice
  en qué sección estás, y las alertas de stock solo se ven abriendo el menú.

Lo que ya funciona y no se toca: el menú lateral (drawer), la caja para cargar
un pedido (el botón flotante del pedido anda bien), pedidos, cocina, arqueos,
dashboard, configuración y mi cuenta.

## What Changes

- **Barra superior nueva en celular**: menú a la izquierda, el nombre de la
  sección donde se está, y a la derecha la campana con las alertas de stock. El
  logo falso se va; el logo real queda en el menú lateral.
- El formulario de producto apila sus columnas en pantallas angostas.
- El encabezado de los formularios (título + Cancelar/Guardar) se acomoda en dos
  filas cuando no entra, como ya lo hacen recetas y compras.
- En las tablas del panel, la columna de acciones queda siempre a la vista; lo
  que se desliza son las columnas de datos.
- La ficha técnica, las tarjetas de Analytics y la fila de mesas se acomodan al
  ancho.
- La caja muestra una sola barra. En celular la barra del turno pasa a dos
  renglones: las acciones arriba, lo vendido y lo que hay en caja abajo. Todo a
  la vista, nada se desliza ni se oculta.
- **Todo control del panel mide al menos 44×44px de área de toque en pantallas
  táctiles**, según WCAG 2.2, criterio 2.5.5 (Target Size, Enhanced). Con mouse
  el panel se ve como hoy.
- Un test e2e recorre el panel a 390px y falla si alguna pantalla vuelve a
  desbordar a lo ancho o si aparece un control táctil de menos de 44px.

## Capabilities

### New Capabilities

- `panel-en-el-celular`: qué tiene que cumplir el panel en un celular — la
  barra superior, sin desborde horizontal de página, formularios que se
  completan y se guardan, controles de 44px, la caja en una sola barra.

### Modified Capabilities

- `tablas-del-admin`: se agrega que la acción de una fila se ve sin deslizar la
  tabla.

## Fuera de alcance

- **La tienda pública** (catálogo, carrito, checkout): se eligió el admin. Usa
  los mismos componentes base, así que el tamaño táctil se aplica solo dentro
  del panel y la tienda no cambia.
- **Tablet**: se eligió celular. Lo que se arregle a 390px probablemente mejore
  la tablet, pero no se mide ni se promete acá.
- **Dibujar zonas de envío desde el celular.** El mapa se ve; dibujar polígonos
  con el dedo es otro problema. Los controles del mapa (Leaflet, Geoman) quedan
  fuera de la regla de 44px.
- **Las páginas de impresión** (ticket, comanda, ficha, planilla, reporte): se
  imprimen desde la computadora.
- **El reporte de costos** desliza a lo ancho por tener muchas columnas
  numéricas; no tiene acciones por fila y se lee igual deslizando.
- **Rediseñar el dashboard** (las cuatro tarjetas una debajo de otra ocupan la
  pantalla entera). Se ve bien; es una decisión de diseño, no un defecto.
- **Barra de pestañas inferior.** Se evaluó y se eligió la barra superior con la
  sección: sirve igual para todos los roles y no compite con el botón flotante
  de la caja.
- **El contraste del tema claro** (deuda ya conocida, cambio aparte).
- **Qué cuenta como alerta de stock.** La campana muestra el mismo número que
  hoy muestra el menú; si ese número está bien lo resuelve
  `las-alertas-dicen-la-verdad`.

## Impact

- **Solo este repo.** No toca AgentePOS ni el contrato HTTP del agente.
- Sin cambios de base de datos ni de server actions: es CSS/markup de
  componentes cliente.
- Código afectado:
  - Barra superior: `components/admin/layout/admin-shell.tsx`,
    `app/admin/admin-route-shell.tsx`, `app/admin/caja/caja-dashboard.tsx`, y el
    encabezado standalone de `components/admin/layout/admin-layout.tsx`, que no
    se usa y tiene la otra copia del logo falso.
  - Tamaño táctil: los componentes base de `components/ui/` (button, input,
    select, switch, checkbox, number-input) con una variante que solo aplica
    dentro del panel, y los `<button>` escritos a mano en `components/admin/**`
    y `app/admin/**`.
  - Formularios, tablas y pantallas: `components/admin/products/product-form-page.tsx`,
    cinco `*-form-page.tsx`, las tablas de `app/admin/*` y
    `components/admin/stock/*`, `ficha-tecnica-dialog.tsx`,
    `analytics/chart-container.tsx`, `app/admin/tables/tables-dashboard.tsx`,
    `categories/category-list.tsx`, `components/ui/ayuda-campo.tsx`,
    `caja/shift-bar.tsx`.
- **Es un cambio grande en superficie** (decenas de archivos), pero cada
  arreglo está detrás de un breakpoint o de `pointer: coarse`: con mouse y a
  ≥1024px nada cambia, y el test lo afirma.
- Riesgo: la caja se usa todos los días en la computadora del local. Todo cambio
  ahí tiene que dejar el escritorio igual que hoy.
- Nuevo test: `e2e/admin-celular.spec.ts`.
