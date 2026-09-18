# Tasks

> Todo en `que-copado`. Se verifica contra la base local, que tiene una mesa
> cargada como "Vereda 1" justamente para esto.

## 1. El nombre, en un solo lugar

- [ ] 1.1 Escribir `etiquetaDeMesa({ number, label })`: devuelve el nombre si lo
      hay, `Mesa N` si no. Verificación: con label devuelve "Vereda 1", sin label
      devuelve "Mesa 4", y con label en blanco también "Mesa 4".

## 2. Las pantallas de caja

- [ ] 2.1 Usarlo en la tarjeta de la mesa, el panel del pedido y las tres
      apariciones de la pantalla de cobro. Verificación: en local, la mesa 4 se
      lee "Vereda 1" en las cinco, y las mesas 1 a 3 siguen diciendo "Mesa N".

## 3. Cocina y ticket

- [ ] 3.1 Que `print.ts` consiga el nombre de la mesa para la comanda y el
      ticket. Verificación: enviar a cocina un pedido de la mesa 4 y ver
      "Vereda 1" en la comanda.
- [ ] 3.2 Usarlo también en el ticket en pantalla y en la comanda de la pantalla
      de cocina. Verificación: las dos vistas dicen lo mismo que el papel.

## 4. Cerrar

- [ ] 4.1 `grep -rn "Mesa {" components app` no devuelve ninguno de los nueve
      lugares originales.
- [ ] 4.2 `npm run lint` y `npm run build` sin errores nuevos.
