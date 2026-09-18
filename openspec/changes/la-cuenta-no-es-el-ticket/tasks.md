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

## 3. El papel de verdad: `print-bridge`

Lo que sale por la térmica no lo arma este repo. `printClientTicketAction`
encola en `print_jobs` y el bridge en C# lo formatea.

- [x] 3.1 `print.ts` manda `paymentLabel` vacío mientras el pedido no se cobró.
      `Parcial` se mantiene: una ronda de una mesa es un corte a propósito.
      **Verificado:** imprimir desde el panel de cobro encola un job sin
      `paymentLabel`; reimprimir un pedido cobrado desde el Historial encola
      `paymentLabel: "Efectivo"`.
- [x] 3.2 `Impresora.cs` no imprime la línea de pago ni el vuelto si no le
      llega el medio de pago.
- [x] 3.3 El pie pasa a "¡Felicidades por su compra!" cuando está cobrado.
      CP858 —la página de códigos que usa el bridge— soporta el `¡`.
- [ ] 3.4 **Compilar el bridge y probarlo contra la impresora.** No hay `dotnet`
      en esta máquina, así que el cambio en C# está escrito y sin compilar.

## 4. Cerrar

- [x] 4.1 `npm run lint` y `npm run build` sin errores nuevos.
