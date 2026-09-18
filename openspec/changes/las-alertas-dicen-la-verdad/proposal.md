# Proposal

## Why

Auditando el stock apareció por qué nadie ató cabos cuando las tres pizzas
desaparecieron del catálogo: **el cartel de alertas miente todos los días.**

| insumo | stock | mínimo cargado |
|---|---|---|
| Queso muzzarela | 5,40 kg | **1000 kg** |
| Queso Tybo | 141 u | **1000 u** |

Esos dos están en alerta permanente y nunca van a salir: nadie tiene mil kilos
de muzzarella. Cuando el cartel rojo dice "7 ingredientes bajo" y dos son
mentira fija, el cartel deja de significar algo. Eso es lo que entrena a
ignorarlo.

Y hay dos insumos con seguimiento y compras que **ninguna receta usa**:
`Pan de papa` y `Pan de paty sin semilla`. O falta ligarlos a un producto, o hay
una hamburguesa consumiendo un pan distinto del que realmente se le pone —en
cuyo caso el stock del pan correcto no baja nunca y el del otro sí—.

## What Changes

- **Corregir los mínimos** de los dos quesos con valores reales.
- **Resolver los dos panes**: ligarlos a la receta que corresponda, o apagarles
  el seguimiento si ya no se usan.
- **Que un mínimo absurdo no pase desapercibido**: avisar al cargarlo cuando es
  mucho mayor que lo que se compra habitualmente de ese insumo.

## Capabilities

### Modified Capabilities

`seguimiento-de-stock` — la spec dice cuándo un ítem avisa. Falta que ese aviso
sea creíble: un mínimo mal cargado no genera una alerta, genera ruido que apaga
todas las demás.

## Impact

**Repos:** solo `que-copado`.

**Bloqueado en los datos:** los valores reales los sabe David. Las dos primeras
tareas son carga, no código.

**Cómo se encontró:** cruzando `stock_tracking_enabled` contra las recetas y
contra los movimientos de compra. La consulta está en el historial de la sesión
del 2026-09-18.

## Fuera de alcance

- **Los costos mal cargados**, que son el mismo tipo de problema de carga pero
  con su propio cambio: `los-costos-mezclan-unidades`.
