# Tasks

Se aplica después de `la-caja-dice-lo-que-paso`. Todo corre contra el stack
local. El test nuevo siembra un menú realista con ids de prefijo propio (el de
la auditoría: categorías y productos de prueba, una mitad y mitad) y lo borra
al final. El turno que haya se estaciona y se devuelve intacto con
`e2e/turno.ts`, el mismo módulo que ahora usa `caja-dice-lo-que-paso.spec.ts`
(lección 47). Las capturas se toman a 1366×768 (netbook), 820×1180 (tablet
vertical), 1180×820 (tablet horizontal) y 390×844, en los dos temas, con el
puntero fuera del menú lateral (lección 42).

## 1. Los tests y las capturas "antes"

- [x] 1.1 Crear `e2e/caja-de-memoria.spec.ts` con el marco de datos de arriba.
      Verifica: corre, limpia, y la sesión y los productos quedan como antes.
- [x] 1.2 Tests del orden: en "Todos" los productos quedan agrupados en el
      orden de las categorías; al insertar por REST un producto de Bebidas,
      la posición de cada combo no cambia. Verifica: falla hoy (orden
      alfabético).
- [x] 1.3 Test de categorías: a 1366 todas las pestañas tienen su caja dentro
      del viewport; a 390 la fila marca el desborde (atributo o clase del
      indicador). Verifica: falla hoy ("Cervezas" queda afuera).
- [x] 1.4 Test sin aviso: tocar un producto no crea ningún `[data-sonner-toast]`.
      Verifica: falla hoy.
- [x] 1.5 Test del carrito a 1366: con 2 "Combo Clásico (burger + papas +
      gaseosa)", el `boundingBox` del monto no se cruza con el del botón de
      quitar, y el nombre no termina en "…" (se mide el `scrollHeight` del
      nombre contra su alto visible). Verifica: falla hoy.
- [x] 1.6 Test de tablet: a 820 el carrito lateral no está, y el botón
      flotante sí. Verifica: falla hoy.
- [x] 1.7 Test de media pizza: la tarjeta dice "desde $ 11.500" y no "$ 0".
      Verifica: falla hoy.
- [x] 1.8 Tests del cierre: a 1366×768, después de escribir el contado, la
      diferencia, el botón y el resumen del turno están dentro del viewport
      sin desplazar, y son del mismo panel (un solo contenedor); la hora
      no contiene "p. m."; el ticket promedio no tiene coma decimal. Verifica:
      falla hoy.
- [x] 1.9 Test de tipografía: el `font-family` computado del diálogo de
      Movimiento empieza con la de Inter. Verifica: falla hoy.
- [x] 1.10 Capturas "antes" de mostrador (vacío y con pedido), pendientes,
      cobro, mesas, media pizza y cierre, en los cuatro tamaños y los dos
      temas. Verifica: los archivos guardados.

## 2. Tokens y alcance del panel (Decisiones 8 y 9)

- [x] 2.1 Tokens de estado, escala de texto y tamaños de control en
      `globals.css`, en claro y en los dos bloques de oscuro, expuestos con
      `@theme inline`. Verifica: una página de prueba local con cada utilidad
      muestra el color esperado en los dos temas; `npm run build`.
- [x] 2.2 Variable de Inter en `<html>` y `.admin-layout` → `html.admin-panel body` para la tipografía, `--accent`
      y los números tabulares. Verifica: pasa 1.9; `grep -rn "admin-layout"`
      muestra solo lo que queda como alias.
- [x] 2.3 `sonner.tsx` toma el tema del panel cuando está `admin-panel`.
      Verifica: captura de un aviso de error en el panel oscuro.

## 3. Mostrador (Decisiones 1 a 6)

- [x] 3.1 Orden por categoría y nombre en `PosProductGrid`. Verifica: pasa 1.2.
- [x] 3.2 Categorías: envolver desde `lg` (chips) y degradado de desborde
      debajo. Verifica: pasa 1.3.
