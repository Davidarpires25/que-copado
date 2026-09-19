# Lecciones

Patrones que costaron tiempo o errores, para no repetirlos.
Cada entrada: qué pasó, por qué, y la regla que queda.

---

## 1. Leer `tasks/` ANTES de diseñar cualquier cosa

**Qué pasó (2026-09-09).** Diseñé de cero la arquitectura de roles y permisos.
Recién al final apareció `tasks/plan-roles-y-permisos.md`, un plan de 518 líneas
que ya existía y que proponía un modelo distinto —rol como plantilla más
overrides granulares por usuario, con 22 claves `seccion.view` /
`seccion.manage`— en vez del enum de tres roles que construí.

**Por qué pasó.** Fui directo al código y a la base para entender el estado
actual. `tasks/` no es código, así que no apareció en ninguna búsqueda.

**Regla.** Al arrancar cualquier tarea no trivial, listar `tasks/` y `docs/`
antes de tocar nada. Si hay un plan sobre el tema, leerlo y decir explícitamente
si se sigue o por qué no.

---

## 2. Inspeccionar la base real, no deducirla de las migraciones

**Qué pasó (2026-09-09).** Escribí una migración de RLS mirando
`supabase/migrations/`. Al obtener acceso a Supabase resultó que el esquema base
se había creado desde el dashboard: había tres tablas y varias policies que no
figuraban en ningún archivo. Corrida como estaba, esa migración habría dejado la
impresora térmica muerta, dos tablas sin acceso, y productos y zonas
desactivados visibles en la tienda pública.

**Regla.** Las migraciones del repo son una hipótesis, no el estado. Antes de
escribir DDL que borre o reemplace algo, consultar `pg_tables` y `pg_policies`.
Y envolver toda migración destructiva en `BEGIN/COMMIT`.

---

## 3. Para un cambio de estilos, buscar la intención, no el rango de tonos

**Qué pasó (2026-09-09).** El admin estaba calibrado solo para tema oscuro.
Migré los tonos `-400` y `-500` a pares `-700 dark:-400`. Dos días después David
mandó una captura de un diálogo ilegible en tema claro: quedaban 62 clases con
`-200`/`-300` de texto y `-900`/`-950` de fondo. Hubo que hacer una tercera
pasada.

**Por qué pasó.** Busqué por rango de tonos en vez de por la pregunta correcta:
*¿qué clase asume un fondo oscuro?*

**Regla.** En una migración de estilos, definir el criterio por intención y
después derivar el patrón de búsqueda. Verificar la cobertura con un grep
negativo —"que no quede ninguna sin `dark:`"— y no con el conteo de reemplazos.

---

## 4. Verificar el efecto, no la sintaxis

**Qué pasó (2026-09-09).** Los 65 tokens de shadcn estaban definidos como
tripletes HSL crudos (`--primary: 18 100% 60%`) y mapeados sin `hsl()`. Todo
`bg-primary`, `bg-accent` y `border-border` producía un color inválido que el
navegador descartaba. Los switches y checkboxes nunca mostraban su estado
marcado, en 11 pantallas. Estuvo así hasta que un botón "no se veía" y hubo que
mirar el CSS compilado.

**Regla.** Cuando algo de estilos no se comporta como dice el código, leer el
CSS que sale del build (`.next/static/chunks/*.css`), no el que se escribió.
Vale también para RLS: probar con `SET LOCAL ROLE anon` y `ROLLBACK` en vez de
razonar sobre las policies.

---

## 5. Un patrón repetido puede ser una decisión, no un descuido

**Qué pasó (2026-09-09).** Reporté la tarjeta de KPI repetida en 9 archivos como
duplicación a limpiar. David la había reutilizado a propósito porque le gustaba
el diseño.

**Regla.** Extraer el patrón a un componente sigue estando bien, pero
encuadrarlo como "consolidar algo que ya usás", no como "arreglar duplicación".
La distinción importa para constantes de dominio que sí divergieron —métodos de
pago con tres paletas, estados de mesa con dos colores—: ahí sí hay bug, porque
el mismo dato se ve distinto según la pantalla.

---

## 6. Si el usuario hace una cuenta a mano, la está haciendo por el sistema

**Qué pasó (2026-09-11).** Rocío no podía dejar un stock en 0: escribía `0` en
"Cantidad" y el botón no la habilitaba. Le expliqué por WhatsApp que usara
"Desperdicio" y pusiera la diferencia. Funcionó, pero el historial quedó con 25
mermas falsas cuyo motivo dice "ajuste".

