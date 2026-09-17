# Design

## Context

Ver `proposal.md` — Why. Tres datos del estado actual:

- El barrido de disponibilidad quedó en una sola copia tras
  `un-solo-barrido-de-disponibilidad`, así que la condición se cambia en un lugar.
- `aplicar_movimientos_de_stock` (migración 033) ya devuelve
  `negativos: [{ tipo, id, stock }]`. No hay que detectar nada: hay que llevar
  eso hasta la pantalla.
- La tabla de stock clasifica en `ok`, `low`, `out_of_stock` y `untracked`. Un
  stock negativo hoy cae en `low`, junto al que tiene 2 y mínimo 5.

## Goals / Non-Goals

**Goals**

- Que un producto en rojo deje de ofrecerse.
- Que el rojo se vea, y se distinga del bajo.

**Non-Goals**

- Impedir la venta (ver proposal — Fuera de alcance).
- Averiguar por qué el stock llegó a negativo.

## Decisions

### La condición pasa a "menor o igual a cero"

Es el cambio de fondo y es de una línea. Hasta acá preguntaba por cero exacto, lo
que funciona mientras nada cruce el cero de un salto —y un pedido de 40 unidades
con 1 en stock lo cruza—.

El camino de vuelta también se corrige: hoy vuelve a estar disponible cuando el
stock es mayor a cero, que ya es lo correcto y no cambia.

### El aviso de venta en rojo viaja con la respuesta del cobro

El descuento de stock corre después de confirmar la venta y es best-effort: no
puede tumbar un cobro. Así que el aviso no puede ser un error que bloquee; es
información que vuelve con el resultado y la caja muestra.

**Alternativa considerada:** una alerta en la pantalla de stock y nada en la
caja. No alcanza: quien cobra no está mirando stock, y el momento en que la
información sirve es el de la venta, cuando todavía se puede avisar a cocina.

**Consecuencia:** el aviso se muestra después de cobrar, no antes. Es coherente
con no bloquear: se cobra, y se avisa que ese ítem quedó en rojo.

### El rojo es un estado propio en la tabla

Se agrega a los cuatro que ya existen (`ok`, `low`, `out_of_stock`, `untracked`).
No alcanza con pintar el número: la lista se ordena y se filtra por estado, y "en
rojo" es la que hay que atender primero.

## Risks / Trade-offs

**Al aplicar esto, productos que hoy se venden pueden aparecer agotados de golpe**
→ Es lo correcto, pero conviene mirar antes cuántos ítems están en negativo hoy
en producción, para que el local no se encuentre con media carta apagada sin
aviso. Es la primera tarea.

**El aviso de venta en rojo puede volverse ruido** → Si el inventario está mal
cargado, cada venta avisará. Eso es una señal, no un defecto: significa que hay
que corregir el conteo. Si molesta, se revisa; no se silencia de entrada.

## Migration Plan

No hay migración. Es una condición y una forma de mostrar.
