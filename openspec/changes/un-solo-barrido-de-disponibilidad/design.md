# Design

## Context

Ver `proposal.md` — Why. Lo que importa del estado actual son las diferencias
entre las dos copias, porque unificar obliga a elegir una de cada par:

| | copia A (`stock-deduction.ts`) | copia B (`stock.ts`) |
|---|---|---|
| cálculo teórico | `_calcTheoreticalStock` | `_calculateTheoreticalStock` |
| revalidación | diferida con `setTimeout` | `revalidateProducts()` directo |
| orden de combos | después de los elaborados | antes |
| tipo de cliente | `SupabaseClient` | `SupabaseAdminClient` |

## Goals / Non-Goals

**Goals**

- Una sola definición de "qué queda agotado" y una sola del stock teórico.
- Que los cinco caminos se comporten igual.

**Non-Goals**

- Cambiar la regla de disponibilidad.
- Unificar todo lo demás que se parece entre los dos archivos.

## Decisions

### La versión compartida vive en `lib/server/`

`app/actions/stock.ts` es un archivo de server actions —cosas que llama la
interfaz—; `lib/server/` es donde ya viven las piezas de lógica que se comparten,
incluido el descuento de stock. El barrido es lógica, no una acción.

### Se conserva la revalidación diferida

La copia A difiere la revalidación con `setTimeout` con un comentario que explica
el motivo: llamar a `revalidatePath` durante un render tira error en Next. La
copia B la llama derecho porque sus llamadores no corren durante un render, pero
al unificar hay un solo camino y tiene que ser el que funciona en los dos
contextos.

**Consecuencia:** en los caminos de compra y ajuste la revalidación pasa a
ocurrir un instante después en vez de en línea. No cambia lo que ve el usuario:
esas pantallas ya actualizan su estado por su cuenta.

### Los combos se evalúan después de los elaborados

Es el orden de la copia A y es el correcto: si una hamburguesa se acaba de marcar
agotada en esta misma pasada, el combo que la incluye tiene que verlo ahora y no
en el próximo movimiento de stock. Al unificar, el camino de compras hereda ese
orden.

### El tipo del cliente se toma del más general

Las dos reciben un cliente de Supabase con distinto tipo declarado. La función
compartida usa el tipo general, que es lo que ya hace el resto de `lib/server/`,
y desaparece el `as unknown as` que quedó del arreglo anterior.

## Risks / Trade-offs

**Un refactor sin tests automáticos** → La red es la base local: se recorren los
cinco caminos y se compara el estado de un elaborado y un combo antes y después.
Es lo que se puede verificar de verdad en este proyecto, y ahora existe el
entorno para hacerlo.

**Las dos copias podrían haber divergido en algo que no vi** → Se leyeron
completas y las diferencias están en la tabla de arriba. Si al unificar aparece
una más, se anota y se decide, no se absorbe en silencio.

## Migration Plan

No hay nada que migrar: es código. Se revierte con el commit.