**Por qué pasó.** El diálogo pedía un *delta* ("cuánto sumar o restar") y el
usuario piensa en un *estado* ("hay 13 kg", "no hay nada"). Para salvar la
distancia, ella calculaba `|real − sistema|` mentalmente y después elegía el
tipo de movimiento según el signo del resultado. Dos operaciones que le tocaban
a la máquina.

**Cómo se detectó.** Mirando los movimientos en la base, no la pantalla: en
`previous_stock → new_stock` el destino era siempre un número redondo
(0, 1, 10, 19) y el tipo alternaba sólo según el signo. Ese patrón es la firma
de un modelo mental que no coincide con el formulario.

**Regla.** Cuando un usuario reporta que "no le deja", revisar primero qué
aritmética le está pidiendo el formulario. Si el dato que él tiene es el estado
final y el campo pide la diferencia, el bug es el campo. Y antes de opinar sobre
una feature, contar sus usos en la base: `return` tenía 0 en toda la vida del
sistema y `waste` se estrenó esa noche para algo que no era merma.

---

## 7. Un número derivado necesita que exista el denominador

**Qué pasó (2026-09-11).** La columna "Agota en" dividía el consumo por 30 días
calendario, pero en esos 30 días había ventas registradas de 2. El consumo
diario salía ~15× más chico y los días restantes ~15× más grandes: "Paty"
mostraba 257 días cuando tenía para 8 jornadas, y "huevo chico" mostraba 30 días
teniendo para 1. La misma división estaba en "Promedio/día" de Consumo.

**Regla.** Toda métrica con un denominador temporal asume que el período
transcurrió *operando*. Antes de mostrarla, verificar contra los datos reales
cuántos días tienen actividad. Un local que abre 3 días por semana, o un sistema
recién estrenado, rompen la suposición sin dar ningún síntoma: el número sale
lindo y es falso. Ante datos insuficientes, no mostrar nada es mejor que mostrar
una proyección — el umbral manual (`min_stock`) ya resolvía la misma necesidad y
el usuario lo controla.

---

## 8. Una fórmula duplicada diverge; la que escribe es la que hace daño

**Qué pasó (2026-09-11).** La regla de escalado de sub-recetas
(`sub.quantity * actualQty`) estaba copiada en cinco lugares. Tres colectores
—los que deciden si alcanza el stock— resolvían el ingrediente compuesto a sus
componentes con un `if/else`. El cuarto, `deductIngredientCascade`, que es el
único que **escribe**, descontaba el compuesto *y después* bajaba a los hijos,
sin `else`. El sistema verificaba una cosa y ejecutaba otra: la comprobación
miraba sólo los componentes y el descuento además bajaba el stock del compuesto,
que nadie había comprobado, pudiendo dejarlo negativo en silencio.

**Por qué no se detectó.** Había 0 sub-recetas cargadas, así que la rama nunca
se ejecutó. Y los reportes de stock teórico seguirían mostrando números
coherentes mientras el stock real derivaba, porque los reportes usan los
colectores, no el que descuenta.

**Regla.** Cuando la misma regla de negocio aparece en más de un lugar,
comparar **el que lee contra el que escribe** antes que nada: si divergen, el
que escribe es el que corrompe datos, y el síntoma aparece lejos de la causa.
Y al encontrar la divergencia, extraer la regla a un módulo único en vez de
arreglar el sitio roto — si no, vuelve a pasar. Un `if` sin su `else` en código
recursivo es sospechoso por defecto.

---

## 9. "Fuera de la transacción" no es lo mismo que "sin esperar"

**Qué pasó (2026-09-11).** Los commits que pasaron el cobro a RPC transaccionales
dejaron el descuento de stock afuera a propósito, con un comentario que lo
explica bien: *"es best-effort y no tiene por que poder tumbar un cobro ya
confirmado"*. La decisión es correcta. Pero se implementó como
`deductStockForOrder(...).catch(...)` sin `await`, y el deploy es serverless
(Netlify): cuando la server action retorna, la invocación puede terminar antes de
que esa promesa corra. Venta cobrada, stock intacto.

**Por qué no se vio.** El bug era de dos días antes y casi no había tenido
tráfico. En los datos no quedaba rastro: los únicos pedidos sin movimientos de
stock se explicaban por productos sin control activado.

