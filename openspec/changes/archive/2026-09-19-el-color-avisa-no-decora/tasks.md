# Tasks

## 1. La convención, antes que el código

- [x] 1.1 Dejar escrita la regla en un solo lugar del código —un comentario en
      `components/ui/badge.tsx`— para que se lea desde donde se usa: *el badge
      es para estado; un atributo va como texto*. Se verifica leyendo el
      archivo.

## 2. Los atributos dejan de ser píldoras

- [x] 2.1 **Unidad de medida** (4 lugares): `ingredients-dashboard.tsx`,
      `stock/ingredients-stock-tab.tsx`, `products/recipe-builder.tsx`,
      `ingredients/ingredient-sub-recipe-dialog.tsx`. Pasa a texto gris pegado
      a la cantidad. Se verifica con una captura de la tabla de insumos a
      1366px, contando que no queden círculos en la columna.
- [x] 2.2 **Categoría** (2 lugares): `ingredients-dashboard.tsx`,
      `products/products-dashboard.tsx`. Pasa a texto. Se verifica igual.
- [x] 2.3 **Totales** (2 lugares): `products/recipe-builder.tsx`,
      `products/recipe-selector.tsx`. `Costo: $X` deja de ser píldora.
- [x] 2.4 **Marcas sueltas**: la `x` del multiplicador en `recipe-selector`, y
      `compuesto` y `×{n}` en `stock/ficha-tecnica-dialog.tsx`.
- [x] 2.5 **El tipo de producto** (`Reventa` / `Elaborado`) en
      `products-dashboard.tsx`. No estaba en el inventario porque no era un
      `<Badge>` sino una píldora escrita a mano con `rounded-full`. Lo encontró
      el test de 3.2, que mide lo que se ve y no qué componente se usó.

## 3. Que siga entrando en pantalla

- [x] 3.1 Las columnas que hoy se esconden en pantalla chica
      (`hidden md:table-cell`) siguen escondiéndose. Se verifica con el test de
      anchos, extendido a la tabla de insumos: de 1600 a 320, cero desborde.
- [x] 3.2 Un test de navegador que cuente los elementos resaltados de la tabla
      de insumos y falle si aparece uno que no sea de estado. Es la única forma
      de que la convención no se erosione sola, como pasó con los esqueletos.

## 4. Verificación

- [x] 4.1 Captura antes y después de la tabla de insumos y de la de productos,
      a 1366×768, para mirarlas al lado.
- [x] 4.2 `npm run lint`, `npm run build` y la suite de Playwright en verde.
- [x] 4.3 Mostrárselo a David antes de dar por cerrado: el criterio de si se lee
      mejor es suyo. Vistas las capturas de insumos y stock, antes y después:
      *"bien"*. Con eso se archiva.


## 5. El barrido completo (lo pidió David: *"¿falta alguna tabla más?"*)

- [x] 5.1 Censo de las 14 pantallas del panel, midiendo el estilo calculado.
      Apareció una más: el conteo `1 producto` de `categories/category-list.tsx`,
      en píldora amarilla. Es un atributo, pasó a texto.
- [x] 5.2 El test cubre ahora seis pantallas: insumos, stock, productos,
      categorías, recetas y equipo. Falla contra el código viejo en categorías.
- [x] 5.3 **Seis pantallas no se pueden medir en local porque no tienen datos**
      —pedidos, arqueos, analytics, mesas, zonas de envío, cocina—. Revisadas
      leyendo el código: los resaltados que tienen son de estado (verde/amarillo/
      rojo del arqueo, ingreso/egreso de caja), contadores de pestaña, o cosas
      que no son datos (spinners, puntos separadores). Si algún día hay datos de
      prueba, entran al test.

## 6. Queda a criterio de David (no bloquea el archivado)

Ninguna de las dos está en la spec: son decisiones sueltas que quedan
anotadas para cuando él quiera. El cambio se archiva sin ellas.

- [ ] 6.1 **El color del rol en Equipo.** El `<select>` del rol tiene fondo de
      color elegido por un hash de la clave (`estiloDeRol`). El color no
      significa nada: es decoración, y es justo lo que produce la sensación que
      describió. Pero es un **control**, no una celda de datos, y el comentario
      dice que se hizo así para que un rol nuevo se vea consistente sin tocar
      código. No lo toqué.
- [ ] 6.2 **Los contadores de pestaña** (`Todos 6`, `Carnes 1`) siguen en
      píldora. Están fuera de la tabla y un número junto a una etiqueta es un
      patrón establecido, pero conviene decirlo explícito en la spec.

## 7. Lo que se aprendió haciéndolo

- [x] 7.1 El inventario por `<Badge>` era incompleto: el tipo de producto era
      una píldora a mano. El test que mide el estilo calculado encontró lo que
      la búsqueda por componente no.
- [x] 7.2 El test de 3.2 nació vacío: buscaba la cadena `"9999"` en
      `border-radius`, pero `rounded-full` en Tailwind 4 es
      `calc(infinity * 1px)` y el navegador lo calcula como `3.3e7px`. Pasaba
      contra cualquier código. Se corrigió a `parseFloat(...) >= 9999` y recién
      ahí falló contra el código viejo, que es lo que lo hace valer.

## 8. Pedidos, con datos de verdad (lo pidió David: *"¿la tabla pedido la revisaste?"*)

- [x] 8.1 La había revisado solo por código, por no tener datos en local. Se
      sembraron cuatro pedidos —uno por estado y uno por medio de pago— y se
      midió: los únicos resaltados son `Recibido`, `Entregado`, `Cancelado` y
      `Pagado`. La tabla ya estaba bien; el `OrderStatusBadge` es estado.
- [x] 8.2 **Los emojis del medio de pago.** Al abrir un pedido, el detalle
      imprimía `💵 Efectivo` —encima de un ícono genérico que ya estaba al lado—.
      Ahora el ícono es el del medio (billete, banco, QR) y el emoji no está.
      Dos de los cuatro emojis eran la misma tarjeta, así que ni distinguían.
- [x] 8.3 Los emojis del mensaje de WhatsApp **se quedan**: ese texto lo lee el
      cliente en su teléfono y ahí son parte del idioma. Solo se sacaron los del
      panel.
- [x] 8.4 Test con los cuatro pedidos sembrados, que se los lleva al terminar.
      Falla contra el código viejo: `¿emoji en el detalle? true`.

## 9. La caja cuadrada (lo vio David: *"en recetas el dato de ingredientes se cierra con un cuadrado"*)

- [x] 9.1 El contador de ingredientes de la tabla de recetas iba en una caja con
      borde y fondo, **sin redondeo**. Pasa a texto.
- [x] 9.2 **El test no la veía**: buscaba solo píldoras, o sea `border-radius`
      enorme. Lo que molesta es que el dato esté *encerrado*, no la forma del
      encierro. La regla ahora es fondo propio **y** (borde o redondeo), con los
      controles excluidos. Falla contra el código viejo en recetas.
- [x] 9.3 Barrido de las siete pantallas con datos usando la regla ancha: el
      único resaltado que queda en todo el panel es el `OK` de Stock, que es
      estado.
