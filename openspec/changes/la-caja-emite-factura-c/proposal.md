# Proposal

## Why

El sistema no factura. Es lo que más le falta frente a Fudo para venderse a
otros locales, y un local que quiera usarlo como caja única necesita emitir
el comprobante sin tener otro sistema al lado.

David no tiene todavía los datos fiscales de Que Copado (si es monotributista
o responsable inscripto, su punto de venta). No hace falta: igual que en Fudo,
esos datos los carga el dueño del local. El sistema se construye y se prueba
entero contra el ambiente de prueba de ARCA (homologación).

## Cómo lo hace Fudo (el modelo que se copia)

- El dueño hace dos trámites en ARCA con su clave fiscal: **da de alta un
  punto de venta electrónico** exclusivo para el sistema, y **delega el
  webservice de factura electrónica** a la CUIT de Fudo en el Administrador de
  Relaciones.
- Después carga en Fudo, en la sección "Facturación Electrónica", su razón
  social, CUIT, condición ante el IVA y punto de venta.
- El dueño nunca maneja certificados: el certificado es de Fudo, uno para
  todos sus clientes.

Fuentes: [alta del punto de venta](https://soporte.fu.do/es/articles/11731376-1-argentina-dar-de-alta-el-punto-de-venta-electronico),
[delegación del webservice](https://soporte.fu.do/es/articles/11731375-2-argentina-delegacion-del-webservice),
[alta del módulo](https://soporte.fu.do/es/articles/11731382-argentina-alta-del-modulo-de-facturacion-electronica).

## What Changes

- **Factura C y Nota de Crédito C** (monotributo). La A y la B (responsable
  inscripto) quedan para otro cambio: llevan IVA discriminado, alícuotas y
  datos del receptor.
- **Conexión directa con ARCA**, sin intermediario pago: autenticación con el
  certificado de David (WSAA) y autorización de cada comprobante (WSFEv1). El
  local delega en la CUIT de David, como en Fudo delega en la de Fudo.
- **Ajustes → Facturación**: una sección más del mismo panel, al lado de
  "Cobros", con los datos fiscales del local, los medios de pago que se
  facturan solos y un botón
  "Probar conexión" que dice si ARCA acepta la delegación.
- **La factura se emite después de cobrar, nunca en el medio.** El cobro no
  espera a ARCA: si ARCA no contesta, el pedido queda cobrado y la factura
  queda pendiente, con "Reintentar" a la vista.
- **Anular un pedido facturado emite su nota de crédito.** Hoy un pedido
  cobrado se puede anular; con factura, la anulación la compensa en ARCA.
- **El comprobante sale en el ticket.** El ticket del cliente lleva, cuando
  hay factura, el bloque fiscal (tipo, número, CAE, vencimiento) y el código
  QR de ARCA. Un puente de impresión viejo lo ignora y sigue imprimiendo el
  ticket de siempre.
- **Historial**: el número de factura como texto en la fila del pedido; una
  pendiente o rechazada, en color de aviso, con su motivo y "Reintentar".

## Lo que se decidió con David (2026-09-30)

1. **Cuándo se factura: por medio de pago, como Fudo.** En Ajustes se tilda
   con qué medios se factura solo al cobrar (vienen todos tildados). Lo que no
   se factura solo, se factura con "Facturar" en el Historial. Todos tildados
   es facturar cada venta; ninguno, facturar a pedido. Qué tildar es una
   decisión fiscal de cada local con su contador. ([Fudo: emisión automática
   por medio de pago](https://soporte.fu.do/es/articles/14302752-como-registrar-y-gestionar-medios-de-pago-y-cobro))
2. **Un solo papel:** cuando hay factura, el ticket del cliente *es* la
   factura.
3. **Solo monotributo (Factura C)** en esta primera versión.

## Lo que necesita David para la parte real (no para construirla)

- **Para homologación:** su CUIT y clave fiscal nivel 3, para sacar un
  certificado de prueba en el servicio WSASS de ARCA. Sin eso se construye
  todo contra un ARCA simulado; con eso, se prueba contra el de verdad.
- **Para producción:** un certificado de producción a su CUIT y su actividad
  registrada como proveedor de software (consultar con un contador; es lo
  mismo que necesita para cobrar el servicio).
- **Por cada local:** los dos trámites del dueño en ARCA (punto de venta y
  delegación), con una guía paso a paso que entrega este cambio.

## Capabilities

### New Capabilities

- `facturacion-electronica`: el local emite factura C y nota de crédito C por
  ARCA desde la caja.

Lo que toca la caja (la anulación y el Historial) queda dentro de esta
capacidad nueva: la spec de `caja` no cambia para un local sin facturación.

## Fuera de alcance

- Factura A y B, y el Régimen de Transparencia Fiscal para ellas.
- Más de un punto de venta por local (Fudo tampoco lo permite).
- Facturar por comensal o una parte del pedido: una factura por pedido.
- Mandar la factura al cliente por WhatsApp o mail.
- Contingencia con CAEA (numeración anticipada para cuando ARCA está caído):
  en su lugar, la factura queda pendiente y se reintenta.
- Libro de IVA, reportes para el contador.
- Bloquear el cierre de caja por facturas pendientes: se muestran en el
  cierre, no lo impiden.

## Toca otros repos

- **`../print-bridge` (C#):** imprimir el bloque fiscal y el QR cuando el
  ticket trae `factura`. Se especifica acá (este repo lidera) y se implementa
  allá; hasta entonces, la factura se ve e imprime desde el navegador.
- **AgentePOS:** no. Un pedido del agente se cobra en la caja como cualquier
  otro y se factura igual.

## Impact

- Base: tablas `datos_fiscales` (una fila), `facturas` y
  `arca_ticket_de_acceso` (solo el servidor).
- `lib/arca/`: autenticación, autorización, consulta, armado del QR.
- `app/actions/facturas.ts`: emitir, reintentar, nota de crédito, probar
  conexión.
- `app/actions/pos-orders.ts`, `tables.ts`: después de cobrar y al anular.
- `app/admin/settings/business-settings-form.tsx`: la sección Facturación.
- `components/admin/caja/pos-historial-tab.tsx`: la factura en la fila.
- `app/actions/print.ts`: el ticket lleva `factura`.
- Nueva página `/admin/facturas/[id]/print`.
- Variables nuevas del servidor: `ARCA_CERT`, `ARCA_KEY`, `ARCA_CUIT` (la de
  David), `ARCA_AMBIENTE` (`homologacion` | `produccion`).
- Dependencias: `node-forge` (firmar con el certificado) y `fast-xml-parser`
  (leer las respuestas de ARCA).
- Documento para el dueño: `docs/FACTURACION_ALTA_EN_ARCA.md`.
