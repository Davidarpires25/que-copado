# Proposal

## Why

El panel se usa con mouse y mirando la pantalla. Quien lo usa con lector de
pantalla escucha "botón" sin saber qué hace, y quien lo usa con teclado no
llega a algunos controles o no puede salir de otros. Se auditó con axe-core
(WCAG 2.2 AA) en 61 pantallas —las 30 rutas del panel a 390 y 1280px, más el
menú lateral abierto— y se probó a mano lo que axe no ve: lo que solo se nota
usando el teclado.

## Qué se rompe hoy en el local

Nada se cae para quien usa el panel como hoy. Lo que falla es para quien no
puede usarlo así:

- **178 botones sin nombre en 29 pantallas.** Los botones de un solo ícono
  (lápiz, tacho, flechas) tienen un tooltip al pasar el mouse, pero el tooltip
  no es su nombre: un lector de pantalla dice "botón" y nada más. Lo mismo los
  13 interruptores (activa, visible, agotado), las casillas de selección y los
  16 selectores desplegables, cuya etiqueta está dibujada al lado pero no
  asociada.
- **8 campos sin etiqueta**: el control de producción y la cantidad de la ficha
  técnica, y el selector de rol en Equipo.
- **Controles que no se alcanzan con el teclado.** Las filas de medio de pago
  del cobro son `<div>` con click: con Tab no se llega a elegir Efectivo o
  Tarjeta. Las filas de Pedidos se abren con click y no con Enter. Una tabla
  que se desliza no se puede deslizar con el teclado.
- **El menú lateral del celular no es un diálogo**: no se cierra con Escape, el
  foco se escapa a la página de atrás mientras está abierto, y un lector de
  pantalla no avisa que se abrió.
- **Un campo invisible que recibe el foco**: el margen de "Mitad y mitad" está
  plegado con opacidad 0 pero Tab entra igual.
- **Flechas de reordenar categorías de 18px con mouse.** WCAG 2.5.8 (AA) pide
  24px aun con mouse; en el cambio anterior se llevaron a 44 solo con el dedo.
- **Estructura**: niveles de título que saltan (h1 → h3), dos `<nav>` sin
  nombre que un lector no distingue, encabezados de tabla vacíos, y un link
  ("Crear un rol nuevo") que solo se distingue por el color.

## What Changes

- Todo botón, interruptor, casilla y selector del panel tiene nombre
  accesible; los de un solo ícono usan el mismo texto que su tooltip.
- Todo campo tiene una etiqueta asociada.
- Todo lo que se hace con click se puede hacer con el teclado: las filas de
  medio de pago pasan a ser controles reales, las filas de Pedidos se abren con
  Enter, las tablas que se deslizan reciben el foco.
- El menú lateral del celular se comporta como un diálogo: se anuncia, atrapa
  el foco, se cierra con Escape y devuelve el foco al botón que lo abrió.
- Lo que está plegado o escondido no recibe el foco.
- Con mouse, todo control mide al menos 24×24px (WCAG 2.5.8).
- Títulos en orden, `<nav>` con nombre, encabezados de tabla con texto
  (aunque sea solo para lectores), y el link del texto subrayado.
- Un test con axe-core recorre el panel y falla si reaparece cualquiera de
  estas violaciones; otro recorre con el teclado los flujos que axe no ve.

## Capabilities

### New Capabilities

- `panel-accesible`: qué tiene que cumplir el panel para usarse con lector de
  pantalla y con teclado.

### Modified Capabilities

- `panel-en-el-celular`: el requisito de área de toque decía que con mouse
  "el panel se ve como hoy"; pasa a remitir al mínimo de 24×24px con mouse de
  `panel-accesible`.

## Fuera de alcance

- **Contraste de colores** (141 elementos en 21 pantallas): va en un cambio
  aparte, porque es tocar la paleta del tema claro y hay que verlo con los
  ojos. Ya estaba anotado como deuda.
- **La tienda pública**: la auditoría fue sobre el panel.
- **Los controles del mapa de zonas** (Leaflet/Geoman): son de una librería;
  sus links sin nombre quedan anotados.
- **El ojo de mostrar contraseña del login** tiene `tabIndex={-1}` a propósito:
  mostrar la contraseña no es necesario para entrar. Se le agrega nombre, pero
  no se lo lleva al orden de Tab.
- **"Cambiar email" en Equipo** usa `window.prompt`, que es accesible por ser
  del navegador. Reemplazarlo por un diálogo propio es otra decisión.

## Impact

- **Solo este repo.** No toca AgentePOS ni el contrato HTTP del agente.
- Sin cambios de base de datos ni de server actions.
- Código afectado: componentes base (`components/ui/`: tooltip, switch,
  checkbox, select, bottom-sheet), `components/admin/layout/` (menú lateral),
  `components/admin/caja/payment-methods.tsx`, `app/admin/orders/orders-table.tsx`,
  `components/admin/stock/ficha-tecnica-view.tsx`, los formularios del panel
  (etiquetas de selectores) y las pantallas con botones de ícono (unos 32).
- Visual: con mouse solo cambian las flechas de reordenar categorías (de 18 a
  24px) y el subrayado del link de roles. Lo demás es semántica.
- Nuevo: `axe-core` pasa a ser dependencia de desarrollo explícita (hoy llega
  de rebote por otra dependencia) y nuevo test `e2e/admin-accesible.spec.ts`.
