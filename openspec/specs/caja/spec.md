# caja Specification

## Purpose

El POS del local: cobrar en el mostrador y en las mesas, y lo que sale impreso
en cada momento de ese ida y vuelta.

Lo que gobierna esta capacidad es que **un papel dice lo que ya pasó, no lo que
el sistema supone**. Un pedido nace con un medio de pago de arranque porque la
base necesita un valor; eso no significa que alguien haya pagado. La cuenta que
se lleva a la mesa y el comprobante que se entrega después son dos papeles
distintos, y confundirlos hizo que durante meses se le llevara a la gente una
cuenta que ya decía "Efectivo" antes de que eligiera cómo pagar.

Parte de esta capacidad vive fuera de este repo: el puente de impresión es un
servicio en C# (`Davidarpires25/print-bridge`) que lee la cola `print_jobs` y
arma el ticket. Cambiar lo que sale en el papel casi siempre toca los dos
lados, y el de C# se compila y se prueba en la PC del local.

## Requirements

### Requirement: La cuenta y el ticket son papeles distintos

Lo que se imprime **antes** de cobrar SHALL mostrar los ítems y el total, y NO
SHALL mostrar ningún método de pago.

Lo que se imprime **después** de cobrar SHALL mostrar además con qué se pagó y
el vuelto, si lo hubo.

Existe porque no se cumplía: el pedido se crea con `payment_method` en efectivo
como valor de arranque, y el ticket imprimía esa línea sin preguntar si alguien
había pagado. El papel que se le llevaba a la mesa para que eligiera cómo pagar
ya decía "Efectivo".

#### Scenario: Se imprime antes de cobrar

- **WHEN** se imprime el ticket de un pedido que todavía no se cobró
- **THEN** salen los ítems y el total
- **AND** no aparece ningún método de pago

#### Scenario: Se imprime después de cobrar

- **WHEN** se imprime el ticket de un pedido ya cobrado
- **THEN** sale con qué se pagó
- **AND** sale el vuelto, si lo hubo

#### Scenario: El mismo pedido, antes y después

- **GIVEN** un pedido impreso antes de cobrarlo
- **WHEN** se cobra y se vuelve a imprimir
- **THEN** el segundo papel muestra el método de pago y el primero no
