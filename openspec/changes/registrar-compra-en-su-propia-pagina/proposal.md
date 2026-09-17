# Proposal

## Why

Registrar una compra es cargar varias líneas —ingrediente, cantidad, costo— y hoy
eso pasa dentro de un diálogo de 241 líneas montado encima de la tabla de stock.
El diálogo mide `max-w-lg` con `max-h-[85vh]` y scroll propio: a partir de la
tercera o cuarta línea, lo que se está cargando deja de verse entero, y el
contenido de atrás compite por la atención. Quien carga una compra de proveedor
—ocho, diez ingredientes— no puede revisar lo que escribió antes de confirmar.

El proyecto ya resolvió esto para categorías, ingredientes y recetas: los
formularios largos viven en su propia página (commit `1c07da1`, "los formularios
viven en páginas, no en diálogos"). La compra quedó afuera de esa tanda y es el
formulario más largo de los cinco.

## What Changes

- **Nueva ruta `/admin/stock/compras/nueva`** con el formulario de compra a ancho
  completo, siguiendo el patrón de `/admin/ingredients/new`.
- **El botón "Registrar Compra" de `/admin/stock` navega** en vez de abrir un
  diálogo. Son dos botones —el de escritorio y el de móvil— y los dos cambian.
- **Se elimina `components/admin/stock/purchase-dialog.tsx`**, igual que se
  eliminaron los tres diálogos de formulario en `1c07da1`.
- **Al guardar, vuelve a `/admin/stock`** con la tabla ya actualizada; al
  cancelar, vuelve sin registrar nada.
- **Sin ingredientes cargados, la página lo dice** en vez de mostrar un selector
  vacío. Hoy el diálogo se abre igual con un `<Select>` sin opciones.

No cambia qué hace una compra: `registerPurchase()` queda igual. Cambia dónde se
carga y cuánto se ve mientras se carga.

## Capabilities

### New Capabilities

- `registro-de-compras`: cómo se registra el ingreso de mercadería —dónde
  vive el formulario, qué valida antes de aceptar, y qué le pasa al stock, al
  costo y al historial de movimientos cuando se confirma.

La capability se crea completa y no solo con el pedazo que cambia: `specs/` está
vacío porque OpenSpec se adoptó recién, y el comportamiento de `registerPurchase()`
—que ya existe y no se toca— no está escrito en ningún lado. La spec documenta lo
que el sistema hace hoy más la ubicación nueva, que es lo único que este cambio
altera. Se marca explícitamente cuál requisito es nuevo.

### Modified Capabilities

Ninguna: `openspec/specs/` está vacío.

## Impact

**Repos:** solo `que-copado`. No toca `AgentePOS` ni el contrato del agente.

**Código:**

- Nuevo: `app/admin/stock/compras/nueva/page.tsx`, `components/admin/stock/purchase-form-page.tsx`
- Modificado: `components/admin/stock/stock-dashboard.tsx` (los dos botones y el estado `purchaseOpen`)
- Eliminado: `components/admin/stock/purchase-dialog.tsx`

**Sin cambios:** `registerPurchase()` en `app/actions/stock.ts`, el esquema de la
base y las políticas de RLS. La página nueva llama a la misma acción.

**Permisos:** la ruta queda bajo `/admin/*`, que el middleware ya protege.

## Fuera de alcance

- **El rendimiento de `registerPurchase()`.** Recorre los ítems en serie y por
  cada uno hace un `select` del ingrediente, un `update` y un `insert` del
  movimiento: una compra de ocho líneas son ~24 viajes encadenados a ~160ms cada
  uno. Es real y está medido en otros caminos del proyecto, pero es otro problema
  —una transacción del lado de la base— y mezclarlo con esto haría que un cambio
  de interfaz toque el registro de stock.
- **Editar o anular una compra ya registrada.** Hoy no existe y este cambio no lo
  agrega.
- **El resto de la sección de stock**: ajustes, mermas, consumo y las pestañas de
  la tabla quedan como están.
