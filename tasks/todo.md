# Control de stock: ajuste por estado real y quitar proyecciones falsas

**Fecha:** 2026-09-11
**Disparador:** Rocío no pudo cargar el inventario del 10/09 y lo resolvió por WhatsApp.

## Contexto

Dos problemas distintos, ambos confirmados contra la base de producción.

1. **El diálogo pedía un delta; el usuario piensa en un estado.** Escribir `0` en "Cantidad" no
   habilitaba el confirmar (para el sistema `0` es "no muevas nada"). Para bajar stock había que
   usar "Desperdicio" y calcular la diferencia a mano. Resultado: 25 movimientos de merma cuyo
   motivo dice "ajuste"/"correccion". Ninguno era merma real. "Devolución" tenía **0 usos** en
   toda la vida del sistema.
2. **"Agota en" y "Promedio/día" dividían por días calendario.** En los últimos 30 días había
   ventas de 2 días, pero ambos dividían por 30: "Paty" mostraba ~257d teniendo para ~8 jornadas;
   "huevo chico" mostraba ~30d teniendo para 1.

## Tareas

- [x] Rediseñar `stock-adjust-dialog.tsx`: toggle de dos acciones en vez de tres tipos
  - [x] **Corregir stock**: pide el stock REAL (precargado), el sistema calcula el delta y lo
        muestra (`Diferencia −13 u`). Motivo opcional. Escribir `0` ahora es válido.
  - [x] **Registrar merma**: sin cambios de comportamiento (cantidad positiva que resta, motivo
        de texto libre obligatorio)
  - [x] Eliminar "Devolución"
  - [x] "Stock mínimo" visible sólo en modo Corregir
- [x] `adjustStock`: `validTypes` sin `'return'`, validar que merma siempre reste, motivo
      obligatorio sólo para merma (corrección cae en "Recuento de inventario")
- [x] Eliminar la feature "Agota en" completa (`getStockForecast`, `StockForecastItem`, columna,
      `forecastMap`, props en dashboard y page)
- [x] Quitar la columna "Promedio/día" de Consumo y `daily_avg` del tipo y del server action
- [x] Sacar `'return'` del union `StockMovementType`, de los labels y de los `Record` de
      `movements-tab.tsx`
- [x] Migración `031_reclasificar_mermas_que_eran_ajustes.sql`: los 25 `waste` falsos → `adjustment`
- [x] Reequilibrar anchos de columna de las tablas de Stock Actual y Movimientos tras quitar
      "Agota en": `table-fixed` + porcentajes explicitos; en Movimientos, "Motivo" pasa delante de
      las columnas numericas para que la tabla cierre contra el borde derecho
- [x] Volver el diálogo al `Select` de "Tipo de movimiento" (David prefiere el aspecto original);
      se conserva sólo el cambio funcional: el campo pide el stock real
- [x] Revisar las 4 tarjetas de KPI de la pantalla de stock. Resultado: se eliminan todas y queda
      el banner de alertas como única señal superior
  - [x] "Alertas Stock": la reemplaza el banner, que dice lo mismo en forma accionable y pegado a
        la tabla. El banner además ahora cuenta todo (29) y no sólo los ingredientes (20)
  - [x] "En mesas": no aportaba. `getReservedStock` se mantiene porque `reservedMap` lo sigue
        usando en la pestaña de productos
  - [x] "Items Trackeados": mostraba el número que no importa (68 trackeados) y escondía el que sí
        (6 sin control, entre ellos carne picada)
  - [x] "Último Movimiento": saber cuándo fue el último movimiento no cambia ninguna decisión, y
        la pestaña Movimientos ya da el historial. Al eliminarla se revirtió el `getLastMovementAt()`
        que se había agregado para arreglarla

## Verificación

- [x] `npx tsc --noEmit` limpio
- [x] `npm run build` compila
- [x] `npm run lint`: 1 error preexistente en `lib/services/thermal-printer.ts` (`no-explicit-any`),
      ajeno a este cambio
- [x] Migración aplicada y verificada: `waste` pasó de 25 a **0**, `adjustment` de 83 a **108**
- [x] `/admin/stock` responde 307 (redirect a login), la ruta ya no rompe
- [ ] **Pendiente de David:** revisar el diálogo en la app (corrección a 0, corrección hacia
      arriba, merma) y los anchos de tabla en tema claro y oscuro

## Revisión

El cambio de raíz es que el formulario dejó de pedirle al usuario la aritmética que le corresponde
al sistema: ahora se escribe el número que se contó. El backend ya soportaba deltas negativos en
`adjustment`, así que no hubo que tocar la mecánica de `stock_movements` — sólo dejar de impedirlo
desde la UI y endurecer las validaciones del lado del servidor.

Ningún reporte consumía `movement_type = 'waste'`, por lo que la reclasificación no alteró ningún
número mostrado, sólo la trazabilidad. El `CHECK` de la base sigue aceptando `'return'`: no lo toqué
porque es DDL destructivo sin beneficio, y ya nada lo inserta.

### Hallazgo pendiente: stock cargado en gramos

Revisando los costos aparecieron stocks imposibles, con un patrón de factor 1000 (gramos escritos
en un campo que espera kilos):

| ingrediente | stock | valor |
|---|---|---|
| queso muzzarela | 3.498,50 kg | $34.635.150 |
| aceituna | 5.251,66 kg | $34.135.665 |
| Jamon Natural | 6.825 u | $3.992.625 |
| Tomate | 2.000,10 kg | $3.000.144 |
| Queso Tybo | 2.988 u | $1.494.000 |

El inventario figura en ~$78M. Requiere que alguien del local diga el valor real de cada uno; con
el diálogo nuevo se corrige escribiendo el número contado.

### Fuera de alcance (decidido)

- La merma sigue permitiendo dejar el stock en negativo (hay un ingrediente que llegó a `−0.343`).
  Se decidió no tocar merma en esta pasada.
- No se recupera la proyección. Si más adelante hay historial de varias semanas, el cálculo correcto
  es dividir por jornadas con ventas, no por días calendario.

