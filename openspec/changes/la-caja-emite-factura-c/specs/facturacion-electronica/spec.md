# Spec Delta

## ADDED Requirements

### Requirement: Sin facturación encendida, la caja es la de siempre

La facturación SHALL venir apagada. Con la facturación apagada, la caja, el
Historial, el ticket y el cierre NO SHALL mostrar nada de facturas ni pedir
datos fiscales, y el sistema NO SHALL comunicarse con ARCA.

Existe porque un local puede no querer facturar desde el sistema, o hacerlo
con otro (un controlador fiscal, la web de ARCA).

#### Scenario: Un local que no factura

- **GIVEN** la facturación apagada
- **WHEN** se cobra un pedido y se imprime su ticket
- **THEN** el ticket es el de siempre, sin bloque fiscal
- **AND** el Historial no muestra "Facturar" ni número de factura
- **AND** no hubo ningún pedido a ARCA

### Requirement: El local emite factura C por ARCA

Con la facturación encendida en Ajustes, el sistema SHALL emitir una Factura C
autorizada por ARCA (con CAE) al cobrar un pedido con alguno de los medios de
pago tildados para facturar solos, y SHALL permitir facturar a mano un pedido
cobrado que no se facturó solo. El comprobante SHALL
emitirse a nombre de la CUIT del local, por delegación en la CUIT del
proveedor del sistema, sin que el local maneje certificados.

Un pedido NO SHALL tener más de una Factura C que no esté rechazada.

#### Scenario: Cobro con un medio tildado

- **GIVEN** la facturación encendida, con tarjeta tildada
- **WHEN** se cobra con tarjeta un pedido de mostrador de $12.500
- **THEN** el pedido queda cobrado
- **AND** tiene una Factura C emitida por $12.500, con número y CAE

#### Scenario: Cobro con un medio sin tildar

- **GIVEN** la facturación encendida, con efectivo sin tildar
- **WHEN** se cobra en efectivo un pedido
- **THEN** el pedido queda cobrado, sin factura
- **AND** el Historial ofrece "Facturar" en esa fila

#### Scenario: Dos clics en Facturar

- **GIVEN** un pedido cobrado sin factura
- **WHEN** se pide facturarlo dos veces a la vez
- **THEN** el pedido tiene una sola factura

### Requirement: ARCA caído no frena el cobro

El cobro NO SHALL depender de la respuesta de ARCA. Si ARCA no responde o
rechaza el comprobante, el pedido SHALL quedar cobrado y la factura
pendiente o rechazada, con su motivo, a la vista en el Historial con
"Reintentar", y contada en el cierre de caja.

Un reintento NO SHALL emitir una segunda factura si ARCA ya había autorizado
la primera.

#### Scenario: ARCA no contesta

- **GIVEN** la facturación encendida, todos los medios tildados y ARCA sin
  responder
- **WHEN** se cobra un pedido
- **THEN** el pedido queda cobrado
- **AND** el cajero ve que la factura quedó pendiente
- **AND** el Historial muestra "Reintentar" en esa fila

#### Scenario: La respuesta se perdió

- **GIVEN** una factura que ARCA autorizó pero cuya respuesta no llegó
- **WHEN** se reintenta
- **THEN** se guarda el CAE que ARCA ya había dado
- **AND** no se emite otro comprobante

### Requirement: Anular un pedido facturado emite su nota de crédito

Al anular un pedido con Factura C emitida, el sistema SHALL emitir una Nota de
Crédito C por el mismo importe, asociada a esa factura. Si ARCA falla, el
pedido SHALL quedar anulado y la nota pendiente, a la vista.

#### Scenario: Anular después de facturar

- **GIVEN** un pedido cobrado con Factura C 0003-00000041
- **WHEN** se anula
- **THEN** se emite una Nota de Crédito C asociada a la 0003-00000041

### Requirement: Los datos fiscales se cargan en Ajustes

La sección Facturación de Ajustes SHALL permitir, con `settings.manage`,
cargar razón social, CUIT, punto de venta, domicilio comercial, ingresos
brutos, inicio de actividades y los medios de pago que se facturan solos, y SHALL ofrecer "Probar
conexión", que dice en castellano si ARCA acepta la CUIT y el punto de venta
cargados.

#### Scenario: Encender la facturación en producción

- **GIVEN** la facturación apagada, en el ambiente de producción
- **WHEN** se la enciende
- **THEN** se pide confirmar que cada factura queda registrada en ARCA y
  cuenta para la categoría del monotributo

#### Scenario: Falta la delegación

- **GIVEN** una CUIT que no delegó el servicio de factura electrónica
- **WHEN** se prueba la conexión
- **THEN** se lee que ARCA no reconoce la delegación y qué paso de la guía
  falta

### Requirement: El ticket es la factura

Cuando un pedido tiene factura emitida, el ticket del cliente SHALL llevar el
tipo y número del comprobante, el CAE con su vencimiento, los datos del
emisor y el código QR de ARCA. Un puente de impresión que no conoce la factura
SHALL seguir imprimiendo el ticket de siempre.

Con la facturación encendida, un ticket del cliente que no es la factura —la
cuenta antes de cobrar, un cobro que no se facturó, el de un comensal— SHALL
decir "Documento no válido como factura" (RG 1415). Con la facturación
apagada, el ticket NO SHALL cambiar.

#### Scenario: La cuenta antes de cobrar, con la facturación encendida

- **GIVEN** la facturación encendida y un pedido sin factura
- **WHEN** se imprime su ticket
- **THEN** dice "Documento no válido como factura"

#### Scenario: Ticket de un pedido facturado

- **GIVEN** un pedido con Factura C emitida
- **WHEN** se imprime su ticket
- **THEN** el ticket dice "Factura C", su número y su CAE, y trae el QR
