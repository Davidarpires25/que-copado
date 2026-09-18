# Tasks

## 1. El papel sabe qué es

- [ ] 1.1 `ticket-print-layout.tsx` distingue cobrado de no cobrado por
      `order.status === 'pagado'`. Verificación: el mismo pedido, impreso antes
      y después de cobrar, sale distinto.
- [ ] 1.2 Sin cobrar: encabezado `CUENTA` y sin la línea de pago. Queda el
      total. Verificación: imprimir desde el panel de cobro antes de tocar
      Cobrar y que no diga "Efectivo" en ningún lado.
- [ ] 1.3 Cobrado: igual que hoy, con el método y el vuelto. Verificación:
      cobrar en efectivo con vuelto y comparar contra un ticket de antes del
      cambio.

## 2. Que valga para los cuatro botones

- [ ] 2.1 Verificar los cuatro caminos que imprimen el ticket del cliente:
      panel de cobro pendiente, pantalla de mesa, historial y mostrador. El de
      historial siempre está cobrado; los otros tres pueden estar en los dos
      estados.

## 3. Cerrar

- [ ] 3.1 `npm run lint` y `npm run build` sin errores nuevos.