**Regla.** En serverless, una promesa que no se espera es una promesa que puede
no ejecutarse. Para trabajo que debe correr sin bloquear la respuesta existe
`after()` de `next/server`, que es justamente eso. `.catch()` suelto atrapa el
error pero no garantiza la ejecución — y en una revisión parece correcto, que es
lo peligroso.

---

## 10. Si el proyecto ya resolvió una clase de bug, buscar dónde más aplica

**Qué pasó (2026-09-11).** La migración 013 creó `increment_field` con el
comentario *"Prevents read-modify-write race conditions"*, y se usó para los
totales de caja. El stock —que tiene mucha más concurrencia, varias ventas
simultáneas en hora pico— siguió con las cinco escrituras en read-modify-write
durante meses.

**Regla.** Cuando aparece una solución a una clase de problema, el mismo día hay
que preguntarse dónde más se da esa clase. Buscar el patrón, no el síntoma:
`grep` de `select` seguido de `update` sobre la misma fila encuentra en minutos
todos los lugares que tienen el bug, aunque todavía no hayan fallado.

---

## 11. `toLocaleDateString` sin `timeZone` en el servidor imprime la zona del servidor

**Qué pasó (2026-09-11).** `app/actions/print.ts` armaba la fecha del ticket con
`new Date().toLocaleDateString('es-AR')`. El `'es-AR'` da el *formato*
argentino, pero **no la zona**: sin `timeZone` explícito se usa la del proceso,
y el server action corre en Netlify, que va en UTC. Resultado: todo ticket
emitido después de las 21:00 hora argentina salía con la fecha del día
siguiente — o sea, casi todos, porque ese es el horario pico.

**Por qué se pasó por alto.** En desarrollo no se ve: la máquina local está en
hora argentina, así que el ticket sale bien. Sólo falla en producción, y de un
modo que parece un detalle cosmético hasta que se entiende que el número de
pedido se reinicia cada día y ese "#15 del 11/09" apunta a un pedido que al día
siguiente existe de verdad y es otro.

**Regla.** En código que corre en el servidor, toda fecha que va a leer una
persona lleva `timeZone` explícito. El locale (`'es-AR'`) y la zona son cosas
distintas y es fácil creer que una implica la otra. Al encontrar uno, buscar el
patrón completo: `grep "toLocale" app/actions lib` y revisar cuáles archivos
tienen `'use server'`. Y usar la fecha del dato (`created_at`), no la del reloj,
o una reimpresión se disfraza de documento nuevo.

---

## 12. La instrumentación puede ser lo que rompe la prueba

**Qué pasó (2026-09-11).** Para diagnosticar por qué el ícono de la bandeja no
cambiaba de color, agregué un modo debug y se lo pasé a `systray2`. Esa librería
elige su binario según ese flag —`tray_windows.exe` en debug contra
`tray_windows_release.exe` en normal— y el de debug no viene en el paquete. O
sea que encender el diagnóstico deshabilitaba por completo aquello que quería
diagnosticar, y de paso impidió probar el arreglo real que iba en ese mismo
build.

**Regla.** Antes de pasarle un flag propio a una librería de terceros, mirar qué
hace con él. Y cuando un diagnóstico devuelve un error nuevo que no existía
antes, la primera sospecha es el instrumento, no el sistema. Verificarlo cuesta
un `grep` en `node_modules`.

---

## 13. Probar en el entorno real encuentra lo que ningún razonamiento encuentra

**Qué pasó (2026-09-11).** El print-bridge se desarrolló y verificó en Linux.
Al probarlo en Windows aparecieron tres bugs que en Linux eran invisibles por
construcción: el ejecutable no arrancaba con el target Node 22; dos instancias
simultáneas duplicaban cada ticket; y diez mensajes de error iban a una consola
que en producción está oculta, así que no existían para nadie.

Ninguno se podía deducir leyendo el código en Linux, porque en Linux la consola
está visible y nadie corre el proceso dos veces.

**Regla.** Para un artefacto que corre en otro sistema operativo, "compila y
anda acá" no es evidencia de nada. Vale conseguir una máquina de ese sistema,
aunque sea prestada y aunque la prueba sea incompleta: la prueba parcial en el
entorno real encontró tres bugs que el razonamiento completo no encontró. Y
cuando el que prueba es otro —persona o agente—, pedirle **evidencia** (salida
de comandos, logs, capturas) y no conclusiones: en esta sesión, dos de sus
diagnósticos eran incorrectos y la evidencia en crudo fue lo que permitió
corregirlos.

