# Design

## Context

- **El cobro** corre en funciones de Postgres, en una transacción:
  `cobrar_pedido_de_mostrador` (mostrador y web) y `pagar_pedido_de_mesa`,
  llamadas desde `completeMostadorPayment` y `payTableOrder`. Un cobro puede
  repartirse en varios medios (`payment_splits`).
- **Anular:** `cancelPosOrder` anula un pedido en cualquier estado, también
  cobrado. `cancelMostadorOrder` y `cancelTableOrder` solo los abiertos.
- **El ticket** se encola en `print_jobs` (`type: 'client_ticket'`, `data`
  JSON) desde `printClientTicketAction`. Lo imprime el puente en C#
  (`../print-bridge`), que despacha por `type` y **falla con un tipo que no
  conoce**; los campos JSON que no conoce, los ignora.
- **Ajustes** es un solo panel con secciones por línea fina (Horarios, Pausa,
  Stock, Apariencia, Cobros, Datos), con `settings.manage` para editar.
- **Instalación por local** (decisión 2026-09-30): cada local tiene su Vercel
  y su Supabase. El certificado de David se carga en cada uno.

## Goals / Non-Goals

**Goals:**

- Factura C y Nota de Crédito C autorizadas por ARCA, con CAE, desde la caja.
- Que ARCA caído no frene un cobro.
- Que nunca se emitan dos facturas para el mismo pedido.
- Probarlo entero sin datos fiscales reales.

**Non-Goals:** ver "Fuera de alcance" en `proposal.md`.

## Datos verificados (tarea 1.1, 2026-09-30)

Lo que cambia por resolución, con su fuente. Si algo de esto cambia, se
corrige acá y en el único lugar del código que lo usa.