Lecciones registradas: `tasks/lessons.md` #6 (delta vs. estado) y #7 (denominador temporal).

---

# Consistencia visual de las tablas del admin

**Fecha:** 2026-09-11

## Contexto

La pantalla de Categorías no seguía el patrón del resto del admin: buscador a todo el ancho en vez
de angosto, sin contador de items, botón sin el tratamiento del botón primario, y headers de tabla
con otro tono y tracking. Además, la columna "Acciones" se veía corrida en varias tablas.

## Cambios

- [x] Toolbar de Categorías igualada al patrón de `/admin/ingredients`: buscador `flex-1 max-w-xs`
      de `h-9`, contador "N categorías" al lado, acciones empujadas con `ml-auto`, botón primario
      con sombra y escala
- [x] Headers de la tabla de Categorías con el mismo estilo que el resto
      (`text-xs uppercase tracking-wide text-[var(--admin-text-muted)]/70`) y `thead` sticky
- [x] Bordes de tabla unificados: se quitó el radio de los **25** contenedores de tabla del admin.
      Convivían tres estilos — `rounded-xl` (categorías, recetas, caja, delivery-zones),
      `rounded-b-xl` (los que van pegados a una fila de tabs) y sin radio (los de stock)
- [x] Columna "Acciones" centrada en las **6** tablas del admin (header `text-center` + celda
      `justify-center gap-2`): productos, ingredientes, recetas, categorías, stock/ingredientes y
      stock/productos

## Por qué centrada y no a la derecha

Con `text-right`, el rótulo del header termina en el borde del padding de la celda, pero los botones
de acción tienen padding propio, así que el ícono nunca llega hasta ahí. Como cada tabla tiene
distinta cantidad de botones (1 en las de stock, 2 en categorías, 3 en ingredientes/recetas/productos),
el corrimiento era distinto en cada una. Centrar mantiene los íconos bajo el rótulo sin importar
cuántos sean.

## Verificación

- [x] `npx tsc --noEmit` limpio
- [x] `npm run lint` sin warnings nuevos (queda el error preexistente de `thermal-printer.ts`)
- [x] `npm run build` compila
- [ ] **Pendiente de David:** revisar las 6 tablas en pantalla, en tema claro y oscuro

---

# Pedidos: filtro por fecha (server-side)

**Fecha:** 2026-09-11

## Contexto

`getOrders()` se llamaba sin filtros, así que la pantalla traía los 43 pedidos de los 8 días que hay
en la base y crecía sin techo. Con el número de pedido reiniciándose cada día
(`021_numero_de_pedido_por_dia`), en esa lista conviven ocho "#1" distintos, y buscar por nombre no
alcanza para encontrar nada.

## Cambios

- [x] `lib/utils/order-date-range.ts`: helper compartido server/cliente que calcula el rango de cada
      preset **en hora Argentina**. Si se usara la zona del navegador, un pedido de las 22:00 se
      vería como del día siguiente y no cuadraría con su `#N`. Argentina no tiene DST desde 2009,
      así que el offset `-03:00` va fijo y no hace falta una librería de zonas
- [x] `app/admin/orders/page.tsx`: la carga inicial pide sólo el período `today`
- [x] Selector **Hoy / Ayer / Últimos 7 días / Todos** + campo de fecha para un día puntual; cada
      cambio pide ese rango al server
- [x] Los contadores de los tabs y las 4 tarjetas se calculan sobre el período, no sobre el histórico
- [x] La columna "Hora" pasó a "Fecha" y muestra `Hoy 21:07` / `10/09 20:48`

## Decisiones que no son obvias

**El filtro en memoria se mantiene además del server-side.** El realtime inserta en la lista local
*cualquier* pedido nuevo: mirando "Ayer" se colaría uno de hoy. El server acota el volumen, el
cliente garantiza la coherencia.

**`router.refresh()` se reemplazó por `cargarPeriodo`.** El refresh re-ejecuta el server component,
que siempre pide `today`, así que pisaba el período elegido. Afectaba al botón Actualizar y a la
reconexión del canal.

**El callback de reconexión pasa por un ref actualizado en un `useEffect`.** El canal se registra una
sola vez; si capturara el período directamente quedaría congelado en el inicial. Escribir el ref
durante el render lo marca `react-hooks/refs` como error, y con razón.

**Las respuestas llevan número de petición.** Cambiar de período rápido podía hacer que una respuesta
vieja pisara a la última.

## Verificación

- [x] Helper probado contra la base: los rangos devuelven hoy 0, ayer 19, últimos 7 días 24,
      19/06 → 3, todos 43 — los mismos números que la agregación por zona horaria
- [x] Caso borde: un pedido a las 02:24 UTC del 11/09 se resuelve como 10/09 argentino
- [x] `npx tsc --noEmit` limpio, `npm run lint` sin warnings nuevos, `npm run build` compila
- [ ] **Pendiente de David:** probar los presets, el campo de fecha, el botón Actualizar y que un
      pedido nuevo entrando por realtime aparezca sólo si cae en el período visible

## Nota

Abre en "Hoy". Con los datos actuales eso da lista vacía (el último pedido es del 10/09); la pantalla
lo dice y el botón limpia los filtros. Cambiar el default es editar `PERIODO_INICIAL` en
`app/admin/orders/page.tsx`.

---

# Cuenta propia: nombre, email y contraseña

**Fecha:** 2026-09-11

## Contexto

Ningún usuario podía cambiar nada de su cuenta. `profiles` tiene una sola policy de escritura
(`admin edita perfiles`, `USING is_admin()`), y todas las acciones de `employees.ts` exigen
`users.manage`. Un cajero no podía cambiar ni su nombre ni su contraseña.

**Restricción que ordena el diseño: el proyecto no manda mails.** `createEmployee` usa
`email_confirm: true` ("el dueño le pasa la clave en persona") y `resetEmployeePassword` dicta una
clave temporal en vez de mandar recuperación. Por eso el cambio de email se aplica al instante con
service role, no por el flujo de confirmación de Supabase.

