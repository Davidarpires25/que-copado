# Proposal

## Why

Una mesa puede tener nombre —`restaurant_tables.label`— y el sistema lo ignora en
todos lados menos en la pantalla que lo carga.

Hay una mesa dada de alta como **"Vereda 1"**, en la sección vereda. La caja la
muestra como "Mesa 4". La comanda de cocina dice "Mesa 4". El ticket del cliente
dice "Mesa 4". El único lugar donde figura "Vereda 1" es la administración de
mesas, que es donde alguien lo escribió.

Nueve lugares escriben `Mesa {number}` a mano:

| dónde | qué |
|---|---|
| `table-card.tsx:52` | la tarjeta de la mesa en caja |
| `table-order-panel.tsx:199` | el panel del pedido |
| `table-pay-view.tsx` (×3) | la pantalla de cobro y la cuenta |
| `print.ts` (×2) | la comanda impresa y el ticket |
| `ticket-print-layout.tsx:58` | el ticket en pantalla |
| `comanda-print-layout.tsx:24` | la comanda de cocina |

Con mesas numeradas no molesta. Con una barra, una vereda o un salón de arriba,
el cajero y la cocina leen un número que nadie usa cuando habla. **Lo que más
pesa es la comanda**: cocina prepara para "Mesa 4" y quien lleva el plato busca
una mesa que en el salón se llama de otra forma.

Y mientras tanto el campo existe, se carga y no sirve para nada.

## What Changes

- **Donde hoy se escribe "Mesa {número}", se muestra el nombre de la mesa** si lo
  tiene, y el número si no.
- **Vale para las tres caras**: las pantallas de caja, la comanda de cocina y el
  ticket del cliente.
- **La regla vive en un solo lugar**, no repetida en nueve.

## Capabilities

### New Capabilities

Ninguna. Es cómo se nombra algo que ya existe.

### Modified Capabilities

Ninguna: no hay una capability de mesas en `openspec/specs/` todavía. Se marca
`skip_specs: true`.

Si algún día se escribe la capability del servicio de mesas, esto es parte de
ella y conviene traerlo.

## Impact

**Repos:** solo `que-copado`.

**Modificado:** los nueve lugares listados arriba, que pasan a usar un helper
común —el mismo criterio que se usó con `orderLabel()` para el número de pedido,
que también estaba escrito distinto en cada pantalla—.

**Sin cambios:** la base. `label` ya existe y ya se carga.

**Verificación:** contra la base local, que tiene una mesa "Vereda 1" cargada
justamente así.

## Fuera de alcance

- **Obligar a que toda mesa tenga nombre.** Sigue siendo opcional: sin nombre, el
  número.
- **Mostrar la sección junto al nombre.** La pantalla de cobro ya lo hace en un
  lugar; unificar eso es otra decisión de diseño.