| Dato | Valor | Fuente |
|---|---|---|
| Autenticación (WSAA) | homologación `https://wsaahomo.afip.gov.ar/ws/services/LoginCms`; producción `https://wsaa.afip.gov.ar/ws/services/LoginCms` | [ARCA, WSAA](https://www.afip.gob.ar/ws/documentacion/wsaa.asp) |
| Factura (WSFEv1) | homologación `https://wswhomo.afip.gov.ar/wsfev1/service.asmx`; producción `https://servicios1.afip.gov.ar/wsfev1/service.asmx` | [Manual del desarrollador WSFEv1 v4.7](https://www.afip.gob.ar/ws/documentacion/manuales/manual-desarrollador-ARCA-COMPG.pdf), 01/09/2026 |
| Condición ante el IVA del receptor | `CondicionIVAReceptorId = 5` (consumidor final), válido para clase C. Hoy da la observación 10245; cuando la RG 5616 lo exija, el error 10246 rechaza sin él. **Se manda siempre**, así la fecha de obligatoriedad no importa. | Manual WSFEv1 v4.7, tabla "Condición frente al IVA del receptor" |
| Tope para no identificar al consumidor final | **$10.000.000**: por debajo, documento 99 / número 0; desde ese monto, CUIT, CUIL, CDI o DNI | RG 5700/2025 ([Blog del Contador](https://blogdelcontador.com.ar/news-45898-arca-eleva-a-10-millones-el-limite-para-identificar-al-consumidor-final-en-comprobantes)) |
| QR | `https://www.arca.gob.ar/fe/qr/?p=` + JSON en base64 con `ver`, `fecha`, `cuit`, `ptoVta`, `tipoCmp`, `nroCmp`, `importe`, `moneda`, `ctz`, `tipoDocRec`, `nroDocRec`, `tipoCodAut` (`"E"`), `codAut` | [Especificaciones del QR, ARCA](https://www.afip.gob.ar/fe/qr/documentos/QRespecificaciones.pdf) (RG 4892) |
| Transparencia fiscal (Ley 27.743) | La discriminación del IVA es para el emisor responsable inscripto (A y B): **la C no discrimina IVA**. Todas las clases consignan "Otros Impuestos Nacionales Indirectos" *cuando inciden en el precio*: lo confirma el contador del local; esta versión no los calcula. | [RG 5614/2024](https://www.consejosalta.org.ar/wp-content/uploads/ARCA-5614.pdf), Anexo II, Título III inc. f) y Título IV inc. a) |
| Controlador fiscal | No hace falta: la RG 4290 deja elegir factura electrónica o controlador sin informarlo. La RG 5893/2026 suma obligados desde el 1/11/2026 sin cambiar eso para el monotributo común. | [RG 4290](https://www.argentina.gob.ar/normativa/nacional/norma-313087/actualizacion), [ARCA sobre RG 5893](https://servicioscf.afip.gob.ar/publico/sitio/contenido/novedad/ver.aspx?id=5881) |
| Redondeo | ARCA usa *Round Half Even* | Manual WSFEv1 v4.7 |

## Decisions

### 1. Delegación, como Fudo: un certificado, el de David

ARCA autentica a quien llama (WSAA) con un certificado y le da un *ticket de
acceso* (token y firma) por unas 12 horas, para un servicio (`wsfe`). Cada
pedido a WSFEv1 lleva ese token, la firma y la **CUIT representada**.

- El certificado es de la CUIT de David (`ARCA_CUIT`, `ARCA_CERT`,
  `ARCA_KEY`, variables del servidor, nunca `NEXT_PUBLIC_`).
- La CUIT representada es la del local, de `datos_fiscales.cuit`. ARCA acepta
  el pedido si el local delegó `wsfe` en la CUIT de David.
- En homologación, David se representa a sí mismo (su CUIT en los dos lados),
  sin delegación.

*Alternativa descartada:* que cada local genere su certificado. Es el trámite
más difícil para un dueño (clave privada, CSR, subirlo a ARCA) y Fudo lo
evita por esto mismo.

*Alternativa descartada:* un intermediario (TusFacturas, Afip SDK…). Cobra un
abono por local y agrega una dependencia; lo que resuelve —firmar y hablar
SOAP— se programa una vez.

### 2. El ticket de acceso se guarda en la base

Vercel no conserva memoria entre invocaciones, y **WSAA rechaza un pedido de
ticket nuevo mientras el anterior siga vigente**. Se guarda en
`arca_ticket_de_acceso` (una fila por servicio y ambiente: token, firma,
vence), con RLS que no deja leerlo a nadie más que al servidor
(`service_role`). Se renueva cuando faltan menos de 10 minutos.

Si dos funciones lo renuevan a la vez y WSAA rechaza la segunda por "ya posee
un ticket válido", la segunda relee la fila y usa el de la primera.

### 3. `lib/arca/`: tres piezas chicas, sin librería de SOAP

- `wsaa.ts`: arma el pedido de acceso (XML con `uniqueId`, `generationTime`,
  `expirationTime`, `service`), lo firma como CMS/PKCS#7 con `node-forge`, lo
  manda y lee `token`, `sign` y `expirationTime`.
- `wsfe.ts`: `FEDummy` (¿ARCA está?), `FECompUltimoAutorizado`,
  `FECAESolicitar` y `FECompConsultar`. Sobres SOAP como plantillas; la
  respuesta se lee con `fast-xml-parser`. Cada error de ARCA (`Errors`,
  `Observaciones`) se devuelve con su código y su texto, sin traducirlo mal.
- `qr.ts`: el QR de la RG 4892 (JSON con versión, fecha, CUIT, punto de
  venta, tipo, número, importe, moneda, cotización, tipo y número de
  documento del receptor, tipo de código `E` y CAE, en base64 dentro de
  `https://www.arca.gob.ar/fe/qr/?p=`).
- Las direcciones de homologación y producción, según `ARCA_AMBIENTE`.
- Tiempo máximo de 15 s por llamada: ARCA tarda en horas pico.

### 4. Datos del comprobante (Factura C = 11, Nota de Crédito C = 13)

- **Concepto:** 1 (productos). Una comida es un producto.
- **Receptor:** consumidor final (`CondicionIVAReceptorId` 5) sin
  identificar (documento 99, número 0) mientras el total sea menor a
  $10.000.000; desde ese monto, el cobro pide DNI o CUIT. Ver "Datos
  verificados".
- **Importes:** `ImpTotal` = `ImpNeto` = total del pedido (con el envío);
  sin IVA, que la C no discrimina.
- **Fecha:** la del cobro, en hora de Argentina (lección 44).
- **Nota de crédito:** los mismos importes, con la factura asociada
  (`CbtesAsoc`: tipo, punto de venta, número, CUIT).

### 5. Una factura por pedido, y nunca dos

Tabla `facturas`:

| columna | |
|---|---|
| `id`, `order_id` | el pedido |
| `tipo` | 11 o 13 |
| `punto_venta`, `numero` | `null` hasta que ARCA la autoriza |
| `cae`, `cae_vence` | |
| `total`, `doc_tipo`, `doc_nro` | lo que se mandó |
| `estado` | `pendiente`, `emitida`, `rechazada` |
| `motivo` | el texto de ARCA si se rechazó o falló |
| `asociada_a` | la factura que compensa una nota de crédito |
| `intentos`, `pedido_arca`, `respuesta_arca` | para entender un problema |

- **Índice único parcial:** una sola factura (tipo 11) no rechazada por
  pedido, y una sola nota de crédito por factura. Dos clics en "Facturar" o
  un reintento concurrente chocan en la base, no en ARCA.
- **Numeración:** se pide `FECompUltimoAutorizado` y se solicita el siguiente.
  Si ARCA contesta que el número no es el que sigue (otra emisión en el
  medio), se reintenta con el nuevo último, hasta 3 veces.
- **Timeout sin respuesta:** antes de reintentar, `FECompConsultar` del número
  que se había pedido. Si ARCA lo tiene con este importe, era nuestra: se
  guarda ese CAE y no se pide otra. Así un corte de red no duplica.

### 6. Cuándo se emite: por medio de pago, como Fudo

- `datos_fiscales.medios_automaticos`: los medios de pago (`cash`, `card`,
  `transfer`, `mercadopago`) con los que se factura solo. Por defecto, todos.
- **Al cobrar** (`completeMostadorPayment`, `payTableOrder`), después de que
  la transacción del cobro terminó bien: si alguno de los medios usados
  (`payment_method` o cualquiera de los `payment_splits`) está en la lista,
  se llama a `emitirFactura`. La factura es por el pedido entero. El cobro ya
  está hecho: si la factura falla, la respuesta al cajero es "Cobrado. La
  factura quedó pendiente: <motivo>", no un error.
- **Lo que no se facturó solo:** "Facturar" en la fila del pedido cobrado, en
  el Historial.
- **Pendiente o rechazada:** "Reintentar" en la misma fila. Rechazada por un
  dato (una CUIT mal cargada) no se reintenta sola: se corrige y se reintenta.
- **Anular un pedido con factura emitida:** `cancelPosOrder` anula y después
  emite la nota de crédito, con la misma regla: si ARCA falla, el pedido
  queda anulado y la nota pendiente, a la vista.

### 7. La sección Facturación en Ajustes

Una sección más del panel (memoria *menos-tarjetas-en-formularios*), después
de "Cobros":

- Interruptor "Emitir facturas", **apagado por defecto**. Apagado, nada de
  esto se ve en la caja y el sistema no habla con ARCA: un local que no
  factura, o que factura con otra cosa, usa la caja como hoy.
- Razón social, CUIT, condición (en esta versión solo "Monotributo", fijo y
  explicado), punto de venta, domicilio comercial, ingresos brutos, inicio de
  actividades: lo que el comprobante tiene que decir.
- "Facturar automáticamente al cobrar con": una casilla por medio de pago,
  todas tildadas por defecto.
- "Probar conexión": `FEDummy` + `FECompUltimoAutorizado` con la CUIT y el
  punto de venta cargados. Contesta en castellano: "Conectado: la última
  factura C del punto 3 es la 0003-00000041", o "ARCA no reconoce la
  delegación: falta el paso 2 de la guía".
- Con `settings.manage`. Cajero y cocina no la ven.
- **Al encenderla en producción, un aviso que hay que confirmar:** "Cada
  factura queda registrada en ARCA a nombre de este CUIT y cuenta para la
  categoría del monotributo. Revisalo con tu contador antes de facturar cada
  venta." En homologación no aparece: esas facturas son de prueba y no
  cuentan (pregunta de David, 2026-09-30).

### 8. El papel

- `printClientTicketAction` agrega `factura` al `data` del ticket cuando el
  pedido tiene una emitida: tipo y letra, número con punto de venta, CAE,
  vencimiento, datos del emisor y la cadena del QR. El puente viejo la ignora
  (despacha por `type`, que no cambia).
- `../print-bridge`: imprimir ese bloque y el QR en ESC/POS (`GS ( k`, modelo
  2). Se deja escrito en `docs/INTEGRACION.md` del puente.
- `/admin/facturas/[id]/print`: la factura en 80 mm desde el navegador, con
  el QR como imagen. Sirve para probar sin el puente, y para reimprimir.

### 9. Probar sin datos reales

- **ARCA simulado:** un servidor HTTP chico en los tests e2e que contesta
  como WSAA y WSFEv1 (respuestas copiadas de la documentación de ARCA),
  incluido el rechazo, el número no correlativo y el timeout.
  `ARCA_URL_WSAA`/`ARCA_URL_WSFE` lo apuntan en los tests.
- **Homologación real:** cuando David tenga el certificado de prueba, los
  mismos casos contra ARCA de verdad.

## Risks / Trade-offs

- **Normas que cambian.** El tope de consumidor final, los campos
  obligatorios y la URL del QR cambian por resolución. Cada uno queda en un
  solo lugar, con la fuente y la fecha en que se verificó.
- **La clave privada de David en cada instalación.** Con pocos locales, es la
  consecuencia de instalar por local. Va solo como variable del servidor, y
  el día que haya multi-tenant pasa a un solo lugar.
- **Una factura pendiente que nadie reintenta** es una venta sin facturar.
  Por eso se ve en el Historial, en color de aviso, y en el cierre de caja.
- **Primera versión solo monotributo.** Si el primer cliente es responsable
  inscripto, la B es el paso siguiente y reutiliza todo menos el armado de
  importes.
