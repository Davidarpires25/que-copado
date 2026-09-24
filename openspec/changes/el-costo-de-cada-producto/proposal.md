# Proposal

## Why

El cliente pidió un reporte para imprimir con el costo de los productos.

Hoy el costo existe y se calcula bien —se arregló en `los-costos-mezclan-unidades`,
que encontró siete copias de la misma cuenta— pero solo se ve de a uno: abriendo
la ficha técnica de un producto, o mirando la columna de costo en la tabla. Para
sentarse a revisar precios hace falta tenerlos todos juntos, y en papel.

## Qué se rompe hoy en el local

Nada se cae. Lo que pasa es que **nadie mira los márgenes**, porque para verlos
hay que abrir 48 productos de a uno. Medido contra producción hoy:

| | |
|---|---|
| Productos activos | 48 |
| **Sin costo cargado** | **20** (42%) |
| Margen más bajo con costo | Coca-Cola 600ml, 24,8% |
| El elaborado más flojo | Combo familia, 25,9% |
| Insumos activos | 107 |
| **Insumos sin costo** | **43** (40%) |
| Insumos en gramos o ml | 3 |

Los 20 sin costo son casi todas bebidas, más `Papas con Cheddar` y `Papas
Grandes` —que no tienen receta— y dos combos. Un combo sin costo es peor que
una bebida sin costo: la bebida se compra y se sabe cuánto salió; el combo se
arma con cosas cuyo costo el sistema ya conoce.

## What Changes

- **Se elige qué entra antes de imprimir**: elaborados, combos, reventa e
  insumos, cualquier combinación. Sin elegir nada sale todo, igual que la
  planilla de conteo.
- **Productos: costo, precio y margen**, agrupados por categoría.
- **Insumos: costo por unidad**, agrupados por categoría. Un insumo no se vende,
  así que no tiene precio ni margen: tiene lo que cuesta un kilo, un litro o una
  unidad. Para los que están en gramos o mililitros se agrega el equivalente por
  kilo o litro, porque ahí es donde se esconde el error de mil veces.
- **Lo que no tiene costo sale marcado, no en blanco.** Un renglón vacío se lee
  como "no aplica"; `sin costo` se lee como "falta cargarlo", que es lo que es.
- **Un resumen al pie**: cuántos productos, cuántos sin costo, y el margen
  promedio de los que sí lo tienen.
- **Vive en Productos**, que es la pantalla donde se cambian los precios: si el
  papel sale de un lado y la corrección se hace en otro, se parte una sola
  operación en dos lugares. Mismo criterio que la planilla de conteo, que vive
  en Stock.

## Lo que se decidió con David

**Elegir qué entra, incluidos los insumos.** La primera versión de esta
propuesta traía solo productos. David: *"tiene que mostrar los costos y dar la
opción de elegir productos tanto elaborados como de reventa e ingredientes"*.
Los insumos cambian la forma de la hoja —no tienen margen— pero son la base de
todos los demás costos: un producto elaborado cuesta lo que cuestan sus
insumos.

**Los combos van como grupo aparte**, aunque no estaban en el pedido. Son cuatro
activos, y su costo se calcula distinto —componentes más recetas propias—, así
que mezclarlos con los elaborados escondería esa diferencia. Dejarlos afuera
dejaría un tipo de producto sin reporte.

**Costos y márgenes, no fichas técnicas.** Se ofrecieron las dos: una hoja por
producto con sus ingredientes, o una lista con costo y margen. Eligió la
segunda, que es la que sirve para revisar precios; la primera ya existe, de a
un producto, en la ficha técnica.

**Los 20 sin costo entran igual.** Sacarlos daría un reporte más prolijo y
menos útil: la lista de lo que falta es la mitad del valor que tiene hoy.

## Capabilities

### Added Capabilities

`costos-y-margenes` — qué cuesta cada producto y cuánto deja. No hay ninguna
spec que lo diga: `registro-de-compras` cubre cómo entra el costo de un insumo
y `seguimiento-de-stock` cómo se consume, pero qué deja un producto vendido no
está escrito en ningún lado.

## Impact

**Repos:** solo `que-copado`. No toca AgentePOS: es una hoja para el mostrador.

**Sin migración.** El costo y el precio ya están en `products`; el margen es una
resta y no se guarda.

**Sigue el patrón de la planilla de conteo y de la ficha técnica**: página de
impresión propia, A4, barra en pantalla con el botón que no sale en el papel.

## Fuera de alcance

- **Cargar los costos que faltan.** Son datos del negocio y los carga David. El
  reporte los señala.
- **Histórico de márgenes.** Qué margen tenía un producto el mes pasado es otra
  pregunta, y necesita guardar el costo en cada venta.
- **Sugerir precios.** El reporte informa; el precio lo pone el local.
- **Los productos inactivos.** Si no se venden, su margen no decide nada.
