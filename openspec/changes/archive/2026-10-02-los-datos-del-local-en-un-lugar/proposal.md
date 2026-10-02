# Proposal

## Why

David quiere, más adelante, ofrecer el sistema a otros locales como servicio:
el mismo código y una instalación por local. Por ahora no hay otro local
interesado, así que no se construye nada de eso. Lo único que sirve para
cualquier camino, y no cuesta casi nada, es que el código deje de tener
escritos a mano los datos de Que Copado.

Hoy el nombre, el rubro, la ciudad y el host de Supabase de producción están
repartidos en trece archivos:

| Dónde | Qué dice |
|---|---|
| `app/layout.tsx` | título y descripción: "Que Copado - Las mejores hamburguesas" |
| `components/header.tsx`, `footer.tsx`, `admin-sidebar.tsx`, `admin/login/page.tsx` | el nombre en dos colores ("Que" + "Copado" resaltado), el `alt` y `/logo.svg` del logo, el copyright |
| `app/admin/settings/business-settings-form.tsx` | "que.copado.mp" como ejemplo de alias |
| `components/admin/hojas/hoja-impresa.tsx` | "Que Copado / Hamburguesería" en las hojas A4 |
| `components/admin/caja/ticket-print-layout.tsx` | "QUE COPADO" en el ticket |
| `lib/services/order-formatter.ts` | "NUEVO PEDIDO - QUE COPADO" y "Enviado desde queCopado.com" en el WhatsApp |
| `lib/services/geocoding.ts` | "QueCopado Hamburguesas (delivery@quecopado.com)" como identificación ante Nominatim |
| `lib/utils.ts` → `zone-map-editor.tsx` | `CATAMARCA_COORDS`, el centro del mapa de zonas |
| `next.config.ts` | `yyphmsxxzgjdvblfrfpv.supabase.co` dos veces (CSP e imágenes) |

## What Changes

- **Un solo módulo con los datos del local** (`lib/negocio.ts`): nombre,
  rubro, lema, centro del mapa, dirección web y logo. Cada dato se lee de una
  variable de entorno `NEXT_PUBLIC_NEGOCIO_*` y, si no está, vale lo de Que
  Copado. Así producción no cambia y no hay que tocar Vercel para desplegar.
- **Los trece archivos leen de ahí.** El ticket, las hojas A4, el mensaje de
  WhatsApp, el título de la página, el logo, el copyright, el mapa de zonas y
  la identificación ante Nominatim.
- **El nombre en dos colores sale de un componente** (`NombreDelLocal`), que
  resalta la última palabra: "Que **Copado**" queda igual. Un nombre de una
  sola palabra sale sin resaltar.
- **El host de Supabase sale de `NEXT_PUBLIC_SUPABASE_URL`** en los dos lugares
  de `next.config.ts`, como ya hace la CSP desde el cambio de la caja. Se va el
  host escrito a mano.
- `CLAUDE.md` lista las variables nuevas, opcionales.

## Lo que se decidió con David (2026-09-29)

- **Valores por defecto de Que Copado.** Un local nuevo que se olvide una
  variable sale con el nombre de Que Copado; se acepta mientras haya un solo
  local, y las variables pasan a exigirse cuando llegue el segundo.
- **El logo, por variable.** `NEXT_PUBLIC_NEGOCIO_LOGO` con la dirección del
  logo (por defecto `/logo.svg`). El de otro local se sube a su Storage o a su
  hosting. Subirlo desde el panel queda para más adelante.

## Lo que apareció al mirar producción

- `quecopado.com` **es de otro negocio** (una tienda de artículos para
  fiestas). Cada pedido por WhatsApp termina "Enviado desde queCopado.com". Sin
  un sitio cargado, esa línea se va.
- `NEXT_PUBLIC_APP_URL` no está en producción: la imagen al compartir el link
  apunta a `localhost`. Se arregla cargando la variable en Vercel (David).

## Capabilities

### New Capabilities

- `datos-del-local`: el nombre, el rubro y la ubicación del local se
  configuran en un solo lugar.

## Fuera de alcance

- **Los textos de la tienda** ("Hamburguesas", "2x1 en Burgers", el hero, las
  promos): son contenido de cada local, no su identidad. Si otro local llega,
  la tienda se trata aparte.
- **`public/logo-green.svg` y `logo-white.svg`**: nadie los usa; quedan hasta
  que se definan los colores.
- **Los colores y el `themeColor`**: dependen de la marca, que `DESIGN.md`
  deja pendiente.
- **Cargar los datos desde el panel** (tabla `business_settings`): hace falta
  cuando un local quiera cambiarlos sin pedírmelo. Hoy no.
- **Varios locales en una misma base** (multi-tenant): no.
- **El ticket en papel**: lo imprime el puente en C# (`../print-bridge`), que
  ya toma el encabezado de su configuración (`NombreNegocio` en `Config.cs`).
  Otro local lo configura ahí. La carpeta `print-bridge/` de este repo es la
  versión anterior, en Node, y todavía dice "Que Copado"; no se toca.
- **La clave del carrito** (`que-copado-cart`, en el navegador): no se ve, y
  cambiarla vaciaría los carritos que la gente tiene armados.
- **Los comentarios** que nombran Catamarca o una hamburguesería cuentan por
  qué se hizo algo; quedan.

## Toca AgentePOS

Sí, pero no en este cambio. Su prompt dice "una hamburguesería en Catamarca"
(`app/agente/prompt.py:15`). Cuando haga falta, se hace en ese repo con el
mismo criterio.

## Impact

- Nuevo `lib/negocio.ts`.
- Se borra `CATAMARCA_COORDS` de `lib/utils.ts`.
- Los archivos de la tabla. Ninguno cambia lo que se ve con las variables
  sin cargar.
- Tests: `e2e/datos-del-local.spec.ts`.
