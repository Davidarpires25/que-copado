# Spec Delta

## ADDED Requirements

### Requirement: La acción de una fila se ve sin deslizar la tabla

Cuando una tabla del panel no entra a lo ancho y se desliza, la columna de
acciones de cada fila —editar, borrar— SHALL quedar a la vista. Lo que se
desliza SHALL ser las columnas de datos.

Los encabezados de dos columnas vecinas SHALL no pisarse.

En escritorio, donde la tabla entra entera, SHALL verse como hoy.

Existe porque las tablas de productos, recetas, stock, insumos y equipo
desbordaban en el celular y lo que quedaba afuera era justo el lápiz para
editar. Nada indicaba que hubiera que deslizar: la fila parecía no tener
acciones.

#### Scenario: Editar un insumo desde el celular

- **WHEN** se abre la tabla de stock en una ventana de 390px
- **THEN** el botón para editar cada fila se ve entero sin deslizar la tabla
- **AND** los encabezados "Stock Actual" y "Estado" se leen sin pisarse

#### Scenario: Deslizar una tabla ancha

- **WHEN** se desliza a la izquierda la tabla de productos en el celular
- **THEN** las columnas de datos se corren
- **AND** la columna de acciones sigue en su lugar, sin quedar tapada ni
  transparente sobre los datos que pasan por debajo

#### Scenario: Una tabla sin acciones por fila

- **WHEN** una tabla no tiene columna de acciones, como el reporte de costos
- **THEN** se desliza entera dentro de su contenedor
- **AND** la página no se desliza