---

## 14. Agregar un valor a un enum deja atrás todos los literales viejos

**Qué pasó (2026-09-13).** `order_source` pasó de `'web' | 'pos'` a incluir
`'whatsapp'`. El pedido del agente se guardaba perfecto —origen, estado, número,
total— y aun así era invisible en la caja: `getPendingOrders` traía mostrador
'abierto' **o** `.eq('order_source', 'web')` en 'recibido', y un pedido de
WhatsApp no caía en ninguna de las dos ramas. Lo mismo el guard de cancelación,
la rama de `print.ts` que decide dónde viven los items, la vista de cobro, el
badge de la lista y —el peor— el filtro de la suscripción de realtime
(`order_source=eq.web`), que hacía que el pedido entrara a la base sin avisarle
a nadie.

Siete lugares para un solo valor nuevo. El compilador no ayuda: `=== 'web'` es
válido para cualquier `OrderSource`.

**Regla.** Al agregar un valor a un enum, `grep` del literal viejo en todo el
repo —incluyendo strings de filtros PostgREST y de realtime, que ningún
type-check mira— antes de dar por cerrado el cambio. Y preferir la condición
negada: la base ya había elegido `order_source <> 'pos'` en la migración 037,
que expresa "pedido remoto" y no hay que tocarla cuando aparezca el cuarto
canal. En TypeScript eso es `esPedidoRemoto()`, un solo lugar donde equivocarse.

---

## 15. Con RLS, la falta de permiso no es un error: son cero filas

**Qué pasó (2026-09-13).** `createOrder` devolvía `order_number: null` siempre.
El correlativo lo pone un trigger, así que había que releerlo, y la relectura la
hacía `createAdminClient()` que —pese al nombre— usa la clave **anon**, sin
SELECT sobre `orders`. PostgREST no devuelve 403: devuelve `[]` con HTTP 200.
El código hacía `const { data: numerado }` descartando el error que además nunca
llegaba. La web no lo notó nunca porque su pantalla de confirmación no muestra
el número; lo encontró el agente de WhatsApp, cuyo contrato sí lo promete.

El mismo patrón, dos veces más en el mismo día: `marcarIdempotencia` hacía un
UPDATE como anon que devolvía cero filas sin error, así que la clave nunca se
guardaba y un reintento del agente creaba un pedido duplicado; y
`buscarPedidoPorClave` leía con anon, o sea que tampoco habría encontrado nada.

**Regla.** Una consulta que vuelve vacía bajo RLS es indistinguible de "no hay
datos". Si una escritura o lectura tiene que funcionar sí o sí, verificar el
rol con el que corre —`createAdminClient()` es anon; el service role es
`createServiceRoleClient()`— y comprobar el efecto, no la ausencia de error:
contar filas afectadas (`{ count: 'exact' }`) o releer. Y cuando lo que falta es
leer la fila recién escrita, un RPC `security definer` que devuelva solo lo
necesario resuelve el permiso y el viaje extra de una vez.

---

## 16. Una conversión aplicada a una sola punta

**Qué pasó (2026-09-18).** David preguntó si estaba bien redondear para abajo:
el orégano decía `29,997 g`. Redondear estaba bien; ese `,997` no. La receta se
convertía a unidad base para poder comparar entre recetas —30 g pasaban a
0,03 kg— y ese número se restaba tal cual a `ingredients.current_stock`, que
está guardado **en la unidad del insumo**. Faltaba la vuelta. Cada pizza se
comía 0,03 g de morrón en vez de 30: los insumos cargados en gramos o
mililitros no bajaban nunca y nunca avisaron que se acababan.

El mismo error por el otro lado en la comparación, y en cuatro cálculos de
costo. Un insumo cargado en kg con receta en gramos estaba bien, porque la base
de los dos es el kilo: el bug solo tocaba a los insumos cuya **propia** unidad
no era la base de su familia, que eran dos de cuarenta y cinco.

**Regla.** Cuando una cuenta normaliza unidades, las dos puntas se normalizan o
ninguna. Y el caso que delata el error es el que casi no existe: si todos los
insumos están en la unidad base, el bug es invisible. Al revisar una conversión,
buscar a propósito la fila cuya unidad **no** es la base.

---

## 17. Dos errores que se cancelan parecen una cuenta correcta

