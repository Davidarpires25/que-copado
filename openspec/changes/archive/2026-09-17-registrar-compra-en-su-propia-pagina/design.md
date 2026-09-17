# Design

## Context

Ver `proposal.md` — Why. Lo que importa acá del estado actual: el diálogo recibe
`ingredients: IngredientWithStock[]` como prop desde `stock-dashboard.tsx`, que a
su vez los recibe del server component `app/admin/stock/page.tsx`. Al salir a una
ruta propia, esa cadena se corta y la página nueva tiene que conseguir los
ingredientes por su cuenta.

El patrón a seguir ya existe y está a la vista en `app/admin/ingredients/new/page.tsx`:
server component que verifica sesión, trae sus datos, y monta un componente
cliente de formulario dentro de `AdminLayout` con `hidePageHeader`.

## Goals / Non-Goals

**Goals**

- Que la página nueva sea autónoma: entrar por URL directa tiene que funcionar
  igual que llegar desde el botón.
- Que el formulario siga siendo el mismo comportamiento, no una reescritura.

**Non-Goals**

- Tocar `registerPurchase()` ni el esquema (ver `proposal.md` — Fuera de alcance).
- Unificar el formulario de compra con el de ajuste de stock, que es otro diálogo
  con otras reglas.

## Decisions

### La página trae sus propios ingredientes

El server component de la ruta consulta los ingredientes y se los pasa al
formulario, como hace `/admin/ingredients/new` con las categorías.

**Alternativa considerada:** pasarlos por estado de navegación o por query params
desde el dashboard. Se descarta porque rompe la entrada directa por URL —que es
justamente lo que gana el cambio— y porque obliga a serializar una lista que la
página puede pedir sola.

Cuál consulta usa es detalle de implementación: alcanza con la lista de
ingredientes activos con su unidad y su stock actual, que es lo que el formulario
muestra. Conviene reusar el mismo camino que ya alimenta la vista de stock en vez
de escribir una consulta nueva.

### El formulario es cliente; la página, servidor

El formulario mantiene estado local —líneas que se agregan y se quitan— así que
sigue siendo un componente cliente. La página es server component para poder
verificar la sesión y traer los datos sin exponer nada al navegador.

Es la misma división que usan las otras cuatro páginas de formulario del panel, y
la razón de mantenerla es que el middleware protege `/admin/*` pero la
verificación de sesión en el server component es la que decide el `redirect`.

### Sin ingredientes, la página guía en vez de mostrar un formulario inútil

Hoy el diálogo se abre igual con el selector vacío: se puede agregar líneas y no
se puede elegir nada. Con pantalla propia hay lugar para decirlo y ofrecer el
enlace a crear un ingrediente.

**Alternativa considerada:** deshabilitar el botón "Registrar Compra" en el
dashboard cuando no hay ingredientes. Se descarta porque un botón muerto no
explica nada; el que llega por URL directa sigue sin respuesta, y el estado vacío
hay que resolverlo igual.

### Se busca y se agrega, en vez de un desplegable por línea

La pantalla se divide en dos: a la izquierda la búsqueda con el catálogo de
ingredientes, a la derecha la compra que se va armando. Escribir filtra; elegir
agrega una línea con ese ingrediente ya fijado, y lo único que queda por llenar
es cantidad y costo.

El desplegable por línea repetía el mismo trabajo tantas veces como ingredientes
tuviera la compra: abrir la lista completa, recorrerla y elegir uno, diez veces
seguidas. Y cada línea cargaba su propia copia del catálogo entero. Con la
búsqueda, el catálogo se recorre una sola vez y con el teclado.

**Alternativa considerada:** dejar el desplegable y ponerle búsqueda adentro
(un combobox). Resuelve lo de recorrer la lista, pero no lo de repetir: seguiría
habiendo un selector por línea, cada uno con el catálogo completo, y la compra
armada seguiría leyéndose como un formulario en vez de como una lista.

**Consecuencia:** un ingrediente no puede estar dos veces en la misma compra. Es
la consecuencia correcta —dos líneas del mismo ingrediente son una sola compra de
la suma— y elegirlo de nuevo señala la línea que ya existe en vez de duplicarla.

En pantalla angosta las dos columnas se apilan: la búsqueda arriba, la compra
abajo.

### La nota va en el mismo panel que las líneas

Separada en su propia tarjeta, la nota leía como otra cosa que hay que completar,
cuando es un campo más de la misma carga. Va abajo de las líneas, separada por un
hairline dentro del mismo panel.

Es la convención del proyecto para formularios: un panel con secciones separadas
por hairline, no una tarjeta por tema.

## Risks / Trade-offs

**La búsqueda ocupa lugar en pantallas chicas** → Apilada, la compra queda abajo
del catálogo y hay que bajar para verla. Se mitiga mostrando la búsqueda con una
altura acotada y la compra inmediatamente debajo, no al final de una lista larga.

**El formulario se pierde si el navegador vuelve atrás** → Ya pasa hoy: cerrar el
diálogo descarta las líneas. Sale del diálogo con el mismo comportamiento y no se
agrega persistencia de borrador, que sería un cambio de alcance. Queda anotado
por si aparece como molestia real de uso.

**Un viaje más al entrar** → La página consulta los ingredientes al abrirse,
donde antes ya venían cargados con el dashboard. Es una consulta chica y ocurre
en una navegación que el usuario inició; a cambio, la página funciona por URL
directa.

**El botón está duplicado en el dashboard** (escritorio y móvil) → Los dos tienen
que cambiar. Si se cambia uno solo, la mitad de los casos sigue abriendo un
diálogo que ya no existe. Está anotado como tarea explícita.

## Migration Plan

No hay migración de datos ni de esquema. El diálogo se elimina en el mismo cambio
que agrega la página: no conviven, porque tener las dos puertas a la misma carga
es exactamente la confusión que se quiere sacar.

Para revertir alcanza con revertir el commit: nada quedó escrito en la base que
dependa de este cambio.
