# pedidos-seguros Specification

## Purpose
Un pedido solo entra a la base por dos caminos: el servidor, después de
validar precios, envío, horario y stock (la tienda y el agente, por
`createOrder`), o el personal que puede operar (la caja, con su sesión). La
clave pública del navegador no alcanza para crear ni modificar pedidos.

## Requirements

### Requirement: Un pedido solo entra por el servidor o por el personal

Sin sesión, la base NO SHALL aceptar insertar un pedido ni su historial de
estados, ni ejecutar `crear_pedido_remoto`. Los pedidos de la tienda y del
agente SHALL crearse en el servidor, después de validar precios, envío,
horario y stock; los de la caja, con la sesión de alguien que puede operar.

#### Scenario: Un pedido falso con la clave pública

- **GIVEN** alguien con la clave pública y sin sesión
- **WHEN** intenta insertar en `orders` o llamar a `crear_pedido_remoto`
- **THEN** la base lo rechaza
- **AND** la tienda sigue creando pedidos por `createOrder`
