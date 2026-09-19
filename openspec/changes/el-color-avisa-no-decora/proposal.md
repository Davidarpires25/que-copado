# Proposal

## Why

David, mirando la tabla de insumos: *"todas las tablas en sus campos contienen
información cerrada en un círculo. El dato descartable y unidad los cierran
círculos con colores. Me hace sentir que es muy IA y no se ve bien."*

Tiene razón, y el problema tiene nombre: **el color dejó de significar algo.**

Una píldora es cara. Cuesta un borde, un relleno, un color y un texto más chico
para que entre. Ese costo se paga cuando el dato es **un estado que hay que
detectar de un vistazo** —"Agotado", "Bajo", "Negativo"—, porque ahí el color
hace trabajo real: te lleva el ojo a la fila que tiene un problema.

Hoy también lo pagan datos que no son estados. La categoría de un insumo y su
unidad de medida son atributos permanentes: no hay nada que detectar ni ninguna
acción que se dispare. Y como **todas** las filas tienen categoría y unidad,
todas las filas tienen píldora. Cuando todo está resaltado, nada lo está.

## Qué se rompe hoy en el local

No hay pantalla caída ni número mal. Lo que se rompe es la lectura:

- **El estado compite con el adorno.** En la tabla de insumos, la fila de un
  insumo agotado tiene el badge rojo de "Bajo" *y* el badge de su categoría *y*
  el círculo de su unidad. Tres formas de colores en una fila donde una sola
  importa. Encontrar los agotados en una lista de 106 insumos es más lento de lo
  que debería.
- **La unidad se lee peor encerrada que suelta.** El círculo obliga a achicar el
  texto para que entre. Una columna de 106 filas son 106 formas que el ojo tiene
  que descartar para leer "kg", "g", "u".
- **Y la sensación que describe David es real:** uniformidad sin jerarquía. Todo
  tiene el mismo tratamiento decorativo, así que nada guía la mirada.

## El relevamiento

31 usos de `<Badge>` en el panel. Clasificados uno por uno:

| | | |
|---|---|---|
| **Estado** — el color avisa | ~17 | `OK`, `Bajo`, `Agotado`, `Negativo`, `Sin seguimiento`, `Crítico`, `A la venta`, `Auto-deshabilitado`, `Inactiva`, tipo de movimiento |
| **Atributo o adorno** — el color no dice nada | ~14 | unidad de medida (×4), categoría (×2), `Costo: $X`, `Costo total: $X`, `×2`, `x`, `compuesto` |

Los dos de la captura de David están en la segunda fila.

## What Changes

- **Los atributos pasan a texto plano.** Categoría y unidad se escriben, no se
  encierran. La unidad va en gris chico pegada al número —`3 kg`— en vez de en
  su propia columna decorada.
- **El badge queda reservado para estado.** Una regla que se puede decir en una
  línea: *si no cambia según lo que pase, no lleva color.*
- **Los totales dejan de ser píldoras.** `Costo: $4.500` es un número, y un
  número se lee mejor como número.
- **Queda escrito como convención**, para que la próxima tabla no vuelva a
  empezar. Hoy no hay ninguna spec que diga cómo se lee una tabla del panel.

## Lo que no se toca

El badge de estado se queda **igual**: mismos colores, mismos textos. Este
cambio no rediseña la paleta ni toca la semántica de los estados. Saca ruido
alrededor para que el estado se vea, que es exactamente lo contrario de
rediseñarlo.

## Capabilities

### Added Capabilities

`tablas-del-admin` — cómo se lee una tabla del panel: qué se resalta, qué no, y
por qué. No existe ninguna spec que lo diga, y por eso cada tabla lo resolvió
distinto.

## Impact

**Repos:** solo `que-copado`. No toca AgentePOS: es presentación del panel, y el
agente no tiene interfaz.

**Sin migración.** No cambia ningún dato ni ningún esquema: cambia cómo se
dibuja lo que ya se lee.

**Riesgo bajo, y acotado.** Son cambios de clases CSS en celdas de tabla. Lo que
sí hay que cuidar es no romper el `hidden md:table-cell` de las columnas que ya
se esconden en pantalla chica.

## Fuera de alcance

- **Rediseñar los estados.** Los colores y textos de `OK` / `Bajo` / `Agotado`
  quedan como están.
- **La deuda de contraste del tema claro.** El panel está calibrado para oscuro
  y hay texto en 1.59:1 sobre blanco. Es un problema real y separado.
- **Las tablas del público** (carrito, checkout). Esto es el panel.
- **Unificar los componentes de tabla.** Hay varias implementaciones; juntarlas
  es otro trabajo y no hace falta para esto.
