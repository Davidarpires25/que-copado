# Tasks

## 1. Los datos (los sabe David)

- [x] 1.1 Corregir el mínimo de `Queso muzzarela` (hoy 1000 kg, stock 5,40) y
      de `Queso Tybo` (hoy 1000 u, stock 141). **David los fijó el 2026-09-20**:
      muzzarela en **3 kg** y Tybo en **50 u**. Aplicado en producción y
      verificado: los dos quedan en `ok` y dejan de avisar. De 14 alertas
      quedan **12, todas legítimas** —stock en cero o debajo de un mínimo
      sensato—.
- [ ] 1.2 Resolver `Pan de papa` y `Pan de paty sin semilla`. **Revisado contra
      producción el 2026-09-20: `Pan de paty sin semilla` ya está en una receta**
      —se resolvió solo cuando David cargó recetas— así que queda la mitad:
      `Pan de papa` sigue en cero recetas, con seguimiento activo y una compra
      de 6 unidades. Ligarlo a la receta que corresponda, o apagarle el
      seguimiento.

## 2. Que no vuelva a pasar

- [x] 2.1 Al cargar un mínimo muy por encima de lo que se compra habitualmente
      de ese insumo, avisarlo en el momento. `getCompraHabitual` devuelve la
      **mediana** de las últimas diez compras —no el promedio: una compra
      grande aislada no tiene que volver aceptable un mínimo que no lo es— y el
      diálogo avisa cuando el mínimo la supera diez veces.

      **La referencia tiene que ser la compra, no el stock.** Tybo tenía 138 en
      stock contra un mínimo de 1000: siete veces, que no llama la atención.
      Pero se compra de a 73, y ahí el mínimo es catorce veces lo que entra de
      una vez.
- [x] 2.2 Verificación: cargar 1000 kg de mínimo a un insumo que se compra de a
      6 kg tiene que decir algo antes de guardar. **Test de navegador** con un
      insumo sembrado con tres compras de ~6 kg: con 12 no dice nada, con 1000
      avisa. Falla contra el código viejo.

## 3. Y el candado que aparecio mirandolo

- [x] 3.1 **El mínimo no se podía cambiar sin mover el stock.** David: *"intenté
      cambiar el mínimo desde la tabla pero no me dejaba, me obliga a cambiar el
      stock"*. El botón pedía `delta !== 0`, así que había que inventar un
      cambio de stock —y eso dejaba un ajuste en el historial, que es el mismo
      historial con el que se reconstruyen los faltantes—. Ahora alcanza con
      haber cambiado algo, y sin cambio de stock no se escribe ningún
      movimiento. No hizo falta un modo nuevo: el campo ya estaba ahí.
