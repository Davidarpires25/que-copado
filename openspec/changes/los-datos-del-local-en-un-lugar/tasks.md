# Tasks

Todo contra el stack local. El cambio no escribe en la base. Antes de cada
tanda de capturas se verifica que el servidor sirva el código actual (lección
39).

## 1. Antes de tocar

- [x] 1.1 Comprobar qué variables tiene producción. Sin acceso a Vercel desde
      acá, se miró lo que publica (2026-09-29, que-copado.vercel.app y
      quecopado.netlify.app): la CSP trae `yyphmsxxzgjdvblfrfpv.supabase.co`
      (la variable de Supabase está: sin ella la app no anda), y `og:image` es
      `http://localhost:3000/logo.svg`, así que `NEXT_PUBLIC_APP_URL` **no**
      está cargada. Además `quecopado.com` es de otro negocio (Shopify,
      "QueCopado!"): se le avisa a David.
- [x] 1.2 `e2e/datos-del-local.spec.ts`:
      - ningún archivo de `app/`, `components/` ni `lib/` (fuera de
        `lib/negocio.ts`) tiene "Copado" (suelto o partido en `Que <span>Copado`),
        "Hamburguesería" ni las coordenadas de Catamarca, salvo en comentarios
        y la clave del carrito;
      - `next.config.ts` no tiene el host de producción;
      - con las variables sin cargar, el título de la página, la hoja A4 y el
        ticket dicen lo mismo que hoy;
      - el mensaje de WhatsApp no nombra `queCopado.com`.
      Verifica: falla hoy lo primero, lo segundo y lo cuarto; pasa lo tercero.
      Hecho: en `main` fallan tres y pasa el de las pantallas (dos corridas).
      El primero lista 21 renglones en 12 archivos.

## 2. El módulo (Decisión 1)

- [x] 2.1 `lib/negocio.ts` con `NEGOCIO` y su lectura de variables. Verifica:
      lint y tipos.
- [x] 2.2 `components/nombre-del-local.tsx`. Verifica: las capturas del
      encabezado, el footer, el login y el panel, iguales a `main` píxel a
      píxel.
      Hecho: encabezado, login, panel (escritorio y celular), hoja y ticket
      idénticos. El footer difiere en un recuadro de 7×9 px sobre el año del
      copyright: antialiasing del texto partido en otro nodo; a la vista es
      igual.

## 3. Los usos (Decisiones 2 y 3)

- [x] 3.1 Los archivos de la tabla de la Decisión 2 leen de `NEGOCIO`; se borra
      `CATAMARCA_COORDS`. Verifica: pasa 1.2.
- [x] 3.2 `next.config.ts` sin el host de producción. Verifica: `npm run
      build` con las variables de producción y con las locales; la CSP servida
      es la misma que en `main` con las de producción.
      Hecho: evaluada la configuración de `main` y de la rama con el Supabase
      de producción, la CSP y las imágenes permitidas son idénticas. Sin la
      variable, falla con "Falta NEXT_PUBLIC_SUPABASE_URL". `npm run build`
      pasa.
- [x] 3.3 `CLAUDE.md`: las variables nuevas, opcionales, con sus valores por
      defecto.

## 4. Cierre

- [x] 4.1 Levantar el servidor con `NEXT_PUBLIC_NEGOCIO_NOMBRE="Local de
      Prueba"`, `NEXT_PUBLIC_NEGOCIO_RUBRO="Pizzería"` y otro centro. Capturas
      de la tienda, el login, la hoja A4, el ticket y el mapa de zonas.
      Verifica: dicen "Local de Prueba" y el mapa abre en el otro centro.
      Hecho con Córdoba (`-31.4201,-64.1888`), `/logo-green.svg` y un sitio
      de ejemplo: la tienda, el footer, el panel, la hoja ("Pizzería"), el
      ticket y el mensaje de WhatsApp dicen "Local de Prueba"; el título es
      "Local de Prueba - Pizzas a la piedra", `og:image` usa el sitio, y el
      mapa abre en Córdoba. Un centro mal escrito, vacío o fuera de rango
      vuelve a Catamarca con aviso.
- [x] 4.2 `npm run lint`, `npm run build`, los tests de hojas, caja y el nuevo.
      Verifica: la salida.
      Hecho: lint 0 errores (el aviso de siempre en `orders.ts`), tipos y build
      en verde. Nueve specs (nuevo, hojas, dos de caja, celular, navbar ×2,
      costos, hidratación): 77 pasan, 5 fallan. Las 5 fallan igual en `main`
      (desborde en analytics/cocina/dashboard, un botón de 28×28 en arqueos,
      hidratación en arqueos y dashboard): no son de este cambio. Los datos
      locales de David, iguales antes y después.

- [ ] 4.3 Después del despliegue, la tienda y un ticket de producción siguen
      diciendo "Que Copado". Verifica: la página publicada.
