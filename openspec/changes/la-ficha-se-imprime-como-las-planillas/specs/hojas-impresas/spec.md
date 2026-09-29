# Spec Delta

## Purpose

Cómo se ven las hojas A4 que imprime el panel —la planilla de conteo, el
reporte de costos, la ficha técnica—, para que sean reconocibles como del
mismo sistema y se lean igual.

## ADDED Requirements

### Requirement: Las hojas A4 del panel comparten formato

Toda hoja A4 que imprime el panel SHALL tener el mismo encabezado —el nombre
del local a la izquierda; a la derecha, qué hoja es y cuándo se imprimió—
separado del contenido por una sola línea, y SHALL mostrar sus tablas con el
mismo estilo: encabezados de columna chicos, en gris y sobre fondo claro, y
filas separadas por una línea fina.

Los montos SHALL mostrarse sin centavos, como en el resto del panel.

En pantalla, cada hoja SHALL mostrarse con una barra que tiene el botón de
imprimir; la barra NO SHALL salir en el papel.

Existe porque la planilla de conteo y el reporte de costos compartían un
formato y la ficha técnica tenía otro, con encabezados de tabla negros, un
recuadro de logo vacío y montos con centavos: parecía de otro sistema.

#### Scenario: Las tres hojas, una al lado de la otra

- **WHEN** se imprimen la planilla de conteo, el reporte de costos y la ficha
  técnica
- **THEN** las tres tienen el mismo encabezado y el mismo estilo de tabla

#### Scenario: Un monto en una hoja

- **WHEN** una hoja muestra un costo de $20.729,47
- **THEN** dice "$ 20.729"

#### Scenario: La barra de imprimir

- **WHEN** se abre una hoja en pantalla
- **THEN** arriba hay una barra con el botón de imprimir
- **AND** al imprimir la barra no sale en el papel
