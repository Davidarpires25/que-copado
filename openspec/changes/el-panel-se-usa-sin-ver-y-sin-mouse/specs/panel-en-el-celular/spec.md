# Spec Delta

## MODIFIED Requirements

### Requirement: Los controles se tocan con el dedo

En una pantalla táctil, todo control del panel —botón, link de navegación,
campo, selector, casilla, interruptor— SHALL tener un área que responde al
toque de al menos 44×44px, según WCAG 2.2, criterio 2.5.5 (Target Size,
Enhanced). Rige también en los diálogos y menús que abre el panel.

Cuando el control se dibuja más chico —un ícono de ayuda, una casilla, un
interruptor—, el área de toque SHALL agrandarse sin cambiar cómo se ve. Las
áreas de dos controles vecinos SHALL no pisarse: tocar uno no activa el otro.

Quedan fuera, como permite el mismo criterio, los links dentro de un texto
corrido. Quedan fuera también los controles del mapa de zonas de envío.

Con mouse, los 44px no rigen: los controles SHALL verse como antes de este
requisito, salvo donde medían menos de 24×24px, que es el mínimo con mouse de
`panel-accesible`. La tienda pública SHALL no cambiar, aunque comparta
componentes con el panel.

Existe porque en modo táctil había 298 controles por debajo de 44px en 29
pantallas, y los peores —las flechas para reordenar categorías, de 18×18px—
hacían tocar la flecha de al lado, o nada.

#### Scenario: Recorrer el panel con el dedo

- **WHEN** se abre cada pantalla del panel que no es de impresión en una
  pantalla táctil de 390px
- **THEN** todo control visible responde al toque en un área de al menos
  44×44px

#### Scenario: Reordenar una categoría desde el celular

- **WHEN** se toca la flecha para subir una categoría en una pantalla táctil
- **THEN** el área que responde al toque mide al menos 44×44px
- **AND** tocarla no activa la flecha de bajar

#### Scenario: La ayuda de un campo

- **WHEN** se toca el ícono de ayuda de un campo en una pantalla táctil
- **THEN** el área que responde mide al menos 44×44px
- **AND** el ícono se ve del mismo tamaño que antes

#### Scenario: El mismo panel con mouse

- **WHEN** se abre "Nuevo producto" a 1280px con mouse
- **THEN** los botones y campos miden lo mismo que antes del cambio

#### Scenario: La tienda en un celular

- **WHEN** se abre el checkout de la tienda en una pantalla táctil
- **THEN** sus botones y campos miden lo mismo que antes del cambio
