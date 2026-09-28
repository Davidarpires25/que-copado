# Proposal

## Why

Un cajero rápido no lee la pantalla: va a donde ya sabe que está cada cosa. La
ley de Hick dice lo mismo desde el otro lado: el tiempo de decidir crece con
las opciones que compiten, y baja cuando están agrupadas y siempre en el mismo
lugar. La auditoría de diseño del 2026-09-26 (menú de 36 productos en 9
categorías; netbook de 1366, tablet, celular, los dos temas) encontró que la
caja trabaja en contra de esa memoria. Además, el panel tiene tokens de color
para superficies y texto, pero no para estados, tamaños de texto ni tamaños de
control, y eso ya produjo dos versiones distintas del mismo control.

Este cambio sigue a `la-caja-dice-lo-que-paso`, que arregla los números. Este
es de diseño.

## Qué se rompe hoy en el local

- **La grilla se reordena sola.** "Todos" ordena por nombre: Agua, Aros,
  Brownie, Cerveza, Cheeseburger, Combo… Las categorías se mezclan, y cada
  producto que se carga corre de lugar a todos los que vienen después.
- **Las categorías no entran.** Con 11 pestañas, a 1366 "Cervezas" queda
  cortada en "Ce" y nada indica que hay más.
- **Cada toque tira un aviso.** "Aros de cebolla agregado" aparece arriba al
  centro y tapa la barra de turno y las pestañas. En tablet tapa "Mesas", en
  celular "Cerrar caja", y en tema oscuro sale igual en verde claro. La
  tarjeta ya se pinta de ámbar con la cantidad.
- **Los pendientes están al revés.** El chip del pedido que se está cobrando
  es el más pálido, los demás son ámbar lleno, y "+ Nuevo pedido" es idéntico
  a un pedido.
- **El carrito no entra en la netbook.** El subtotal de cada renglón se monta
  sobre el tacho: tiene 52px fijos y "$ 29.000" no entra. Los nombres se cortan
  en "Combo Clásico (b…" y "Hamburguesa do…", y así tres combos no se
  distinguen. El bloque de envío ocupa unos 90px en cada venta, aunque casi
  ninguna lo use.
- **En tablet vertical el carrito vacío ocupa media pantalla.** Son 380px de
  820 con "Sin productos", y la grilla queda en 3 columnas angostas con
  nombres cortados y la etiqueta de stock bajo afuera.
- **"Pizza mitad y mitad" cuesta "$ 0"** en la grilla, y el selector no
  muestra el precio de ninguna mitad.
- **El cierre pone la tarea al final.** Lo que se hace en esa pantalla es
  contar la plata, y el conteo está después de Tiempo, Ventas y Medios: en la
  netbook hay que bajar para ver el resultado y el botón. Además:
  - las horas salen como "11:13 p. m. hs";
  - el contado se ve "40000" al lado de "$ 46.000";
  - el faltante lleva un ícono de tilde y el botón de confirmar uno de
    advertencia;
  - el ticket promedio muestra centavos ("$ 13.833,33"), y en celular se sale
    de su celda y el encabezado se parte en dos renglones.
- **Los diálogos cambian de letra.** "Movimiento de caja", media pizza y todo
  lo que se abre por portal se muestra con la tipografía de la tienda, no con
  la del panel. La regla de Inter está en `.admin-layout`, y los portales
  salen fuera de ese árbol.
- **El mismo control con dos tamaños.** El `−`/`+` mide 36px en el carrito de
  mostrador y 26px en el de mesa. Los tamaños están escritos a mano
  (`style={{ height: 36 }}` y similares, unas 50 veces en la caja), y los estados como pares
  crudos (`text-red-700 dark:text-red-400`, unos 250 usos). Nada ata las copias
  entre sí.

## What Changes

- La grilla en "Todos" se ordena por categoría (en el orden de las
  categorías) y, dentro de cada una, por nombre.
- Las categorías se ven todas donde entran. Donde no entran, el borde indica
  que hay más.
- Se saca el aviso al agregar un producto, en todos los tamaños.
- Pendientes: siguen abajo, donde están; el pedido elegido pasa a ser el más
  marcado y "Nuevo pedido" se distingue de un pedido.
- Carrito: los nombres se leen enteros (hasta dos renglones), los montos no se
  pisan con nada, y el envío apagado ocupa un renglón.
- Por debajo de 1024px el carrito pasa a la hoja con botón flotante, como en
  el celular. Así la tablet vertical usa todo el ancho para la grilla.
- Media pizza: la tarjeta muestra "desde $X", y el selector muestra el precio
  de cada mitad y el resultado.
- Cierre: un solo panel que se ve entero de un vistazo en la netbook, con el
  conteo primero (a la izquierda) y el resumen del turno al lado; horas en
  24 h; el contado con separador de miles; íconos que dicen lo que pasa;
  montos sin centavos; y en celular la misma barra superior que el resto del
  panel.
- Los diálogos, menús y avisos del panel usan su tipografía y su tema,
  también fuera del árbol del panel.
- Tokens nuevos:
  - de estado (`éxito`, `peligro`, `aviso`, `info`, con texto y fondo para cada
    tema);
  - una escala de texto de 6 pasos;
  - dos tamaños de control.

  La caja pasa a usarlos. El resto del panel los adopta cuando se toque.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `caja`: se agregan requisitos de orden y ubicación estables (la grilla, las
  categorías, los pendientes), de lo que el carrito tiene que dejar leer, y del
  cierre.

## Fuera de alcance

- **Mover los pendientes arriba de la grilla.** La auditoría lo proponía
  (lección 19) y la maqueta lo mostró; David vio las capturas y prefiere que
  sigan abajo, donde los busca hoy. Se arregla solo su énfasis.

- **Efectivo marcado por defecto en el cobro.** David eligió que el medio se
  elija siempre. El cobro por comensal, que marca Efectivo, queda como está.
  Queda anotado que las dos pantallas hoy no se comportan igual.
- **Atajos de teclado** (buscar, cobrar, cancelar). Los recomendaba la
  auditoría de febrero y siguen sin estar. Si se quieren, van en un cambio
  propio, pensado con la netbook del local delante.
- **Migrar todo el panel a los tokens nuevos.** Se definen para todo el panel,
  pero acá solo se aplican en la caja. Un reemplazo masivo en 100 archivos
  mezclaría este cambio con otros.
- **Orden manual de productos dentro de una categoría.** Pediría una columna
  nueva y una pantalla para ordenar. Por ahora, alfabético dentro de la
  categoría.

## Toca AgentePOS

No.

## Impact

- `components/admin/caja/*`: grilla, carrito, pendientes, media pizza,
  cierre, mesas (el tamaño del control).
- `app/admin/caja/page.tsx`: orden de los productos.
- `app/globals.css`: tokens nuevos; la tipografía y el remapeo de `--accent`
  pasan de `.admin-layout` a `html.admin-panel`.
- `components/ui/sonner.tsx`: el tema de los avisos sigue al del panel dentro
  del admin.
- Depende de `la-caja-dice-lo-que-paso` en la pantalla de cierre: ese cambio
  agrega el desglose y los bloqueos, y este reordena la pantalla. Se aplica
  después.
