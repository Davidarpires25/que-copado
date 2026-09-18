# caja — delta

## ADDED Requirements

### Requirement: La cuenta y el ticket son papeles distintos

Lo que se imprime **antes** de cobrar SHALL mostrar los ítems y el total, y NO
SHALL mostrar ningún método de pago.

Lo que se imprime **después** de cobrar SHALL mostrar además con qué se pagó y
el vuelto, si lo hubo.

Cada uno SHALL decir cuál de los dos es.

Existe porque no se cumplía: el pedido se crea con `payment_method` en efectivo
como valor de arranque, y el ticket imprimía esa línea sin preguntar si alguien
había pagado. El papel que se le llevaba a la mesa para que eligiera cómo pagar
ya decía "Efectivo".

#### Scenario: Se imprime antes de cobrar

- **WHEN** se imprime el ticket de un pedido que todavía no se cobró
- **THEN** salen los ítems y el total
- **AND** no aparece ningún método de pago
- **AND** el papel se identifica como cuenta

#### Scenario: Se imprime después de cobrar

- **WHEN** se imprime el ticket de un pedido ya cobrado
- **THEN** sale con qué se pagó
- **AND** sale el vuelto, si lo hubo

#### Scenario: El mismo pedido, antes y después

- **GIVEN** un pedido impreso antes de cobrarlo
- **WHEN** se cobra y se vuelve a imprimir
- **THEN** el segundo papel muestra el método de pago y el primero no