**Qué pasó (2026-09-18).** El costo del morrón estaba cargado como `$200` por
**gramo** —eran $200 por los 200 g comprados— o sea mil veces inflado. Y el
cálculo del costo del producto multiplicaba una cantidad en kg por un costo por
gramo, dividiendo por mil. El costo de la pizza daba $9.343, un número creíble,
y nadie miró dos veces en meses.

Arreglar solo el código llevaba PIZZA ESPECIAL de $9.126 a ~$15.100 contra un
precio de $16.500. Arreglar solo el dato hacía lo inverso. **Los dos juntos o
ninguno.**

Por qué el dato entró así: el formulario de compra pedía "costo por unidad" y no
mostraba ningún total. Cargar `200 g` a `$200` —una compra de $40.000 en
morrones— no tenía forma de verse.

**Regla.** Un resultado plausible no es evidencia de que la cuenta esté bien: en
una cadena de multiplicaciones, dos errores inversos se cancelan y el resultado
final no los delata. Verificar los factores, no el total. Y cuando un formulario
pide un valor unitario, mostrar lo que ese valor implica —el total— es lo que
convierte un error invisible en uno obvio al tipearlo.

---

## 18. Antes de automatizar una decisión que cuesta plata, medirla contra los datos reales

**Qué pasó (2026-09-18).** Se arregló que el tope de producción se aplicara de
verdad —el checkout aceptaba 50 hamburguesas con stock para 3—. Estaba listo
para desplegar cuando David preguntó: *"¿es recomendable que se rechace el
pedido? Imaginemos que se carga mal el stock un día y justo se bloquea por eso"*.

Medido contra los datos reales: **13 de 38 productos quedaban con techo de 8 o
menos, y cinco con techo de 1** —tres pizzas limitadas por "Salsa de tomate",
que decía tener una unidad—. Alguien pidiendo dos pizzas se llevaba un rechazo
por un dato viejo. Terminó detrás de un interruptor, apagado.

La pregunta era mejor que la implementación, y la respuesta no salía de razonar
sino de consultar la base.

**Regla.** Una regla automática vale lo que valen los datos que lee. Antes de
encender una que rechace ventas, oculte productos o bloquee una operación,
correrla contra los datos de producción y contar a cuántos alcanza **hoy**. Si
el número sorprende, la regla va detrás de un interruptor apagado, no directo a
producción.

---

## 19. La información va donde la persona ya está mirando

**Qué pasó (2026-09-18).** El sistema escondía productos por falta de stock sin
decirlo: tres pizzas desaparecieron del catálogo y el único rastro era un
"Salsa de tomate: 0" en otra lista, sin nada que conectara las dos cosas. Se
agregó un cartel arriba de la pantalla de Stock.

David: *"pensaba en una opción en la tabla de alertas que abra una sección y
muestre la información de los ingredientes y lo que falta"*. Mejor: el dato por
producto, en la fila que ya estaba abierta, en vez de un resumen arriba. Y de
paso reemplazaba un tooltip que ofrecía "Ver ingredientes faltantes" y llevaba a
la misma pantalla donde ya estabas.

**Regla.** Cuando el sistema toma una decisión que a alguien le va a llamar la
atención, el "por qué" va pegado a donde se ve el efecto, no en un cartel
aparte. Un resumen arriba responde "cuántos"; la pregunta real es "por qué
éste".

---

## 20. "No toques la base" era producción, y el stack local existe

**Qué pasó (2026-09-19).** Arreglé el borrado de insumos y lo entregué diciendo
"no probé nada contra la base, como pediste", apoyado solo en `tsc`, lint y
build. David: *"no probaste con la base de datos local?"*.

La regla que él había puesto era sobre **producción** —`.env.local` apunta ahí,
y el local está en uso—, no sobre el stack de Supabase local, que estaba
levantado y es exactamente el lugar donde se prueba sin riesgo. Convertí una
restricción concreta en una excusa general para no verificar.

Probando local en diez minutos: reproduje el `23514` real (el `SET NULL` de
`stock_movements` chocando contra el CHECK), verifiqué las tres consultas bajo
un token de usuario de verdad —no service role, que es lo que RLS podría haber
bloqueado en silencio— y ejecuté las tres ramas.

**Regla.** Antes de decir "no lo probé", preguntarse si hay un lugar donde sí se
puede: `npx supabase status` contesta en un segundo. Y si el riesgo es que RLS
esconda filas, probar con el token del usuario, no con la clave elevada: el
service role hace pasar cualquier consulta y no prueba nada.

