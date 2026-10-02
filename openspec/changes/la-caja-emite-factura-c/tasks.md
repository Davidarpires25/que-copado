# Tasks

Todo contra el stack local y contra ARCA simulado; ARCA de verdad solo en
homologación, con el certificado de prueba de David. Nunca producción desde
acá. Los datos locales de David se estacionan y devuelven en los tests de caja
(`e2e/turno.ts`).

## 1. Antes de programar

- [x] 1.1 Confirmar en la documentación oficial de ARCA (manual del
      desarrollador de WSFEv1 y resoluciones vigentes) y anotar con fecha:
      la URL del QR, el tope para facturar a consumidor final sin
      identificarlo, el campo de condición ante el IVA del receptor, si la
      Factura C tiene alguna exigencia de la Ley 27.743, y las direcciones de
      homologación y producción. Verifica: la lista en `design.md`, con links.
      Ya visto (2026-09-30): la RG 4290 deja elegir entre factura electrónica
      y controlador fiscal sin informarlo, así que con la comandera alcanza;
      la RG 5893/2026 suma obligados desde el 1/11/2026 (monotributo social y
      promovido, no alcanzados) sin cambiar eso para el monotributo común. El
      contador de cada local confirma que no está en un régimen especial.
      Hecho: tabla "Datos verificados" en `design.md`, con fuentes. Queda para
      el contador: si al local le inciden "Otros Impuestos Nacionales
      Indirectos" (esta versión no los calcula).
- [x] 1.2 `docs/FACTURACION_ALTA_EN_ARCA.md`: la guía para el dueño (punto de
      venta "Factura electrónica – Monotributo – Web Services" y delegación de
      `wsfe` en la CUIT de David), paso a paso, como la de Fudo. Verifica: la
      lee David.
      Hecho: escrita con los pasos que publica Fudo y otra guía pública
      (SaaS Argentina). Falta que la lea David, y la CUIT de David para el
      paso 2, que la guía deja como "la CUIT que te pasamos".

## 2. Base

- [x] 2.1 Migración: `datos_fiscales`, `facturas` (con los índices únicos de
      la Decisión 5) y `arca_ticket_de_acceso` (solo `service_role`), con RLS.
      Verifica: `supabase migration up` (no `db reset`: borraría los datos
      locales de David) y una prueba de RLS con anon y con un cajero.
      Hecho: `20260930120000_la_caja_emite_factura_c.sql`;
      `e2e/facturacion-base.spec.ts`, 5 tests: sin sesión nada; el cajero ve
      facturas y no datos fiscales; nadie lee el ticket de ARCA; nadie
      escribe desde el navegador; la segunda factura del mismo pedido choca en
      `facturas_una_por_pedido`.

## 3. ARCA (Decisiones 1 a 4)

- [x] 3.1 ARCA simulado para los tests (WSAA y WSFEv1: éxito, rechazo, número
      no correlativo, sin respuesta).
      Hecho: `e2e/arca-simulado.ts`. Verifica el CMS firmado, el token y la
      CUIT representada; como el de verdad, no da un segundo ticket mientras
      el primero valga; modos para la delegación que falta, el rechazo y la
      respuesta que se pierde con el comprobante autorizado.
- [x] 3.2 `lib/arca/wsaa.ts` con el ticket guardado en la base. Verifica:
      contra el simulado, un segundo pedido reutiliza el ticket; dos a la vez
      terminan con uno solo.
      Hecho: el test de la carrera falla si se quita la espera al ticket del
      otro pedido (verificado). Se firma con SHA-256; si homologación lo
      rechaza (`cms.sign.invalid`), es ese valor (tarea 6.1).
- [x] 3.3 `lib/arca/wsfe.ts`. Verifica: contra el simulado, los cuatro casos.
- [x] 3.4 `lib/arca/qr.ts`. Verifica: la cadena decodificada es el JSON de la
      RG 4892 con los datos del comprobante.
      Hecho (3.2 a 3.4): `e2e/arca.spec.ts`, 8 tests contra el simulado.

## 4. Emitir (Decisiones 5 y 6)

- [x] 4.1 `app/actions/facturas.ts`: `emitirFactura`, `reintentarFactura`,
      `emitirNotaDeCredito`, `probarConexion`. Verifica: dos emisiones
      simultáneas del mismo pedido dejan una sola factura; un timeout con la
      factura autorizada del lado de ARCA no pide otra.
      Hecho: la lógica en `lib/facturas/emitir.ts` y las acciones en
      `app/actions/facturas.ts` (`facturarPedido`, `probarConexion`,
      `leerFacturacion`, `guardarFacturacion`, `facturasDePedidos`).
      `e2e/facturas-emitir.spec.ts`, 10 tests. La fila se toma con la función
      `tomar_factura`: con `.or()` de supabase-js no andaba (lección 53).
- [x] 4.2 La factura automática después del cobro de mostrador, de mesa y de
      un pedido web, según los medios tildados. Verifica: con efectivo
      destildado, un cobro en efectivo no factura y uno mitad efectivo y
      mitad tarjeta sí; con ARCA simulado caído, el pedido queda cobrado y la
      factura pendiente, y el cajero ve los dos hechos.
      Hecho: `lib/facturas/al-cobrar.ts`; el cobro espera a ARCA hasta 6 s y
      después la emisión sigue con `after()`. El aviso dice "Pago registrado ·
      Factura C 0007-00000001". `e2e/facturas-caja.spec.ts`, con el turno de
      David estacionado y devuelto.