- [x] 3.3 Sacar el aviso de `handleAddItem`. Verifica: pasa 1.4.
- [x] 3.4 Pendientes en su lugar (abajo), con los estilos de la Decisión 4. Verifica:
      captura con dos pendientes, uno elegido; el test de celular de la caja
      (`admin-celular.spec.ts`, que toca el chip) sigue pasando.
- [x] 3.5 Renglón del carrito (nombre en 2 renglones, monto sin ancho fijo,
      tacho en su columna) y envío en un renglón. Verifica: pasa 1.5.
- [x] 3.6 Breakpoint del carrito y del panel de mesa de `md` a `lg`.
      Verifica: pasa 1.6; los flujos de mesa de `admin-celular.spec.ts` siguen
      pasando.
- [x] 3.7 Media pizza: "desde" en la tarjeta y precios en el selector.
      Verifica: pasa 1.7; captura del selector con dos mitades elegidas.

## 4. Cierre (Decisión 7)

- [x] 4.1 Un solo panel en dos columnas desde `lg` (contar y cerrar a la
      izquierda, el turno a la derecha), horas en 24 h, contado formateado,
      promedio redondeado, íconos. Verifica: pasa 1.8; captura a 1366×768
      mostrada a David.
- [x] 4.2 `MobileTopBar` en el cierre a 390. Verifica: el barrido de
      `admin-celular.spec.ts` (sin desborde, controles de 44px) pasa en el
      cierre.

## 5. Tokens en la caja (Decisión 9)

- [x] 5.1 Los colores de estado crudos de `components/admin/caja` y
      `app/admin/caja` pasan a los tokens. Verifica:
      `grep -rEn "(text|bg|border)-(red|green|blue|amber|orange|yellow|emerald|rose)-[0-9]" components/admin/caja app/admin/caja`
      sin resultados; axe con `color-contrast` en los dos temas sigue sin
      fallas. Hecho: axe sobre mostrador, cobro, movimiento (retiro e
      ingreso), Historial y cierre, a 1366 y 390, claro y oscuro. Salieron dos
      fallas previas que ningún test veía: el botón verde de "Registrar
      ingreso" (blanco sobre green-600, 3,3:1; ahora `bg-exito-solido`) y
      "Cancelar pedido" del cobro (`text-red-700/60`, 3,44:1; ahora gris
      terciario con rojo al pasar el mouse, igual que el de mesa).
- [x] 5.2 Los tamaños de texto arbitrarios de la caja pasan a la escala, salvo
      el vuelto y el total. Verifica: `grep -rEn "text-\[[0-9]+px\]"` en la
      caja muestra solo esas excepciones, comentadas. Salió en las capturas:
      `cn()` (tailwind-merge) tomaba `text-panel-*` por un color y lo borraba
      junto a otro color, y el texto heredaba 16px. `lib/utils.ts` le enseña
      la escala; lo vigila el test "los textos de la escala miden lo que dicen
      aunque pasen por cn()" (16px sin el arreglo, 13px con él).
- [x] 5.3 El `−`/`+` de mostrador y de mesa usan el mismo token de control.
      Verifica: un test mide los dos botones y da el mismo alto.

## 6. Cierre del cambio

- [x] 6.1 Capturas "después" lado a lado con las de 1.10, mostradas a David
      antes de desplegar. Verifica: las capturas y su respuesta (2026-09-27,
      "me cierran").
- [x] 6.2 `npm run lint`, `npm run build` y la suite e2e completa. Resultado:
      lint sin errores, build bien; la suite, 120 pasan y 9 fallan. Los 9 son
      los mismos que fallan en `main` con la base con pedidos (verificado en
      `la-caja-dice-lo-que-paso`): Analytics, Arqueos, Cocina, Dashboard,
      Pedidos, ninguno de la caja. La suite dejó una caja abierta de más:
      `mesa-comensales.spec.ts` la "borraba" con `status=eq.abierta`, un estado
      que no existe; pasó a `e2e/turno.ts`.
- [ ] 6.3 En el local, un servicio con la caja nueva, y preguntarle a David
      qué costó. Verifica: su respuesta, y una lección en `tasks/lessons.md`
      si hubo algo.