## Cambios

- [x] `app/actions/account.ts`: `updateMyName`, `updateMyEmail`, `updateMyPassword`, `getMyAccount`.
      Ninguna pide `requirePermission` —son acciones sobre uno mismo— y todas resuelven el id con
      `getAuthUser()`, nunca desde un parámetro
- [x] `/admin/mi-cuenta` (page + form), sin permiso especial
- [x] El bloque de perfil del sidebar pasó a ser el acceso a esa pantalla
- [x] `updateEmployeeEmail` en `employees.ts` + botón "Email" en `/admin/empleados`, como red de
      rescate

## Decisiones que no son obvias

**No puede vivir en `/admin/settings`.** Los roles `cajero` (9 permisos) y `cocina` (4) no tienen
ningún permiso `settings.*`: ahí dentro no podrían cambiar su contraseña. La ruta nueva sólo exige
sesión, y `lib/supabase/middleware.ts` verifica sesión pero no permisos, así que alcanza.

**La contraseña actual se verifica con un cliente descartable.** `createClient` con
`persistSession: false` + `signInWithPassword`. No sirve `createAdminClient()`, que está atado a las
cookies del request: un `signInWithPassword` ahí reescribiría la sesión en curso. Sin esta
verificación, cualquiera que encuentre una pestaña abierta se queda con la cuenta cambiando el email.

**`updateMyName` escribe sólo `full_name`.** Incluir `role` o `is_active` en ese payload sería el
agujero por el que un cajero se haría admin. Por eso tampoco se agregó una policy RLS "editar mi
perfil": Postgres no restringe columnas dentro de una policy, así que sería más riesgoso que la
server action.

**El email se escribe dos veces.** El cambio es inmediato y nadie verifica que la casilla exista; un
tipeo deja al usuario afuera. De ahí también la red de rescate del admin.

**`revalidatePath('/admin', 'layout')`** tras cambiar el nombre: `getCurrentUserInfo()` alimenta el
sidebar desde el layout y está cacheada por request.

## Verificación

- [x] `npx tsc --noEmit` limpio, `npm run lint` sin warnings nuevos, `npm run build` compila y la
      ruta `/admin/mi-cuenta` aparece en el manifiesto
- [x] `lib/supabase/middleware.ts` sólo chequea sesión → la ruta alcanza a todos los roles
- [x] FK `profiles_role_fkey` confirmada, y la consulta de `getMyAccount` probada vía REST:
      devuelve `full_name`, `role` y `roles.name`
- [ ] **Pendiente de David (requiere login):**
  - cambiar nombre → el sidebar se actualiza; confirmar en `profiles` que `role` e `is_active` no
    cambiaron
  - contraseña actual incorrecta → las tres operaciones sensibles deben rechazar
  - cambiar contraseña → cerrar sesión y entrar con la nueva
  - email ya existente → "Ya existe una cuenta con ese email"
  - **la prueba que más importa:** entrar con el usuario `Jose` (rol `cajero`), confirmar que llega a
    `/admin/mi-cuenta` y puede cambiar su contraseña aunque no vea Configuración, y que su `role`
    sigue siendo `cajero` después de guardar el nombre

## Fuera de alcance

- Recuperación por mail ("olvidé mi contraseña"): necesita SMTP y contradice el patrón actual.
- Foto de perfil, 2FA, historial de sesiones.
- Cambiar el propio rol: sigue siendo exclusivo del admin.

---

# Sub-recetas: semántica unificada y rendimiento

**Fecha:** 2026-09-11

## Contexto

Las sub-recetas las pidió el dueño, están casi completas y tienen **0 registros** cargados. Dos
razones, y una era un bug latente:

1. **El que escribe no coincidía con los que leen.** Los tres colectores que deciden si alcanza el
   stock resolvían el compuesto a sus componentes (`if/else`); `deductIngredientCascade`, el único
   que descuenta, bajaba el stock del compuesto **y además** el de los componentes. El sistema
   verificaba una cosa y ejecutaba otra. Nunca se manifestó porque no había sub-recetas.
2. **No había rendimiento.** Las cantidades se expresaban "por 1 unidad base del compuesto", así que
   cargar una preparación obligaba a dividir a mano.

**Definición del negocio (confirmada con David):** las preparaciones se hacen en el momento, no se
guardan. La sub-receta es una agrupación de componentes y al vender se descuentan los componentes.

## Cambios

- [x] `lib/server/sub-recipes.ts`: `escalarComponente` y `rendimientoEfectivo`, regla única
- [x] Los **5** sitios que copiaban `sub.quantity * actualQty` pasan por el helper
- [x] `deductIngredientCascade` alineado con los colectores: si hay componentes, se resuelve a ellos
      y retorna sin descontar de sí mismo
- [x] Migración `032_rendimiento_de_sub_recetas.sql`: `ingredients.yield_quantity` (default 1,
      `CHECK > 0`), aplicada
- [x] `recalculateParentCost` divide el costo de la tanda por el rendimiento
- [x] Campo "¿Cuánto rinde esta preparación?" en el diálogo; el resumen ahora muestra la tanda
      (`1.5 kg = 1kg mayonesa + 0.5kg ketchup`) en vez del viejo `1 kg = …`
- [x] Combinación sin sentido cerrada: guardar componentes apaga `stock_tracking_enabled` del
      compuesto, y `toggleStockTracking` rechaza activarlo explicando por qué

## Verificación

- [x] `npx tsc --noEmit` limpio, `npm run lint` sin warnings nuevos, `npm run build` compila
- [x] Migración aplicada sin tocar datos: los 62 ingredientes quedaron con `yield_quantity = 1`,
      que es la identidad de la división
- [x] Helper probado con casos: `null` / `0` / ausente → rendimiento 1 (comportamiento previo);
      `1kg mayo` con rinde `1.5` sobre `0.03` de uso → `0.02`; y la propiedad de conservación
      (los componentes de una tanda suman la tanda)