**Corolario.** `tsc` no valida una consulta de PostgREST. En este mismo arreglo
escribí `recipe_ingredients → products(name)` y esa tabla cuelga de `recipes`;
compilaba perfecto y fallaba en runtime. Las relaciones anidadas se verifican
contra la base, no contra el compilador.

---

## 21. Un test que no falla contra el código viejo no prueba nada

**Qué pasó (2026-09-19).** David pidió instalar Playwright y escribí cuatro
tests del borrado de insumos. Pasaron los cuatro a la primera. Antes de
darlos por buenos, volví `app/actions/ingredients.ts` a la versión anterior al
arreglo y los corrí de nuevo: fallaron. Recién ahí valían algo.

Dos cosas aparecieron solo por correrlos de verdad:

- El formulario de login manda una **server action**, así que un click antes de
  que hidrate no hace nada y el test espera una navegación que nunca sale.
  Esperar al botón no alcanza: existe desde el HTML del servidor.
- Con `127.0.0.1` Next bloquea sus propios recursos de dev por cross-origin.
  Con `localhost` anda.

**Regla.** Un test nuevo sobre un arreglo se corre **dos veces**: contra el
código arreglado y contra el viejo. Si pasa en los dos, prueba otra cosa.

**Y el env del test se escribe en `playwright.config.ts`, no se hereda.**
`.env.local` apunta a producción. Un test de navegador que lo lea borra datos
de verdad. La prueba de que el server quedó apuntando al stack local es que
entró con `prueba@local.test`, que solo existe ahí.

---

## 22. Un campo numérico controlado por un número no se puede vaciar

**Qué pasó (2026-09-19).** David: *"cuando estoy configurando un ingrediente de
una receta este se marca en 1 automáticamente pero no me deja borrar el 1 para
poner lo que yo quiera, lo que me obliga poner un número por delante del 1 para
borrarlo"*.

Al borrar el último dígito el campo vale `''`, eso no es un número, y el
`onChange` lo reemplazaba antes de que la persona alcanzara a escribir. Estaba
en cuatro lugares con tres disfraces distintos, todos con la misma forma:

```tsx
parseFloat(e.target.value) || 0.001              // se pega en 0.001
Math.max(1, Number(e.target.value) || 1)         // se pega en 1
if (!isNaN(val) && val > 0) cambiar(val)         // ignora el borrado
```

El test lo dejó escrito tal cual lo contó: escribir `250` sobre el campo daba
`"1250"`.

**Regla.** Un campo de texto tiene **dos** estados: lo que se está escribiendo y
lo que vale. Mientras tiene foco manda el texto, aunque esté vacío o a medio
escribir (`"1."`, `"0."`); el valor se avisa hacia arriba solo cuando el texto
es un número válido. Al salir, soltar el borrador alcanza para que vuelva el
último valor bueno: arriba nunca llegó otra cosa.

**Corolario.** Un `||` como fallback trata al `0` y al `''` igual que a un error.
En un campo de cantidad eso es exactamente el bug.

---

## 23. Medir antes de rediseñar, aunque el reporte suene obvio

**Qué pasó (2026-09-19).** David reportó que con muchos ingredientes "la
pantalla no se adapta". Ya había empezado a mover cosas de lugar cuando
preguntó: *"analiza si es cierto"* / *"o es por que el usuario no hace
scroll"*. Tenía razón en dudar, y la medición cambió el diagnóstico.

Lo medido en una notebook de 1366×768, agregando 18 ingredientes:

- **Nada estaba roto.** La página scrollea y el botón siempre se alcanza —
  además, al clickearlo el navegador lo trae solo, porque el foco se va al
  buscador. Ahí "el usuario no scrollea" era una explicación válida.
- **Pero el botón bajaba 58px por ingrediente** y el total se iba de pantalla
  en el séptimo. Lo único que se repite era lo único que se movía.
- **Y por debajo de 1180px de ancho hay desborde horizontal**, con tres
  ingredientes, no con dieciocho: la columna está clavada en `w-[380px]` y las
  dos nunca se apilan. Eso no tiene nada que ver con la cantidad.

Tres problemas distintos donde el reporte sonaba a uno solo, y el que yo iba a
arreglar de memoria no era el más grave.