- [x] 4.3 Anular un pedido facturado emite la nota de crédito. Verifica: e2e.

## 5. Pantallas (Decisiones 7 y 8)

- [x] 5.0 Con la facturación apagada (la fila de `datos_fiscales` sin crear o
      con `activa = false`), nada cambia. Verifica: e2e de un cobro con su
      ticket y el Historial, con ARCA simulado contando pedidos (cero); los
      tests de caja existentes, en verde sin tocarlos.
      Hecho el primero (`facturas-caja.spec.ts`, "5.0"). Los de caja
      existentes se corren en 6.2.
- [x] 5.1 Ajustes → Facturación, con "Probar conexión". Verifica: e2e con el
      simulado (conectado y sin delegación); axe sin fallas en los dos temas;
      un cajero no la ve.
      Hecho: `components/admin/settings/facturacion-section.tsx`, pestaña
      después de Cobros. `e2e/facturas-ajustes.spec.ts`, 5 tests (conexión,
      sin delegación, CUIT inválida, encender pide los datos, axe en los dos
      temas, cajero).
- [x] 5.2 Historial: el número de la factura como texto; pendiente y
      rechazada en aviso, con motivo y "Reintentar"; "Facturar" en un pedido
      cobrado sin factura. Verifica: e2e; sin píldoras (`resaltadosDeLaTabla`).
      Hecho: en la columna Estado, debajo de "Pagado", el comprobante en gris
      o "Factura pendiente/rechazada" en aviso; al abrir la fila, el motivo y
      "Reintentar" o "Facturar". Tres tests en `facturas-caja.spec.ts`.
- [x] 5.3 El cierre de caja muestra las facturas pendientes del turno (no
      bloquea). Verifica: e2e.
      Hecho: un aviso como el de los pedidos de WhatsApp; test "5.3" en
      `facturas-caja.spec.ts`.
- [x] 5.4 El ticket lleva `factura`; `/admin/facturas/[id]/print` con el QR.
      Verifica: captura; el QR escaneado abre la URL de ARCA con los datos.
      Hecho: `lib/facturas/ticket.ts` arma el bloque (emisor, "Factura C ·
      Cód. 011", número, "Consumidor Final", CAE, vencimiento, QR) para el
      puente y para la página del navegador; `/admin/facturas/[id]/print`
      lleva al ticket del pedido, que ya lo incluye. El QR de la captura,
      leído con `zbarimg`, da `https://www.arca.gob.ar/fe/qr/?p=…` con los
      datos del comprobante. Dos tests "5.4" en `facturas-caja.spec.ts`.
      Sumado (David, 2026-10-02): con la facturación encendida, el ticket que
      no es la factura dice "Documento no válido como factura" (RG 1415);
      viaja como `print_jobs.data.noValidoComoFactura`. Tercer test "5.4".
- [ ] 5.5 `../print-bridge`: bloque fiscal y QR en ESC/POS, y
      `docs/INTEGRACION.md`. Verifica: un ticket con factura en la impresora
      del local (David).
      Pendiente: en esta máquina no hay .NET para compilarlo ni probarlo. El
      dato ya viaja: `print_jobs.data.factura` con la forma de
      `FacturaDelTicket` (`lib/facturas/ticket.ts`); el puente actual lo
      ignora y sigue imprimiendo el ticket (visto en su código: despacha por `type`,
      que no cambió). Falta en `Impresora.cs`: si `factura` viene, el
      bloque del emisor bajo el nombre, y abajo el QR (`GS ( k`, modelo 2,
      con `factura.qr`), CAE, vencimiento y "Comprobante autorizado por
      ARCA", como la página del navegador.

## 6. Cierre

- [x] 6.1 Homologación real con el certificado de prueba de David: factura,
      nota de crédito, rechazo por un dato mal cargado. Verifica: los CAE de
      homologación anotados acá.
      Hecho (2026-10-02), con el certificado de homologación de David
      (`~/.arca/homologacion/`, fuera del repo; DN `davidarpiresdn`,
      autorizado para `wsfe`) y el mismo código de `lib/arca`: FEDummy OK;
      ticket de acceso con la firma SHA-256 aceptada; Factura C 0001-00000001
      por $ 1.234,50, CAE 86400942628100 (vence 12/10/2026), sin
      observaciones; la consulta devuelve ese CAE e importe; Nota de Crédito C
      asociada, CAE 86400942628113. Falta el rechazo por un dato mal cargado:
      se probó contra el simulado, y en homologación no hace falta forzarlo.

- [x] 6.2 `npm run lint`, `npm run build`, los tests de caja y los nuevos.
      Verifica: la salida.
      Hecho (2026-09-30): lint sin errores (el aviso de siempre en
      `orders.ts`), build en verde. Tests: 62 (facturación y caja) + 25
      (movimientos, mesas, pedidos, tablas, hojas, datos del local) pasan.
      Accesibilidad, celular e hidratación: 9 fallas, las mismas que en
      `main` con el mismo código de `main` (Analytics, Arqueos, Cocina,
      edición de producto, ficha; desbordes; hidratación por zona horaria):
      no son de este cambio. Los datos locales de David, iguales.
- [ ] 6.3 Producción, cuando un local haga sus dos trámites: la primera
      factura real, revisada con su contador. Verifica: la respuesta de David.