- [x] Cobertura: `grep "sub.quantity \*"` da **0** — no quedó ninguna copia de la fórmula
- [ ] **Pendiente de David (requiere caja y login):**
  - crear "salsa de la casa" (kg) = `1kg mayonesa + 0.5kg ketchup`, rinde `1.5`; el costo debe dar
    `(mayo×1 + ketchup×0.5) / 1.5`
  - confirmar que el switch de stock de la salsa queda apagado y que activarlo da el mensaje
  - poner `0.03 kg` de salsa en la receta de un elaborado y venderlo: en `stock_movements` tiene que
    haber `sale` de **mayonesa y ketchup solamente**, ninguno de la salsa
  - cancelar el pedido y verificar que la reversión devuelve lo mismo que descontó

## Nota sobre la verificación

No creé la sub-receta de prueba yo: habría implicado insertar y borrar un ingrediente en la base de
producción de un local en funcionamiento, con recálculos de costo de por medio. El riesgo no se
justifica para una prueba que David puede hacer desde la UI en dos minutos.

## Fuera de alcance

- Stock propio de las preparaciones y pantalla de producción: sólo tienen sentido si se prepara por
  tanda y se guarda. Si eso cambia, `yield_quantity` es justamente el dato que haría falta.
- Sub-recetas anidadas a más de un nivel: el código las soporta con detección de ciclos, no se
  probaron.

---

# Stock: descuento atómico en una transacción

**Fecha:** 2026-09-11
**Origen:** auditoría del sistema de stock

## Contexto

Cuatro problemas con una causa común: el descuento escribía a medida que recorría el árbol de
recetas, fuera de toda transacción y sin esperar el resultado.

## Cambios

- [x] Migración `033_descuento_de_stock_en_una_transaccion.sql` con dos RPC, siguiendo el patrón de
      la 029 (`security invoker`, `set search_path`, `returns jsonb`), **aplicada**:
  - `aplicar_movimientos_de_stock(p_order_id, p_movimientos)`: `UPDATE ... SET current_stock =
    current_stock - qty RETURNING` + `INSERT` del movimiento, todo en una transacción. Corta si el
    pedido ya descontó. Devuelve los ítems que quedaron en negativo
  - `revertir_movimientos_de_stock(p_order_id)`: ídem, y corta si ya existe un `sale_reversal`
- [x] `lib/server/stock-deduction.ts` separa calcular de aplicar: `collectIngredientCascade` y
      `collectElaboradoStock` **acumulan** en un `Map` en vez de escribir, y `deductStockForOrder`
      hace **una** llamada a la RPC. `deductReventaStock` desapareció (su descuento es una línea del
      acumulador)
- [x] `restoreStockForOrder` delega en la RPC de reversión
- [x] `after()` de `next/server` en `tables.ts:566` y `pos-orders.ts:335` en lugar de la promesa
      suelta. Quedan **0** promesas flotantes en el flujo de stock
- [x] Las ventas que dejan stock en negativo quedan registradas (antes no se distinguían de una
      venta normal)

## Qué resuelve

| Problema | Cómo |
|---|---|
| El descuento podía no ejecutarse (serverless) | `after()` garantiza la ejecución sin bloquear la respuesta |
| Carrera entre ventas simultáneas | El `UPDATE` es relativo: la resta la hace Postgres sobre el valor vigente |
| Stock y movimiento no atómicos | Ambos dentro de la misma transacción; `previous_stock`/`new_stock` salen del `RETURNING` |
| Reversión duplicaba stock | La RPC corta si ya hay `sale_reversal` |

## Verificación

- [x] **Línea de base antes de tocar nada:** 58 ingredientes, 57 reconstruyen exacto desde su
      historial, 364 movimientos, 228 `sale`. **Después del cambio: idéntico**
- [x] Guard de idempotencia probado contra un pedido real que ya descontó → `duplicado: true`,
      `aplicados: 0`, sin tocar nada
- [x] Guard de reversión duplicada probado → `duplicado: true`, `revertidos: 0`
- [x] Camino feliz probado dentro de `BEGIN/ROLLBACK`: aplicó 2 movimientos y **detectó el negativo**
      (`salsa` de 1 a −4), que es exactamente el caso que antes pasaba sin rastro. El rollback dejó
      los 364 movimientos y los stocks intactos
- [x] `npx tsc --noEmit`, `npm run lint` sin warnings nuevos, `npm run build` compila
- [ ] **Pendiente de David (requiere caja):**
  - vender un elaborado con ingredientes trackeados y comparar los `sale` con los de una venta
    anterior del mismo producto: mismas cantidades, y `previous_stock` encadenando con el
    `new_stock` previo
  - vender un producto de reventa con tracking y confirmar que sigue auto-agotándose al llegar a 0
  - cancelar un pedido cobrado: la suma de `sale` + `sale_reversal` de ese pedido debe dar 0
  - cobrar y refrescar stock enseguida: el descuento tiene que estar siempre

## Cuidado tomado

Al eliminar `deductReventaStock` se perdía el auto-agotado de productos de reventa, que esa función
hacía tras escribir. Se repuso: después de aplicar la RPC se re-sincroniza cada producto afectado
con su stock ya actualizado. **Es lo que hay que mirar primero si algo falla en reventa.**

## Fuera de alcance

- Bloquear ventas sin stock: decisión de producto ya tomada en sentido contrario; la caja avisa con
  `StockAlert` sin deshabilitar el botón.
- Recetas con valores imposibles (*Burger Clásica* con 2302 g de papa, *Tomate 1 g*): son datos.
- `convertToBaseUnit` ante una unidad desconocida devuelve la cantidad sin convertir, en silencio.

---

# Ajustes: reiniciar el control de stock

**Fecha:** 2026-09-11

## Contexto

Lo cargado en stock fueron en buena parte pruebas y datos mal ingresados: 5.251 kg de aceituna,
3.498 kg de muzzarella, un ingrediente que llegó a −554, y un inventario que figura en $78M.

