# Tasks

> Todo en `que-copado`. Se verifica contra la base local, que tiene una mesa
> cargada como "Vereda 1" justamente para esto.

## 1. El nombre, en un solo lugar

- [x] 1.1 Escribir `etiquetaDeMesa({ number, label })`: devuelve el nombre si lo
      hay, `Mesa N` si no. Verificación: con label devuelve "Vereda 1", sin label
      devuelve "Mesa 4", y con label en blanco también "Mesa 4".

## 2. Las pantallas de caja

- [x] 2.1 Usarlo en la tarjeta de la mesa, el panel del pedido y las tres
      apariciones de la pantalla de cobro. Verificación: en local, la mesa 4 se
      lee "Vereda 1" en las cinco, y las mesas 1 a 3 siguen diciendo "Mesa N".

## 3. Cocina y ticket

- [x] 3.1 Que `print.ts` consiga el nombre de la mesa para la comanda y el
      ticket. Verificación: enviar a cocina un pedido de la mesa 4 y ver
      "Vereda 1" en la comanda.
- [x] 3.2 Usarlo también en el ticket en pantalla y en la comanda de la pantalla
      de cocina. Verificación: las dos vistas dicen lo mismo que el papel.

## 4. Cerrar

- [x] 4.1 `grep -rn "Mesa {" components app` no devuelve ninguno de los nueve
      lugares originales.
- [x] 4.2 `npm run lint` y `npm run build` sin errores nuevos.

## Lo que salió distinto

**No eran nueve lugares, eran catorce.** La propuesta contó las pantallas donde
el nombre se lee grande; el grep encontró además los avisos ("Mesa 4 abierta",
"Mesa 4 cobrada"), el título de la hoja del celular, el cartel de cancelar
pedido y —el que más importaba— la comanda de la pantalla de cocina, que la
propuesta no había mirado. Esa última es la razón de ser del cambio: cocina
prepara para una mesa que el salón llama de otra forma.

Para que el nombre llegue a cocina, `getActiveComandas` ahora trae las etiquetas
de todas las mesas del lote en una sola consulta y las adjunta como
`table_label`; no es un viaje por comanda.

**Dos lugares se quedan con el número, a propósito:**

- `pos-historial-tab.tsx` — el historial muestra pedidos ya cerrados y el pedido
  no guarda el nombre que tenía la mesa ese día. Mostrar el nombre de hoy sobre
  una venta de la semana pasada no sería más cierto, sería otra cosa. Queda
  `Mesa N`, con el comentario que lo explica.
- `app/admin/tables/tables-dashboard.tsx` — es la pantalla donde se le pone el
  nombre a la mesa. Ahí el número es la identidad que se está editando, y la
  fila ya muestra los dos: "Mesa 4 (Vereda 1)".

`print.ts` busca el nombre en `restaurant_tables` al imprimir, no lo congela en
el pedido: si mañana la mesa pasa a llamarse "Vereda 2", el ticket que se
reimprime dice lo que el salón dice hoy.

## Verificado

Contra la base local, con la mesa 4 cargada como "Vereda 1" (Playwright):

- la grilla de mesas la nombra "Vereda 1"
- el aviso al abrirla dice "Vereda 1 abierta"
- el panel del pedido la nombra igual
- el cartel de cancelar dice "Cancelar pedido de Vereda 1"
- la comanda en la pantalla de cocina dice "Vereda 1"
- la hoja del celular se titula "Vereda 1"

`npm run lint`: 0 errores (queda el warning viejo de `SupabaseClient` en
`app/actions/orders.ts`, anterior a este cambio). `npm run build`: compila.
