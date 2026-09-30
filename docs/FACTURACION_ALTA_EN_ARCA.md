# Facturación electrónica: lo que tiene que hacer el local en ARCA

Para que el sistema emita tus facturas hacen falta **dos trámites en la web de
ARCA**, una sola vez. Los hace el titular del negocio (o su contador) con la
CUIT del local y su **clave fiscal nivel 3**. Llevan unos diez minutos.

No tenés que generar certificados ni instalar nada: autorizás al sistema a
facturar en tu nombre, como se hace con Fudo y otros sistemas.

> Antes de empezar, confirmá con tu contador que el local es **monotributista**
> y que puede facturar electrónicamente. Esta versión del sistema emite
> **Factura C** (la del monotributo).

---

## Paso 1. Crear un punto de venta para el sistema

1. Entrá a [arca.gob.ar](https://www.arca.gob.ar) con la CUIT del local y su
   clave fiscal.
2. Abrí el servicio **"Administración de puntos de venta y domicilios"**.
   Si no lo ves en tu lista, agregalo desde "Administrador de Relaciones de
   Clave Fiscal" → "Adherir servicio".
3. Elegí la empresa (tu CUIT) y entrá a **"A/B/M de Puntos de Venta"** →
   **"Agregar"** (en algunas pantallas dice "Alta").
4. Completá:
   - **Número:** el siguiente al último que tengas (si nunca creaste uno,
     el 1; si ya usás el 1 para facturar a mano, el 2).
   - **Nombre de fantasía:** el nombre del sistema, para reconocerlo.
   - **Sistema:** **"Factura electrónica – Monotributo – Web Services"**.
   - **Domicilio:** el del local.
5. Confirmá. **Anotá el número de punto de venta**: lo vas a cargar en el
   sistema.

**Importante:** este punto de venta tiene que ser **nuevo y exclusivo del
sistema**. No uses el que ya usás para facturar a mano o con otro sistema: la
numeración de las facturas se mezclaría.

## Paso 2. Autorizar al sistema a facturar en tu nombre (delegación)

1. En ARCA, abrí **"Administrador de Relaciones de Clave Fiscal"**.
2. Tocá **"Nueva Relación"**.
3. En "Servicio", tocá **"Buscar"** y elegí **ARCA → WebServices →
   Facturación Electrónica**.
4. En el campo del representante (**"CUIT/CUIL/CDI Usuario"**), escribí la
   CUIT que te pasamos, **sin guiones**, y tocá **"Buscar"**.
5. Tocá **"Confirmar"**.

Con esto el sistema puede emitir facturas **a nombre de tu CUIT** y solo
desde el punto de venta que creaste. Podés quitar la autorización cuando
quieras desde el mismo lugar.

## Paso 3. Cargar los datos en el sistema

En el panel: **Ajustes → Facturación**.

- Razón social, CUIT, domicilio comercial, ingresos brutos e inicio de
  actividades: como figuran en tu constancia de inscripción de ARCA.
- Punto de venta: el número del paso 1.
- Con qué medios de pago se factura solo al cobrar.

Tocá **"Probar conexión"**. Si dice "Conectado", ya está. Si dice que ARCA
no reconoce la delegación, revisá el paso 2; si no encuentra el punto de
venta, revisá el número y que el sistema elegido en el paso 1 sea el de *Web
Services*.

Recién ahí encendé **"Emitir facturas"**. Desde ese momento, cada factura
queda registrada en ARCA a nombre de tu CUIT y cuenta para tu categoría del
monotributo.

---

*Los nombres de los menús de ARCA cambian cada tanto. Si algo no coincide,
buscá el servicio por su nombre dentro de la web de ARCA o consultanos.
Última revisión de esta guía: 30/09/2026.*