La Zona de peligro ya tenía "Movimientos de Stock", pero **borraba el historial sin tocar
`current_stock`**. Usarla dejaba un estado peor que el inicial: 47 ingredientes con cantidades y
cero movimientos que las expliquen, con lo cual el historial dejaba de reconstruir el stock — la
única forma de auditar cómo se llegó a un número.

## Cambios

- [x] Migración `034_reiniciar_el_control_de_stock.sql`, **aplicada**: RPC
      `reiniciar_control_de_stock()` que en una transacción borra los movimientos, pone
      `current_stock = 0` y **apaga** `stock_tracking_enabled` en ingredientes y productos
- [x] `resetStockControl()` en `data-management.ts`, con `requirePermission('settings.manage')`,
      **reemplaza** a `deleteAllStockMovements`
- [x] La entrada de la Zona de peligro pasó de "Movimientos de Stock" a **"Control de Stock"**, con
      la advertencia completa de lo que hace

## Por qué apaga el control y no sólo pone 0

Con 60 ingredientes y 8 productos trackeados, dejar el control encendido con todo en 0 hace que la
sincronización de disponibilidad —que se dispara sola en la próxima venta o ajuste— marque como
agotado todo lo que dependa de esos ingredientes: **el catálogo público quedaría vacío**. Apagándolo
se vuelve al estado previo a activar stock, y se reactiva a medida que se carga inventario real.

## Qué se conserva

`min_stock` (50 ingredientes lo tienen), `cost_per_unit`, las recetas y los productos. Son
configuración, no datos de prueba. De los `is_out_of_stock` se limpian **sólo** los que había puesto
el sistema (`auto_disabled`); si alguien marcó un producto como agotado a mano, esa decisión se
respeta.

## Verificación

- [x] La RPC probada dentro de `BEGIN/ROLLBACK`: deja movimientos en 0, trackeados en 0, stock en 0
      y auto-agotados en 0, **conservando** los 50 `min_stock` y los costos
- [x] Post-rollback todo intacto: 364 movimientos, 60 trackeados, 47 con stock, 10 auto-agotados
- [x] `npx tsc --noEmit`, `npm run lint` sin warnings nuevos, `npm run build` compila
- [ ] **Pendiente de David:** ejecutarla desde `/admin/settings` cuando decida. **No la ejecuté.**

## Antes de usarla

Corre sobre **producción** y no hay deshacer ni backup automático en el proyecto. Conviene exportar
`ingredients` y `stock_movements` antes.

Y tener presente que borra también los **228 movimientos `sale`**: el reporte de Consumo Histórico
queda vacío. Si ese historial de ventas importa, hay que exportarlo primero.

---

# Impresora térmica: fecha correcta y robustez

**Fecha:** 2026-09-11
**Origen:** revisión del sistema de impresión tras los cambios de la sesión

## Primero: no había regresiones

Se verificó punto por punto que los cambios de la sesión **no rompieron la impresión**:
`print.ts` arma su propio `orderLabel` (`"Mesa 5"`/`"Mostrador"`) y no usa el helper de
`lib/utils/order-number.ts`; sigue leyendo `order.order_number`, que no cambió; la impresión se
dispara desde los componentes de caja, no desde los flujos donde se metió `after()`; y el servicio
no toca nada de stock.

Lo que apareció son bugs preexistentes, uno de ellos grave.

## Cambios

- [x] **Zona horaria.** `now()` usaba `new Date().toLocaleDateString('es-AR')` **sin `timeZone`**.
      El server action corre en Netlify (UTC), así que un ticket de las 21:07 hora argentina salía
      como `11/09, 12:07 a. m.` Ahora `fechaDelPedido()` fija
      `America/Argentina/Buenos_Aires`, el mismo criterio de `lib/utils/order-date-range.ts`
- [x] **Fecha del pedido, no del reloj.** Se toma `order.created_at` en lugar del instante de
      encolar: reimprimir el ticket de ayer le estampaba la fecha de hoy
- [x] **`leftRight` ya no puede tumbar el ticket.** Con un texto derecho que ocupara la línea entera,
      `' '.repeat()` recibía un negativo y lanzaba `RangeError`, cortando la impresión completa
- [x] **Se tipó el `as any`** del import de `node-thermal-printer`. Era el **único error de lint
      que quedaba en el proyecto**: `npm run lint` ahora pasa limpio, así que cualquier error nuevo
      se ve

## Por qué la fecha importaba más de lo que parecía

El número de pedido se reinicia cada día (`021_numero_de_pedido_por_dia`). Un ticket que decía
`#15` con la fecha corrida apuntaba a un pedido que al día siguiente existía de verdad y era otro.
Ante un reclamo, el papel señalaba el pedido equivocado.

## Verificación

- [x] Probado con `TZ=UTC`, que es como corre Netlify: `2026-09-11T00:07:00Z` ahora imprime
      `10/09/2026 09:07 p. m.` (antes, `11/09/2026 12:07 a. m.`). Probado también un caso sin cruce
      de día, que no cambia
- [x] `leftRight` probado con textos absurdos (incluido uno más largo que la línea): ya no lanza;
      en el peor caso la línea hace wrap, que es preferible a perder el ticket
- [x] `npx tsc --noEmit`, **`npm run lint` sin ningún error**, `npm run build` compila
- [ ] **Pendiente de David:** imprimir un ticket real después de las 21:00 y confirmar la fecha

## Hallazgo relacionado, no tocado

`app/actions/analytics.ts:636` y `:677` tienen **el mismo patrón**: `toLocaleDateString` sin
`timeZone` dentro de un `'use server'`, y ahí se agrupan datos **por día**. Es probable que los
gráficos diarios estén corriendo las ventas de la noche al día siguiente. No se verificó a fondo.

`lib/services/order-formatter.ts` **no** tiene el problema: corre en componentes cliente, o sea en
el navegador, que está en hora argentina.

---

# Limpieza: servicio de impresión duplicado

**Fecha:** 2026-09-11

