# Tasks

## 1. El papel sabe si se cobró

- [x] 1.1 `ticket-print-layout.tsx` distingue cobrado de no cobrado por
      `order.status === 'pagado'`.
- [x] 1.2 Sin cobrar no se imprime la línea de pago; queda el total.
- [x] 1.3 Cobrado: todo igual que hoy, con el método y el vuelto.

**Verificado en el navegador**, el mismo pedido `#1` impreso dos veces:

```
ANTES de cobrar            DESPUES de cobrar

  QUE COPADO                 QUE COPADO
  Mostrador                  Mostrador
  18/09 · 17:28              18/09 · 17:28
  1x Hamburguesa  $ 8.000    1x Hamburguesa  $ 8.000
  1x Gaseosa      $ 3.000    1x Gaseosa      $ 3.000
  TOTAL          $ 11.000    TOTAL          $ 11.000
                             Efectivo       $ 11.000
  Gracias!                   Gracias!
  #1                         #1
```

El pedido nace con `status=abierto payment_method=cash`, confirmado en la
corrida: el dato sigue diciendo efectivo, pero el papel ya no lo repite.

## 2. Que valga para los cuatro botones

- [x] 2.1 **Se cumple por construcción:** el componente mira el estado del
      pedido, no un parámetro de quien imprime, así que los cuatro caminos
      —panel de cobro, mesa, historial y mostrador— lo respetan sin saberlo.
      Verificado el del panel de cobro, que es el del reporte. Ver los cuatro caminos que imprimen el ticket del cliente:
      panel de cobro pendiente, pantalla de mesa, historial y mostrador. El de
      historial siempre está cobrado; los otros tres pueden estar en los dos
      estados.

## 3. Cerrar

- [x] 3.1 `npm run lint` y `npm run build` sin errores nuevos.
