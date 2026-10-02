# Design

## Context

- Los datos del local están escritos a mano en trece archivos (ver la tabla de
  `proposal.md`). Algunos corren en el servidor (`order-formatter`,
  `geocoding`, `layout` con `metadata`), otros en el cliente (`header`,
  `ticket-print-layout`, `zone-map-editor`, `hoja-impresa`).
- `next.config.ts` ya deriva la CSP de `NEXT_PUBLIC_SUPABASE_URL`, pero conserva
  el host de producción como respaldo y lo repite en `images.remotePatterns`.
- `NEXT_PUBLIC_APP_URL` ya existe y alimenta `metadataBase`.
- La búsqueda de direcciones ya no depende de Catamarca: se inclina con la caja
  de las zonas de reparto (`viewboxDeReparto`). El único resto es el centro del
  mapa del editor de zonas, que abre en Catamarca cuando no hay zonas.

## Goals / Non-Goals

**Goals:**

- Un solo archivo que diga quién es el local.
- Que otro local se levante con variables de entorno, sin tocar código.
- Que Que Copado no note nada: con las variables sin cargar, todo sale igual.

**Non-Goals:**

- Editar los datos desde el panel.
- Varios locales en una base.
- Los textos de la tienda y los colores.
- Subir el logo desde el panel.

## Decisions

### 1. `lib/negocio.ts`, con variables `NEXT_PUBLIC_*` y valores de Que Copado

```ts
export const NEGOCIO = {
  nombre: env('NEXT_PUBLIC_NEGOCIO_NOMBRE', 'Que Copado'),
  rubro: env('NEXT_PUBLIC_NEGOCIO_RUBRO', 'Hamburguesería'),
  lema: env('NEXT_PUBLIC_NEGOCIO_LEMA', 'Las mejores hamburguesas'),
  descripcion: env('NEXT_PUBLIC_NEGOCIO_DESCRIPCION',
    'Las mejores hamburguesas de la zona. Pedí ahora por WhatsApp!'),
  sitio: env('NEXT_PUBLIC_APP_URL', null),   // sin valor por defecto: ver abajo
  logo: env('NEXT_PUBLIC_NEGOCIO_LOGO', '/logo.svg'),
  centroDelMapa: { lat: -28.4696, lng: -65.7795, zoom: 13 }, // NEXT_PUBLIC_NEGOCIO_CENTRO="lat,lng"
} as const
```

- `NEXT_PUBLIC_` porque varios usos son del cliente. Next las reemplaza en el
  build, así que cada variable se lee con `process.env.NEXT_PUBLIC_…` escrito
  entero: un acceso dinámico (`process.env[nombre]`) llega vacío al
  navegador. `env()` recibe el valor, no el nombre.
- Una variable vacía (`""`) cuenta como no cargada.
- `centroDelMapa` acepta `"lat,lng"` y valida que sean números. Si no lo son,
  vale Catamarca y se avisa en la consola del servidor.
- **El sitio no tiene valor por defecto.** `quecopado.com` es de otro negocio
  (una tienda de artículos para fiestas, "QueCopado!", en Shopify), y cada
  mensaje de WhatsApp terminaba con "Enviado desde queCopado.com". Producción
  no carga `NEXT_PUBLIC_APP_URL` (tarea 1.1): por eso además `og:image` sale
  `http://localhost:3000/logo.svg`. Sin sitio, el mensaje no lleva esa línea y
  `metadataBase` queda como hoy. Cuando David cargue la variable en Vercel, las
  dos se arreglan solas.

*Alternativa descartada:* la tabla `business_settings`. Cada página y cada
hoja impresa tendrían que ir a buscar el nombre a la base, y el ticket y las
hojas se imprimen desde el cliente. Hace sentido el día que un local quiera
cambiar su nombre sin pedirlo; hoy no.

*Alternativa descartada:* exigir las variables (que el build falle si faltan).
Obliga a cargarlas en Vercel antes de desplegar, para un solo local. Se revisa
cuando llegue el segundo (ver `proposal.md`).

### 2. Qué lee cada archivo

| Archivo | Antes | Después |
|---|---|---|
| `app/layout.tsx` | "Que Copado - Las mejores hamburguesas" | `` `${nombre} - ${lema}` ``, `descripcion` |
| `header`, `admin-sidebar`, `admin/login` | `src="/logo.svg" alt="Que Copado"` | `src={logo} alt={nombre}` |
| `app/layout.tsx` (íconos y `openGraph`) | `/logo.svg` | `logo` |
| `header`, `footer`, `admin-sidebar` (×2), `admin/login` | `Que <span>Copado</span>` | `<NombreDelLocal />` |
| `footer` | "© 2026 Que Copado." | `nombre` |
| `business-settings-form` | `placeholder="que.copado.mp"` | `"mi.local.mp"` (un ejemplo, no el dato) |
| `hoja-impresa` | "Que Copado" / "Hamburguesería" | `nombre` / `rubro` |
| `ticket-print-layout` | "QUE COPADO" | `nombre.toUpperCase()` |
| `order-formatter` | "NUEVO PEDIDO - QUE COPADO", "Enviado desde queCopado.com" | `nombre.toUpperCase()`; la línea, con el host de `sitio`, solo si hay sitio |
| `geocoding` | "QueCopado Hamburguesas (delivery@quecopado.com)" | `nombre`, y `sitio` entre paréntesis si hay |
| `zone-map-editor` | `CATAMARCA_COORDS` | `centroDelMapa` |

- **Nominatim** pide que el `User-Agent` identifique la aplicación y una forma
  de contacto. El sitio sirve de contacto. El mail `delivery@quecopado.com`
  es del dominio del otro negocio.
- El footer tiene además "Las mejores hamburguesas artesanales…" y "para los
  amantes de las buenas burgers": son textos de la tienda, fuera de alcance.

- **El logo por dirección.** Los cuatro logos son `<img>` (un SVG, que
  `next/image` no optimiza), así que una dirección externa no pasa por
  `images.remotePatterns`. Sí por la CSP: `img-src` ya admite el Supabase del
  local, que es donde se subiría. Un logo en otro dominio tendría que sumarse
  a la CSP; no se abre de antemano.
- **`NombreDelLocal`** (`components/nombre-del-local.tsx`) parte el nombre en
  el último espacio y pone la última palabra en un `<span>` con la clase que
  le pasa cada lugar (`text-[#FEC501]` en la tienda,
  `text-[var(--admin-accent-text)]` en el panel). Cada lugar conserva su
  color: el componente no decide la marca.

### 3. `next.config.ts`: el host sale de la variable

`new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)` sin respaldo, y
`images.remotePatterns` usa su `protocol` y `hostname`. Sin la variable el
build falla con un mensaje claro, lo que está bien: sin ella la aplicación
tampoco anda. Contra el stack local el patrón queda `http://127.0.0.1:54321`
(Next 16 igual no optimiza imágenes de direcciones locales sin
`dangerouslyAllowLocalIP`; no se toca).

## Risks / Trade-offs

- **Un local nuevo sin variables sale como Que Copado.** Aceptado mientras haya
  uno solo (decisión pendiente de David).
- **El `User-Agent` de Nominatim cambia.** Nominatim no bloquea por cambio de
  agente, sí por abuso; el volumen es el mismo.
- **`next.config.ts` sin respaldo** rompe un build sin variables. Vercel las
  tiene; la tarea 3.2 lo comprueba antes de mergear.