Al analizar el print-bridge apareció que **`lib/services/thermal-printer.ts` no lo importaba nadie**.
El que imprime de verdad es `print-bridge/index.js`, que corre en la PC del local: la app web sólo
encola en `print_jobs` y el bridge consume esa cola.

Consecuencia concreta: la guarda que se había puesto en `leftRight` para evitar el `RangeError`
había ido al archivo muerto. **El bridge conservaba el bug.**

- [x] Guarda de `leftRight` aplicada en `print-bridge/index.js:52`, que es el que imprime
- [x] Eliminado `lib/services/thermal-printer.ts` (163 líneas de código muerto)
- [x] Quitada la dependencia `node-thermal-printer` del `package.json` principal: sólo la usaba ese
      archivo. El bridge tiene la suya propia en `print-bridge/package.json`

El arreglo de zona horaria **sí seguía siendo válido**: `dateStr`/`timeStr` se calculan en
`app/actions/print.ts` y viajan ya resueltos dentro del job, así que el bridge los imprime tal cual.

## Verificación

- [x] `npx tsc --noEmit`, `npm run lint` **sin ningún error**, `npm run build` compila sin la
      dependencia
- [x] Guarda probada con `LINE_WIDTH=44` del bridge y un texto más largo que la línea: no lanza

---

# Print bridge: bandeja del sistema, anon key y el bug del marcado

**Fecha:** 2026-09-11

## El hallazgo grande

Buscando cómo sacar la SERVICE_ROLE del bridge apareció que **desde el 28/05 ningún job se marcaba**:

| estado | cantidad | período |
|---|---|---|
| `printed` | 22 | 25/05 → **28/05** |
| `error` | 42 | 12/05 → **28/05** |
| `pending` | 28 | 28/05 → **10/09** |

Como el bridge procesa los pendientes al arrancar, **cada reinicio de la PC del local reimprimía la
cola entera**.

**Causa:** no era el `WITH CHECK` de la policy —`'printed'` cumple la condición— sino que Postgres
exige que la fila **resultante** de un UPDATE siga siendo visible por las policies `SELECT` del rol.
La de anon es `status = 'pending'`, así que al pasar a `printed` la fila desaparece de su vista y el
UPDATE se rechaza con *"new row violates row-level security policy"*. Se confirmó agregando una
policy SELECT permisiva dentro de una transacción con rollback: con ella, el UPDATE pasa.

Ampliar el SELECT de anon lo arreglaría, pero expondría todos los `print_jobs` —llevan items,
totales y nombres de clientes— a cualquiera con la anon key, que es pública.

## Cambios

- [x] Migración `035_el_bridge_marca_sus_jobs.sql`, **aplicada**: `marcar_print_job(id, status,
      error)` `security definer`, que sólo acepta `printed`/`error` y sólo actúa sobre jobs
      `pending` (idempotente). `grant execute` a anon; el resto revocado
- [x] El bridge marca vía RPC en lugar de UPDATE directo
- [x] **La anon key pasó a ser la predeterminada.** Antes se exigía la SERVICE_ROLE —que saltea toda
      la RLS— en un `.exe` que vive en la PC del local. Se sigue aceptando, avisando
- [x] Guarda de `leftRight` (el `RangeError` que abortaba el ticket) aplicada acá, que es donde
      corre de verdad
- [x] **Ícono en la bandeja del sistema** (`tray.js`): estado por color, "Imprimir prueba", "Ver
      registro" y "Salir". Íconos ICO 16x16 generados y validados con `file`
- [x] **Registro a archivo** (`print-bridge.log`, junto al ejecutable o en la carpeta del usuario si
      ese directorio es de sólo lectura): sin consola hay que poder ver qué pasó
- [x] `pkg` configurado para llevarse los íconos y el binario de la bandeja dentro del `.exe`

## La regla que casi rompo

`tray.js` dice que la bandeja nunca puede tumbar la impresión — y en la primera versión **la tumbó**:
`systray2` lanza su binario con `spawn` y el fallo llega como excepción no capturada, que ningún
`try/catch` atrapa. Quedó cerrado con tres capas: `onError`, `chmod` sobre el binario **y su copia en
la caché del usuario** (que es la que realmente se ejecuta), y un guard de `uncaughtException`
deliberadamente estrecho, que sólo ignora errores cuyo rastro menciona a la bandeja y **vuelve a
lanzar** cualquier otro.

Verificado: con la bandeja fallando, el bridge arranca, se suscribe a Realtime y **sigue vivo**
(exit 124 por timeout, no por caída).

## Verificación

- [x] La anon key lee pendientes y ahora marca vía RPC, probado con `set local role anon` y rollback
- [x] El RPC es idempotente (segunda llamada devuelve `false`) y rechaza reabrir un job
      (`'pending'` da excepción)
- [x] Bridge corrido de punta a punta con anon: arranca, procesa, marca y queda escuchando
- [x] El log se escribe
- [ ] **Pendiente de David — necesita Windows:** compilar con `npm run build:win` y confirmar que el
      ícono aparece en la bandeja, que "Imprimir prueba" saca papel y que el `.exe` arranca sin
      ventana de consola. **No tengo Windows, así que la bandeja no se pudo ver funcionando**; sí se
      verificó lo contrario, que su fallo no rompe nada

## Efecto colateral de las pruebas

Correr el bridge real contra la base con una impresora inexistente cerró los **28 jobs pendientes**
como `error`. El efecto neto es bueno —se habrían reimpreso todos juntos en el próximo arranque—
pero no fue deliberado. Se pueden devolver a `pending` si hiciera falta.

---

# Print bridge: resultado de las pruebas en Windows

**Fecha:** 2026-09-11

Se probó en una PC con Windows 11 a través de otra sesión, en siete rondas. Resumen de lo que
quedó, para no repetir el camino.

## Funciona, verificado en Windows

