# Spec Delta

## ADDED Requirements

### Requirement: Los datos del local se configuran en un solo lugar

El nombre, el rubro, el lema, la descripción, el sitio, el logo y el centro
del mapa del local SHALL definirse en un solo módulo (`lib/negocio.ts`). Ninguna otra parte
del código SHALL escribir a mano esos datos, salvo en comentarios.

Cada dato SHALL poder cambiarse con una variable de entorno
`NEXT_PUBLIC_NEGOCIO_*` (el sitio, con `NEXT_PUBLIC_APP_URL`). Sin la variable,
o con la variable vacía, SHALL valer el dato de Que Copado, salvo el sitio:
sin sitio, nada SHALL nombrar un dominio.

Existe para que otro local se pueda instalar con el mismo código. Antes el
nombre estaba escrito en trece archivos.

#### Scenario: Que Copado sin variables

- **GIVEN** ninguna variable `NEXT_PUBLIC_NEGOCIO_*` cargada
- **WHEN** se abre la tienda, se imprime un ticket o una hoja A4, o se arma el
  mensaje de WhatsApp de un pedido
- **THEN** dicen "Que Copado", como antes

#### Scenario: Otro local

- **GIVEN** `NEXT_PUBLIC_NEGOCIO_NOMBRE="Local de Prueba"` y
  `NEXT_PUBLIC_NEGOCIO_RUBRO="Pizzería"`
- **WHEN** se abre la tienda, se imprime un ticket o una hoja A4, o se arma el
  mensaje de WhatsApp de un pedido
- **THEN** dicen "Local de Prueba" y la hoja dice "Pizzería"
- **AND** ninguno dice "Que Copado"

#### Scenario: Sin sitio cargado

- **GIVEN** `NEXT_PUBLIC_APP_URL` sin cargar
- **WHEN** se arma el mensaje de WhatsApp de un pedido
- **THEN** el mensaje no nombra ningún dominio

#### Scenario: El centro del mapa mal escrito

- **GIVEN** `NEXT_PUBLIC_NEGOCIO_CENTRO="catamarca"`
- **WHEN** se abre el editor de zonas sin zonas cargadas
- **THEN** el mapa abre en el centro por defecto

### Requirement: El Supabase se toma de su variable

La configuración de Next (la CSP y las imágenes permitidas) SHALL tomar el
Supabase de `NEXT_PUBLIC_SUPABASE_URL` y NO SHALL tener escrito el host de
producción.

#### Scenario: Producción

- **GIVEN** `NEXT_PUBLIC_SUPABASE_URL=https://yyphmsxxzgjdvblfrfpv.supabase.co`
- **WHEN** se arma la configuración
- **THEN** la CSP y las imágenes permitidas son las mismas que antes del cambio

#### Scenario: Sin la variable

- **GIVEN** `NEXT_PUBLIC_SUPABASE_URL` sin cargar
- **WHEN** se construye la aplicación
- **THEN** el build falla diciendo qué variable falta
