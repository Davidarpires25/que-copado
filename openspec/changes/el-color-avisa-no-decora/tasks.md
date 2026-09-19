# Tasks

## 1. La convención, antes que el código

- [ ] 1.1 Dejar escrita la regla en un solo lugar del código —un comentario en
      `components/ui/badge.tsx`— para que se lea desde donde se usa: *el badge
      es para estado; un atributo va como texto*. Se verifica leyendo el
      archivo.

## 2. Los atributos dejan de ser píldoras

- [ ] 2.1 **Unidad de medida** (4 lugares): `ingredients-dashboard.tsx`,
      `stock/ingredients-stock-tab.tsx`, `products/recipe-builder.tsx`,
      `ingredients/ingredient-sub-recipe-dialog.tsx`. Pasa a texto gris pegado
      a la cantidad. Se verifica con una captura de la tabla de insumos a
      1366px, contando que no queden círculos en la columna.
- [ ] 2.2 **Categoría** (2 lugares): `ingredients-dashboard.tsx`,
      `products/products-dashboard.tsx`. Pasa a texto. Se verifica igual.
- [ ] 2.3 **Totales** (2 lugares): `products/recipe-builder.tsx`,
      `products/recipe-selector.tsx`. `Costo: $X` deja de ser píldora.
- [ ] 2.4 **Marcas sueltas**: la `x` del multiplicador en `recipe-selector`, y
      `compuesto` y `×{n}` en `stock/ficha-tecnica-dialog.tsx`.

## 3. Que siga entrando en pantalla

- [ ] 3.1 Las columnas que hoy se esconden en pantalla chica
      (`hidden md:table-cell`) siguen escondiéndose. Se verifica con el test de
      anchos, extendido a la tabla de insumos: de 1600 a 320, cero desborde.
- [ ] 3.2 Un test de navegador que cuente los elementos resaltados de la tabla
      de insumos y falle si aparece uno que no sea de estado. Es la única forma
      de que la convención no se erosione sola, como pasó con los esqueletos.

## 4. Verificación

- [ ] 4.1 Captura antes y después de la tabla de insumos y de la de productos,
      a 1366×768, para mirarlas al lado.
- [ ] 4.2 `npm run lint`, `npm run build` y la suite de Playwright en verde.
- [ ] 4.3 Mostrárselo a David antes de dar por cerrado: el criterio de si se lee
      mejor es suyo.