**Regla.** Un reporte de usabilidad describe un síntoma, no una causa. Antes de
mover el layout, medir: posición del control que se repite, qué entra en
pantalla, a qué ancho desborda. Playwright da esos números en minutos y
convierte una discusión de opiniones en una tabla.

**Corolario técnico.** Recortar una lista con `overflow-y-auto` no recorta lo
que cuelga de ella con `position: absolute` si no hay ancestro posicionado: el
`<select>` escondido que Radix pone por fila se ancla al documento y dejaba
700px de scroll vacío. El contenedor que recorta necesita `relative`.

**Y un detalle de método.** El `next dev` de David estaba corriendo y Next 16 no
deja levantar un segundo. No hay que matarlo: un `git worktree` aparte, con
`node_modules` enlazado con `cp -al`, corre los tests sin tocarle la sesión.

---

## 24. Un hijo flex no se achica solo, y eso escondió el botón de salir

**Qué pasó (2026-09-19).** David, probando en la netbook: *"el navbar deja de
mostrar el cerrar sesión y solo mostraba ajustes"*.

El `<nav>` del sidebar tenía `flex-1` pero no `overflow-y-auto`. Un hijo de un
contenedor flex no baja de su alto de contenido —su mínimo automático es
`auto`, no `0`— así que con los 15 ítems de un administrador el menú reclamaba
772px, empujaba "Mi cuenta" y "Cerrar Sesión" fuera de la pantalla, y el
`overflow-hidden` del `<aside>` los cortaba. Medido en 1366×768: el botón de
salir quedaba **122px por debajo del borde**. No había forma de cerrar sesión
desde el menú.

**Regla.** `flex-1` reparte el espacio que sobra; no obliga a nadie a achicarse.
Para que un hijo flex ceda hace falta `min-h-0`, o convertirlo en contenedor
scrolleable (`overflow-y-auto`), que es lo mismo por otra vía: el mínimo
automático de un scroll container sí es 0. Si además del scroll hay un pie que
tiene que quedarse abajo, esto no es cosmético: es la diferencia entre que el
pie exista o no.

**Dos trampas que salieron del mismo cambio:**

- Fijar `overflow-y` vuelve `auto` al otro eje. Con las etiquetas siempre en el
  DOM —para que no parpadeen al expandir— aparecía una barra de scroll
  horizontal. Hay que poner `overflow-x-hidden` explícito.
- Montar y desmontar las etiquetas en cada pasada del mouse hace parpadear las
  filas, y desmontar los títulos de grupo además cambia el alto de la lista y
  todo salta. Se quedan en el DOM y se desvanecen con `opacity`.

**Y un detalle de teclado.** Abrir con `onFocus` y cerrar con `onBlur` pliega el
menú en cada Tab, porque moverse entre dos ítems dispara blur y después focus.
El `onBlur` tiene que mirar `relatedTarget`: si el foco sigue adentro, no se
hace nada.

---

## 25. `headers()` también corre en `next dev`

**Qué pasó (2026-09-19).** Moví las cabeceras de cache de `netlify.toml` a
`next.config.ts` para que las leyeran las dos plataformas. Quedaron aplicándose
también en desarrollo, con `immutable` de un año sobre `/_next/static`. Horas
después, al borrar un hook con el server levantado, a David le explotó la
pantalla:

> Module `lib/hooks/use-sidebar-collapsed.ts` was instantiated because it was
> required from `admin-layout.tsx`, but the module factory is not available.

El navegador tenía cacheado un chunk de dev que referenciaba un archivo
borrado, y con `immutable` no iba a volver a pedirlo nunca.

Lo peor: **Next lo venía avisando en cada arranque** —"Custom Cache-Control
headers detected for /_next/static/:path* … can break Next.js development
behavior"— y lo leí varias veces en los logs sin registrarlo, porque estaba
buscando otra cosa.

**Regla.** `next.config.ts` no distingue entornos por sí solo: lo que se pone en
`headers()`, `rewrites()` o `redirects()` corre igual en `dev`. Todo lo que sea
optimización de producción va detrás de
`process.env.NODE_ENV === 'production'`.

**Y la de fondo:** un warning del framework en el log de arranque no es ruido.
Si aparece en cada `npm run dev`, o se arregla o se entiende por qué se ignora.

**Cómo se verificó**, sin levantar nada: `next.config.ts` se puede importar
desde node con `--experimental-strip-types` y llamar a `headers()` con cada
`NODE_ENV`. Devuelve la cabecera solo en producción.
