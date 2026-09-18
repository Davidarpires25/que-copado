# Proposal

## Why

Los combos ya se venden. El problema es que descuentan del inventario equivocado.

Hoy los tres combos activos son productos `elaborado` con una receta adentro, y
la bebida entra a esa receta **como ingrediente**:

| combo | bebida cargada como ingrediente |
|---|---|
| COMBO PATTY Y GASEOSA — $22.000 | `coca-coca 375` |
| COMBO PLAZA — $16.000 | `coca cola descartable 1.5lts` |

Esa misma bebida existe además como producto de reventa, con su propio stock. Así
que vender un combo descuenta el "ingrediente coca" y vender una coca sola
descuenta el "producto coca": **dos inventarios para la misma heladera**. Ninguno
de los dos dice cuántas botellas quedan.

De paso, la duplicación ya dejó basura: `fanta 500ml` y `sprite 500ml` existen
como ingrediente —con stock 0— y como producto de reventa —con stock 6—, y
ninguna receta los usa. De 82 ingredientes activos, 44 no aparecen en ninguna
receta.

No es un problema de configuración del cliente: el sistema no ofrece otra forma
de armar un combo, así que cargar la bebida como ingrediente era lo único que se
podía hacer.

## What Changes

- **Un tipo de producto nuevo, `combo`**, que no tiene stock propio y se arma con
  dos cosas: **sus propias recetas** —el envase y lo que se prepara solo para el
  combo— y **componentes**, que son productos del catálogo.
- **Un componente puede ser un producto de reventa o uno elaborado.** La coca es
  el mismo producto que se vende suelto, así que descuenta del mismo stock; la
  hamburguesa dispara su receta como siempre.
- **Las recetas del combo cubren lo que no es un producto.** Los combos actuales
  consumen `Caja de patty`, `Palillo` y `4 vaso y plato de plástico`: envases que
  no pertenecen a ningún componente sino al combo. Y usan preparaciones propias
  —`Pan de Promo de burguer`— que no son las del producto que se vende suelto.
  Forzar todo eso a ser un producto del catálogo obligaría a inventar ítems que
  nadie vende.
- **El costo del combo se calcula** sumando los ingredientes de sus recetas más
  el costo de sus componentes, así el margen de la promo deja de ser una
  estimación.
- **El ticket muestra una sola línea**: el nombre del combo y su precio. Lo que
  compró el cliente es el combo. La comanda, en cambio, se arma por componente:
  la hamburguesa va a cocina, la bebida al despacho, cada una a su estación.
- **Los tres combos actuales se migran** a la forma nueva, y las bebidas cargadas
  como ingrediente quedan fuera de servicio sin borrar su historial.
- **Combos fijos**: los componentes los define quien configura el producto, no se
  eligen al vender. La spec deja anotado cómo crecería a combos con opciones.

## Capabilities

### New Capabilities

- `combos`: qué es un combo, cómo se arma, qué descuenta al venderse, cómo se
  calcula su costo y cómo aparece en el ticket y en la comanda.

### Modified Capabilities

Ninguna. `seguimiento-de-stock` y `registro-de-compras` no cambian: el combo
descuenta a través de los productos que ya existen, con las reglas que ya tienen.

## Impact

**Repos:** lidera `que-copado`. `AgentePOS` consume el menú por `/api/agent/menu`
y va a ver los combos como un producto más con su precio —que es lo correcto—,
pero conviene avisar del tipo nuevo por si ramifica por `product_type`.

**Base:** una tabla de componentes (producto padre → producto hijo, con cantidad)
y una fila nueva en `product_types`. Las recetas del combo usan `product_recipes`,
que ya existe y ya liga un producto a N recetas: no hace falta nada nuevo.
Migración de datos para los tres combos.

**Código:**

- `lib/server/stock-deduction.ts` — una rama más por tipo, que expande a
  componentes y reusa las dos existentes
- `app/actions/comandas.ts` — la comanda se arma por componente
- Ticket y comanda impresa — el combo con sus partes debajo
- Alta y edición de productos — configurar los componentes
- Recálculo de costos — sumar los componentes

**Sin cambios:** el carrito, el checkout y el cobro. Un combo es un producto con
precio: se vende como cualquier otro.

## Fuera de alcance

- **Combos con opciones** ("elegí tu bebida"). El modelo se diseña para admitirlos
  después sin rehacerlo, pero la selección al vender —en caja, en la web y en el
  agente— es otro trabajo.
- **Limpiar los 44 ingredientes sin receta.** Salió a la luz mirando esto y
  merece su propia revisión, con el cliente decidiendo cuáles son basura y cuáles
  se usan de verdad.
- **Precios promocionales por fecha o por horario.** El combo tiene un precio,
  como cualquier producto.
- **Combos dentro de combos.** Un componente es un producto simple.
- **Separar el envase del resto de la receta.** Los envases hoy conviven con los
  ingredientes en la misma receta y así se quedan; distinguirlos es otra
  conversación, sobre costos y no sobre combos.
