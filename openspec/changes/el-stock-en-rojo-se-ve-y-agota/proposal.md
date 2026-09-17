# Proposal

## Why

Un producto con stock negativo se sigue ofreciendo, y nadie se entera de que está
en rojo.

Son dos piezas que por separado parecen decisiones y juntas dejan un agujero:

**El barrido de disponibilidad pregunta por cero exacto.** La condición es
`theoreticalStock === 0`. Con el stock en -39 no entra en esa rama, así que el
producto no se marca agotado y se sigue vendiendo.

**Vender en rojo no se bloquea, y el aviso va a un log que nadie lee.** La
función que aplica los movimientos ya detecta cuáles quedaron en negativo y los
devuelve; el código los escribe con `console.error` en el servidor. El comentario
al lado lo dice: *"Vender en rojo no se bloquea, pero queda constancia"*. Esa
constancia no llega a ninguna pantalla.

Lo vimos en la base local durante una prueba: el medallón quedó en **-39** y la
hamburguesa siguió disponible en la caja como si nada. En el local eso significa
seguir vendiendo algo que no hay, y descubrirlo cuando cocina dice que no queda.

No es teórico: el stock se va al rojo con un pedido grande, con un ajuste mal
cargado o con una receta que consume más de lo que dice.

## What Changes

- **Lo que está en cero o por debajo cuenta como agotado.** Hoy solo el cero
  exacto apaga el producto.
- **El stock en rojo se ve en la pantalla de stock**, distinto de "bajo": un
  ingrediente con -39 no es lo mismo que uno con 2 y mínimo 5.
- **Una venta que deja algo en negativo deja aviso donde alguien lo vea**, no
  solo en el log del servidor.

## Capabilities

### New Capabilities

- `seguimiento-de-stock`: se agregan los requisitos sobre qué cuenta como
  agotado y qué pasa cuando el stock queda en rojo.

Este cambio extiende la misma capability que `configurar-el-seguimiento-de-stock`,
que está completo y sin archivar. **Conviene archivar aquel primero**: entonces
esto pasa a ser una modificación de una spec vigente en vez de una capability
nueva.

### Modified Capabilities

Ninguna todavía, porque `openspec/specs/` sigue vacío.

## Impact

**Repos:** solo `que-copado`.

**Modificado:** el barrido de disponibilidad en `lib/server/stock-deduction.ts`
—que desde el refactor anterior es uno solo—, la tabla de stock, y el camino que
hoy escribe los negativos en el log.

**Sin cambios:** la base. Es una condición y una forma de mostrar.

**Verificación:** contra la base local, dejando stock en negativo a propósito.

## Fuera de alcance

- **Bloquear la venta cuando no hay stock.** Es una decisión del negocio, no un
  arreglo: un local muchas veces vende igual porque el conteo está mal, no la
  mercadería. Este cambio hace que se vea, no que se impida.
- **Por qué el stock llega a negativo.** Puede ser un ajuste mal cargado, una
  receta que consume de más o una venta grande. Cada una es su propia
  investigación; acá se trata el síntoma, que es el que deja vendiendo aire.
- **Alertas por fuera de la pantalla** (correo, WhatsApp). Otra conversación.
