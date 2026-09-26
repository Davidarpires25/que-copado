# Spec Delta

## ADDED Requirements

### Requirement: El texto se lee en los dos temas

Todo texto del panel SHALL tener un contraste de al menos 4,5:1 con su fondo
—3:1 si es texto grande (18,66px en negrita o 24px)—, según WCAG 2.2,
criterio 1.4.3, **en el tema claro y en el oscuro**.

El contraste SHALL salir de los tokens de color del panel, no de opacidades:
un texto al 70% de un gris que cumple puede dejar de cumplir según el fondo.

Los niveles de texto —principal, secundario, terciario— SHALL conservarse:
cumplir no es volver todo del mismo gris.

Quedan fuera, como permite el criterio, el texto de controles deshabilitados,
los placeholders de campos vacíos, los logos y lo decorativo. Un texto que se
dibuja con el color de placeholder pero muestra un dato no es un placeholder.

Existe porque la auditoría encontró 161 textos por debajo de 4,5:1 entre los
dos temas: el gris terciario daba 2,33:1 en claro y 2,74:1 en oscuro, y
estaba en 120 lugares del panel.

#### Scenario: Recorrer el panel con axe en los dos temas

- **WHEN** se corre axe-core con la regla `color-contrast` sobre cada pantalla
  del panel, en tema claro y en tema oscuro
- **THEN** no hay violaciones fuera del mapa de zonas

#### Scenario: El texto terciario sigue siendo terciario

- **WHEN** se compara el gris terciario con el secundario en un mismo tema
- **THEN** el terciario tiene menos contraste que el secundario
- **AND** los dos cumplen 4,5:1 con los fondos del panel

#### Scenario: El período elegido en Analytics

- **WHEN** se elige "7 días" en una tarjeta de Analytics en tema claro
- **THEN** el texto del botón elegido, sobre el amarillo, cumple 4,5:1