- Arranca **sin ventana de consola** con `iniciar-oculto.vbs`
- El proceso de la bandeja se lanza (`tray_windows_release.exe` confirmado con `tasklist`)
- **Una sola instancia**: mutex de puerto en `127.0.0.1:47113`, confirmado con `netstat`
- **Los errores quedan en `print-bridge.log`**, incluido el fallo de conexión

## Limitación conocida: el menú de la bandeja no responde

Los clicks **no llegan al proceso principal** cuando corre empaquetado con `pkg`: no aparece ni el
evento ni un error, en ninguno de los dos lados. El canal de comunicación con el binario de la
bandeja no funciona bajo `pkg`, y arreglarlo implicaría cambiar de librería o de empaquetador.

Decisión: el ícono queda **sólo como indicador de presencia**. Se quitaron del menú los items que no
respondían —un botón que no hace nada es peor que no tenerlo— y sus funciones pasaron a dos
archivos independientes:

- `probar-impresora.bat` → corre el exe con `--probar`, imprime un ticket y dice si respondió
- `ver-registro.bat` → abre el log

## Tres bugs encontrados gracias a probar en Windows

| Bug | Por qué no se veía en Linux |
|---|---|
| El `.exe` no arrancaba (exit 4, sin salida) | Era el target `node22-win-x64`. Con `node18-win-x64` anda. El mismo bundle compilado para Linux funcionaba, lo que descartó "bundle corrupto" |
| Sin lock: dos instancias imprimían todo dos veces | Nunca se corrió dos veces a la vez |
| 10 `console.*` que no llegaban al log | En Linux la consola está visible, así que los mensajes se veían igual |

El primer intento de lock fue **por PID y estaba mal por diseño**: el número se recicla y un cierre
forzado deja el archivo huérfano. Se reemplazó por el mutex de puerto, que el sistema operativo
libera siempre.

## Otro hallazgo: los archivos llegaban bloqueados

Windows marca como "de Internet" los archivos copiados de otra máquina y pide confirmación en cada
ejecución, lo que rompía el arranque automático. El instalador ahora corre `Unblock-File` sobre la
carpeta antes de programar la tarea.

## Pendiente, y no se puede resolver ahí

**La impresión real nunca se probó.** Esa PC no tiene impresora térmica en su red. Todo lo
verificado es que el proceso arranca, registra y detecta la falta de conexión. Que salga papel sólo
se comprueba en el local, con `probar-impresora.bat`.

## Tensión a futuro

`supabase-js` avisa que va a dejar de soportar Node 18, y el target quedó fijado en Node 18 porque
`pkg` con Node 22 no arranca en Windows. Hoy conviven; en algún momento hay que resolverlo.

---

# Las observaciones de la web no llegaban a la cocina

**Fecha:** 2026-09-11

## Qué pasaba

El cliente escribía "sin cebolla" en la web, el carrito lo guardaba, y **se perdía al confirmar el
pedido**. Nunca llegaba a caja, a la pantalla de cocina ni al ticket impreso.

Todo el camino estaba construido menos un tramo: `lib/hooks/use-checkout.ts:255` armaba cada ítem
del pedido con `id`, `name`, `price`, `quantity` e `image_url`, y descartaba `observations`.

## Cómo se confirmó, ya que los datos no alcanzaban

Los 6 pedidos web no tienen notas, pero eso no prueba nada: saldrían igual de vacíos aunque el
cliente las hubiera escrito. La prueba vino del código, descartando las dos explicaciones benignas:

- **La web sí ofrece el campo** — `components/product-detail-view.tsx:135`, y el carrito lo guarda.
- **No viajaban dentro del nombre** — `getCartItemName` devuelve sólo el nombre del producto.

Un indicio de que la funcionalidad estaba pensada completa: el carrito usa una clave especial
(`__obs`) para que un producto con observaciones no se agrupe con el mismo producto sin ellas.

## Cambio

- [x] `notes: item.observations?.trim() || null` en el mapeo del checkout

## Verificación

- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` limpios
- [x] El resto del camino ya estaba: `createOrder` guarda los items tal cual, `print.ts` mapea
      `notes` tanto para el ticket de cocina como para el del cliente, y `comanda-card.tsx` lo
      muestra con `↳`
- [ ] **Pendiente de David:** hacer un pedido de prueba desde la web con una observación y
      confirmar que aparece en la comanda de cocina

## La nota general del pedido se queda como está (decidido)

`orders.notes` **se guarda y se ve** en el detalle del pedido (`order-details-drawer.tsx:114`), pero
**no se imprime en ningún ticket**. Se revisó y está bien así: el campo se llama "Indicaciones
(opcional)" con el ejemplo *"Piso, depto, timbre, referencias..."* y sólo aparece cuando el pedido es
con envío. Es información para quien entrega, no para la cocina.

Decisión de David: por ahora se usan únicamente las observaciones por producto, que son las que sí
llegan a la comanda.

---

# Mostrador: confirmar y cancelar un pedido tardan segundos

**Fecha:** 2026-09-13
**Disparador:** "siento que tarda en aparecer como pendiente" / "cancelar pedido se siente lento".

## Contexto

Las migraciones 028-030 pasaron a una transaccion los tres caminos de **cobro** (pagar mesa,
cobrar mostrador, agregar items). La **creacion** del pedido de mostrador y las **cancelaciones**
quedaron afuera de esa tanda y siguen con viajes sueltos, uno atras del otro.

Medido sobre los logs: ~160ms fijos por viaje a Supabase (nota en `lib/server/auth.ts`).

### Confirmar pedido — `createMostadorOrder`

7 a 9 viajes secuenciales: select de sesion, insert de orden, insert de order_items, y adentro de
`sendToKitchen` dos selects mas y dos inserts por estacion. Despues el cliente encadena otras dos
server actions (`printKitchenTicketAction` y `refreshPendingOrders`), que Next serializa. Y
`revalidateCaja()` invalida `/admin/caja`, que es la pagina donde esta parado el cajero: obliga a
re-renderizar sus 9 consultas dentro de la respuesta del action, para un arbol que nadie usa
porque la caja vive de estado cliente + realtime.

### Cancelar pedido — `cancelMostadorOrder`

El costo no esta donde parecia. `restoreStockForOrder` termina llamando a
`syncElaboradoAvailability`, que recorre **los 15 elaborados activos** haciendo una consulta
anidada por producto, en serie: ~2,4s. Y en un pendiente no hay nada que revertir —el stock se
descuenta al cobrar, no al confirmar— asi que ese barrido corre para nada, bloqueando la respuesta.

## Tareas

- [x] Migracion 038: `crear_pedido_de_mostrador` — orden + order_items + comandas + comanda_items
      en una transaccion. De 9 viajes a 1, y sin el rollback a mano que borraba la orden huerfana.
- [x] `createMostadorOrder` pasa a un solo `rpc()`.
- [x] Sacar `revalidateCaja()` del camino de creacion (queda `revalidateOrders`, que cubre
      `/admin/orders` y el dashboard).
- [x] `restoreStockForOrder`: saltear el barrido de elaborados cuando no se revirtio nada.
- [x] `cancelMostadorOrder`: UPDATE guardado con RETURNING (1 viaje en vez de select + update) y
      stock en `after()`, como en `tables.ts`.
- [x] `cancelPosOrder`: stock en `after()` tambien.
- [x] `pos-interface.tsx`: pintar el pendiente y sacarlo de la lista sin esperar al servidor;
      realtime ya reconcilia.
- [x] Verificar: lint, build y las dos funciones probadas contra la base.

## Revision

### Confirmar pedido

| | antes | despues |
|---|---|---|
| viajes a la base | 7-9 | 1 |
| server actions en el tap | 3 (crear, ticket, releer pendientes) | 2 (crear, ticket — el ticket ya no bloquea) |
| re-render de `/admin/caja` | si, 9 consultas por `revalidateCaja()` | no |

### Cancelar pendiente

| | antes | despues |
|---|---|---|
| viajes a la base | 2 + revertir + **barrido de 15 elaborados** | 1 |
| barrido de elaborados | siempre, ~2,4s, sin nada que sincronizar | solo si se revirtio algo, y en `after()` |
| server actions en el tap | 2 (cancelar, releer pendientes) | 1 |

### Como se verifico

`crear_pedido_de_mostrador` probada contra la base real dentro de transacciones con `rollback`,
con tres productos que cubren los casos que decidian el viejo `sendToKitchen`:

- elaborado con estacion -> va a cocina
- **reventa CON estacion** ("Copada Extreme") -> NO va: el codigo viejo cortaba por `product_type`
  antes de mirar la estacion, y el SQL replica ese orden
- reventa sin estacion -> no va

Resultado: 3 order_items con sus precios y cantidades, `notes: ""` guardado como null, metadata
preservada, `added_by` escrito (lo confirmo el FK rechazando un uuid inventado), 1 comanda de
cocina con un solo item. Los tres errores devuelven P0001 con el texto que ve el cajero: "La caja
no esta abierta", "El pedido no tiene productos", "La cantidad de cada producto debe ser mayor a
cero".

El filtro de la cancelacion se probo contra PostgREST (200, matchea solo el pendiente real) y el
UPDATE guardado contra la base: devuelve 1 fila si es cancelable y 0 si ya estaba pagado, que es
lo que distingue el exito del "Orden no encontrada o ya procesada".

Nada quedo escrito en produccion: todas las pruebas se revirtieron y el pendiente que habia
(`ccb24748`) sigue en `abierto`.

## Segunda parte: cuanto tarda un pedido web en aparecer en el mostrador

El realtime no era el problema: `orders` esta en la publicacion `supabase_realtime`, con
`replica identity full` y la policy `staff lee pedidos` (`ve_operacion()`) que el cajero cumple.
El evento llega en 100-300ms desde que la fila existe. Lo que tardaba era que la fila existiera.

Entre el tap del cliente y el INSERT habia tres server actions encadenadas —y Next las
serializa—, y la ultima tenia 5+N viajes casi todos en serie.

| | antes | despues |
|---|---|---|
| `validateCartStock` desde el checkout | 1 action (~2 viajes) | eliminada: `createOrder` ya revalida |
| `createOrder` | 5+N viajes, N = elaborados del carrito | 4 olas (3 sin elaborados) |
| aparecer en Pendientes | evento + releer la lista entera | el payload del evento, directo |

Detalle de lo que se paralelizo en `createOrder`: `business_settings`, `products` y la zona de
envio no dependen una de otra y estaban en fila; y el maximo de cada elaborado era una consulta
por hamburguesa **adentro del `for`, en serie**, cuando `validateCartStock` —en el mismo
archivo— ya lo hacia con `Promise.all`. Medido con EXPLAIN ANALYZE, esa consulta tarda 2,35ms:
todo el costo eran los ~160ms de red por viaje.

La pre-validacion del cliente se saco porque `createOrder` la repite entera un segundo despues, y
tiene que repetirla: la accion es publica y cualquiera puede llamarla sin pasar por el checkout.
Los mensajes de error que ve el cliente son equivalentes.

### Lo que queda afuera

- `syncElaboradoAvailability` sigue siendo N+1 (una consulta anidada por elaborado, en serie).
  Ahora corre fuera del camino critico y solo cuando hay algo que sincronizar, pero el barrido en
  si sigue caro: se puede resolver de una sola consulta cuando moleste.
- Cancelar desde el historial (`cancelPosOrder`, pedido ya cobrado) sigue encadenando
  `router.refresh()` + historial + resumen de sesion en el cliente.
- `createOrder` todavia lee el `order_number` de vuelta en un viaje aparte, porque `anon` no
  tiene SELECT sobre `orders` (esta explicado en el codigo). Un RPC `security definer` lo
  devolveria en el mismo viaje del insert; es un viaje contra los tres que se sacaron.
- El camino web no se probo end-to-end: hacerlo crea un pedido real que suena en la caja del
  local. Verificado por tipos, lint, build y equivalencia de la logica de validacion.
