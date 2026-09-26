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

---

## 26. Un esqueleto que imita la pantalla se desactualiza solo

**Qué pasó (2026-09-19).** David: *"los skeleton están mostrando tarjetas o
secciones que ya no están, por ej la caja muestra la sección inferior que
sacamos, stock sigue mostrando las tarjetas y así etc"*.

Había 13 `loading.tsx`, cada uno una réplica a mano de su pantalla, en otro
archivo. Stock dibujaba tres tarjetas de estadísticas que no existen y escribía
*"Control de Stock"* cuando la pantalla se llama *"Stock e Inventario"*. Caja
dibujaba una banda inferior de 48px con la info del turno, que se mudó adentro
del POS. Delivery-zones decía *"Zonas de Entrega"* en vez de *"Zonas de
Envío"*.

Nadie se equivocó: es lo que pasa siempre con una copia en otro archivo. Se
toca la pantalla, no la copia.

**Regla.** Un esqueleto tiene un solo trabajo: decir "esto está cargando" y
reservar un espacio parecido. Para eso no hace falta acertarle a la pantalla,
hace falta **no mentir**. Tres formas genéricas —tabla, tarjetas, formulario—
cubren once de las trece pantallas del admin y no pueden desactualizarse porque
no afirman nada puntual. 569 líneas menos.

**Y la parte que más molestaba:** el título era texto escrito a mano. Ahora es
una barra gris. Un texto que hay que mantener sincronizado ya falló dos veces;
una barra gris que se convierte en el título de verdad no puede estar
equivocada.

**Corolario.** Antes de re-sincronizar N copias, preguntarse por qué son copias.

**Y para verlo:** un esqueleto es difícil de capturar porque dura lo que tarda
la carga. Frenar la red no alcanzó. Lo que funcionó fue montarlo en una ruta de
prueba dentro de un worktree descartable. Ojo: una carpeta que empieza con `_`
es privada en el App Router y da 404.

---

## 27. Buscar por componente encuentra menos que medir lo que se ve

**Qué pasó (2026-09-19).** Para sacar las píldoras decorativas de las tablas
hice un inventario buscando `<Badge>`: 31 usos, clasificados uno por uno. Los
arreglé todos. El test de disciplina —que mide el **estilo calculado** de cada
elemento de la tabla, no qué componente se usó— encontró uno más: el tipo de
producto (`Reventa` / `Elaborado`) era una píldora escrita a mano con
`rounded-full`, sin pasar por el componente.

**Regla.** Un inventario por nombre de componente mide *cómo se escribió*, no
*qué se ve*. Cuando lo que importa es lo segundo —apariencia, accesibilidad,
layout— hay que preguntarle al navegador: `getComputedStyle` sobre lo que
realmente se renderizó.

**Y otra vez la 21, por poco.** Ese mismo test nació vacío: buscaba la cadena
`"9999"` en `border-radius`, pero `rounded-full` en Tailwind 4 es
`calc(infinity * 1px)` y el navegador lo calcula como `3.3e7px`. Pasaba contra
el código viejo **y** contra el nuevo. Solo lo descubrí porque ya es costumbre
correr todo test nuevo contra la versión anterior. Con `parseFloat(...) >= 9999`
falló como tenía que fallar, y ahí recién valió algo.

**Detalle operativo:** Playwright borra `test-results/` en cada corrida. Las
capturas de "antes" se escriben fuera de esa carpeta o se pierden al sacar las
de "después".

---

## 28. "Lo revisé por código" no es lo mismo que "lo vi"

**Qué pasó (2026-09-19).** Al barrer las tablas del panel dije que seis pantallas
no se podían medir en local por falta de datos y que las había revisado leyendo
el código. David preguntó: *"¿la tabla pedido la revisaste?"*.

La tabla estaba bien —su único resaltado es el estado del pedido, que es
exactamente lo que corresponde—, pero **sembrar cuatro pedidos costó dos
minutos** y además destapó algo que leer el código no había mostrado: al abrir
un pedido, el detalle imprimía `💵 Efectivo`, con el emoji encima de un ícono
genérico que ya estaba al lado.

**Regla.** Cuando la razón para no verificar algo es "no hay datos", la pregunta
siguiente es cuánto cuesta crearlos. En este proyecto, con el stack local y
PostgREST, casi siempre son unas líneas y el test se los lleva al terminar.
"Revisado por código" es un resultado de segunda y hay que decirlo como tal.

**Y un matiz que el código sí dejó claro:** los emojis del mensaje de WhatsApp se
quedan. Ese texto lo lee el cliente en su teléfono, donde los emojis son parte
del idioma. El pedido era sacarlos del panel. Vale la pena separar los dos
destinos antes de borrar en masa.

---

## 29. El test encontró lo que buscaba, no lo que importaba

**Qué pasó (2026-09-19).** Escribí un test para que ningún atributo quedara
resaltado en las tablas del panel. Detectaba "resaltado" como **fondo propio +
`border-radius` enorme**, o sea: píldoras. Pasó en las seis pantallas.

David: *"en la tabla de recetas el dato de ingredientes se cierra con un
cuadrado"*. Era una caja con borde y fondo y **cero redondeo**. El test no la
veía, porque yo había codificado *la forma que había visto en la captura* en
lugar de *la propiedad que molesta*.

Lo que molesta es que el dato esté **encerrado**. Si está encerrado en una
píldora o en un cuadrado es irrelevante.

**Regla.** Al escribir una comprobación automática, separar el síntoma que
motivó el pedido de la propiedad general que hay que defender. El síntoma sirve
para encontrar el primer caso; si queda como definición, el test solo encuentra
copias exactas del primero. Escribir la definición en la spec obliga a
enunciarla, y ahí se nota si es demasiado estrecha.

**Corolario de precisión.** Al ampliar la regla hubo que excluir los controles:
un `<select>` o un interruptor tienen fondo y borde, y ahí el color no es
adorno sino parte de cómo se ve que están. Una regla más ancha necesita sus
excepciones dichas, o empieza a dar falsos positivos y se termina desactivando.

Relacionado: [[27]] —buscar por componente encontraba menos que medir lo que se
ve— es el mismo error una capa más arriba.

---

## 30. Una ayuda escondida detrás del hover no existe

**Qué pasó (2026-09-19).** Limpiando texto de más en los formularios, David
propuso: *"hay mensajes que podríamos dar cuando el mouse se posicione en ese
campo sin necesidad de mostrarlo abajo"*.

La idea de fondo es correcta —una aclaración que se lee una vez no merece un
renglón fijo para siempre— pero tenía un problema: si la ayuda aparece al pasar
el mouse **por el campo**, nadie la encuentra, porque nada indica que exista.
Nadie pasea el mouse por un formulario a ver qué aparece.

**Regla.** Una ayuda escondida necesita algo visible que diga que está ahí. Un
signo de pregunta chiquito al lado de la etiqueta ocupa lo que una letra y
cumple las dos cosas: ahorra el renglón y se deja descubrir.

**Y tiene que abrirse sin mouse.** Un tooltip que solo responde al `hover` no
existe para quien tabula ni para quien usa el sistema con el dedo. Si el
disparador es un `<button>` en vez de un `<span>`, se abre también al recibir
foco, y eso cubre teclado y pantalla táctil sin código extra.

**Qué se esconde y qué no.** Detrás del icono va lo que se lee una vez y después
estorba. **No** va lo que hay que saber antes de actuar —el límite de 2MB de una
imagen se necesita antes de elegir el archivo— ni lo que avisa de un problema:
un error o una advertencia se muestran, no se esconden.

---

## 31. El subtítulo que reformula el título no informa: decora

**Qué pasó (2026-09-19).** David, limpiando pantallas: *"tratemos siempre de
reducir lo máximo posible la información para que se vea en la pantalla
cómodamente"*.

Censando las quince pantallas del panel, el patrón dominante era el mismo en
casi todas: un subtítulo debajo del título que lo dice otra vez con más
palabras. **Productos** → *"Administra el catálogo de tu negocio"*.
**Categorías** → *"Gestiona las categorías de tus productos"*. **Pedidos** →
*"Gestiona los pedidos de tu negocio"*. Diecisiete en total.

Nadie los lee dos veces, pero se pagan siempre: un renglón arriba de todo, en
cada pantalla, para siempre.

**Regla.** La prueba es tapar el título y ver si el subtítulo sigue diciendo
algo. *"Gestiona las categorías de tus productos"* sin *"Categorías"* arriba no
agrega nada. En cambio *"Quién puede entrar y qué puede hacer"* sí explica qué
es **Equipo**, y *"Define las áreas de cobertura y costos de envío"* dice que
una zona controla dos cosas, no una. Esos se quedan.

**Y el otro patrón, el mismo de siempre:** dos mensajes que dicen lo mismo, uno
gris y uno ámbar. Apareció en producto, en insumos y en combos. Se detecta
buscando la frase repetida textualmente: en combos, los dos párrafos compartían
*"se descuenta del mismo stock que si se vendiera suelto"* palabra por palabra.

**Corolario.** Una lista que se despliega sin que la pidan tampoco informa: el
selector de componentes mostraba el catálogo entero en orden alfabético —250px—
antes de que nadie escribiera nada.

---

## 32. Un test solo encuentra lo que fue a buscar

**Qué pasó (2026-09-20).** David, sobre las tablas de Stock: *"sigue habiendo
píldoras, ¿eso fue intencional o no las revisaste?"*. Las dos cosas, y esa es la
parte incómoda: las había clasificado, pero **mi test no las habría visto igual**,
así que no podía decir que estaban vigiladas.

Dos agujeros, los dos míos:

1. **El filtro `el.children.length === 0`.** Lo puse para quedarme con la caja y
   no con el contenedor que la envuelve. Pero un badge con un ícono adentro
   tiene hijos, así que el tipo de movimiento del historial se escapaba. La
   condición correcta no es "sin hijos", es "que no contenga otra caja".
2. **Stock esconde cuatro tablas detrás de pestañas** y yo medía solo la que
   abre por defecto.

**Regla.** Cuando una comprobación pasa, preguntarse qué no pudo haber visto.
Un test verde prueba que no encontró nada donde miró, y eso no es lo mismo que
que no haya nada. Vale la pena enumerar explícitamente qué queda fuera del
alcance —pestañas cerradas, estados que no se dan con los datos de prueba,
formas que el selector no matchea— y anotarlo en el test.

**Y la decisión que destapó.** El tipo de movimiento era una píldora de seis
colores. Por la regla del panel es atributo —un movimiento no cambia de tipo—
así que va como texto. Pero la **flecha** se queda con su color: en un historial
de cientos de filas lo que se busca es si entró o salió, no cuál de los seis
nombres es. La regla dice qué se resalta; cuál es el eje por el que se recorre
una lista lo dice el uso.

---

## 33. Resaltar lo normal es no resaltar nada

**Qué pasó (2026-09-20).** David tuvo que decirme *"sigue habiendo píldoras"*
**dos veces**, con capturas, después de que yo diera el trabajo por cerrado y
con un test en verde.

La segunda vez el problema no era el test: era **mi lista**. Había puesto `OK`,
`Sin tracking`, `A la venta` y `Disponible` como "estados permitidos", así que
el test aprobaba una pantalla donde de diez filas nueve tenían píldora y una
sola era una alerta. En la pestaña **Alertas**, sin ninguna alerta, había
dieciséis píldoras diciendo "todo bien".

Yo había escrito la regla como *"el color es para el estado"*. Estaba
incompleta. La correcta es:

> **El color marca la excepción, no la regla.**

`Bajo` y `Agotado` sí. `OK` y `A la venta` no: aparecen en casi todas las filas,
y un estado que está en todas partes no es una alerta, es el fondo. `Sin
tracking` además repetía la columna de al lado, que tiene el interruptor.

**Regla.** Antes de aprobar una convención, contar en una pantalla real cuántas
filas la disparan. Si la mayoría, la regla está mal escrita. La pregunta no es
"¿esto es un estado?" sino "¿esto es lo que quiero que me salte a la vista
cuando miro cien filas?".

**Y el corolario sobre los tests.** Un test que valida contra una lista escrita
por mí no prueba que la pantalla esté bien: prueba que coincide con lo que yo
pensé. Cuando el usuario ve algo que el test aprueba, el sospechoso es la lista.

Relacionado: [[32]] —el test no veía los badges con ícono— fue el problema de la
primera vez; este es el de la segunda, y es peor, porque el primero era un
descuido y este era un error de criterio.

---

## 34. Un aviso que la tabla ya cuenta, sobra

**Qué pasó (2026-09-20).** David, sobre la franja amarilla arriba de Stock:
*"está ocupando mucho espacio, ¿no hay forma de ponerlo en otro lado?"*.

Esa franja la escribí yo unas horas antes, y en su momento **era el único lugar
donde se decía que el sistema había dejado de ofrecer un producto**. Entre
medio, la tabla aprendió a hacerlo: esos productos ahora salen primeros, llevan
el cartel `Auto-deshabilitado`, y al abrir la fila se ve qué insumo falta. La
franja pasó a repetir tres veces lo mismo, gratis para mí y a 170px por visita
para él.

**Regla.** Un aviso resuelve un problema **en un momento dado**. Cuando el resto
de la pantalla mejora, hay que volver a mirarlo: puede que ya no haga falta, o
que alcance con el renglón. Nada avisa de que un aviso quedó de más — hay que
ir a preguntárselo.

**Lo que quedó:** el renglón con el conteo, siempre visible, porque eso sí no
está en ningún otro lado —que está pasando *ahora* y cuántos son— y el detalle
a un click, en un `<details>` plegado. Un `<details>` nativo, además, no
necesita estado ni JavaScript, y se abre con el teclado solo.

**Y el corolario del día.** Las dos tandas de trabajo de hoy —las píldoras y el
texto de más— salieron de la misma pregunta: *¿esto se gana el lugar que ocupa,
cada vez que alguien abre esta pantalla?*. Casi nada la resiste dos veces.

---

## 35. La fecha del local no es la fecha UTC

**Qué pasó (2026-09-20).** Implementando `GET /api/agent/orders/{numero}`,
filtré por el día así:

```ts
const hoy = new Date().toISOString().slice(0, 10)   // UTC
```

Pero el trigger que asigna el correlativo escribe el día **en horario del
local**:

```sql
d := (coalesce(new.created_at, now()) at time zone 'America/Argentina/Buenos_Aires')::date;
```

Entre las 21:00 y la medianoche de Argentina, UTC ya está en el día siguiente.
El endpoint habría buscado los pedidos de mañana y no habría encontrado
ninguno: el local en plena cena, y el agente diciéndole al cliente que su
pedido no existe. Lo mismo en el endpoint de comprobante, que había escrito
media hora antes con el mismo `toISOString()`.

Apareció porque el test sembraba un pedido "de ayer" y no se comportaba como
esperaba. Tirar del hilo llevó al trigger.

**Regla.** Cuando una fecha decide qué fila se ve, hay que preguntarse **quién
la escribió y en qué zona**. Si la base la calcula en una zona, el código que
la consulta tiene que usar la misma. `toISOString()` es UTC siempre, y en
Argentina eso son tres horas de desfase que caen justo en el horario de mayor
actividad de una hamburguesería.

**Corolario.** Quedó en `lib/server/dia-del-local.ts`, con el SQL del trigger
citado en el comentario: la próxima vez que alguien necesite "hoy" para
comparar contra `order_day`, el lugar correcto está a la vista y dice por qué.

**Y algo del seeding.** El trigger **pisa siempre** `order_day`. Sembrar un
pedido de ayer mandando `order_day` no hace nada; hay que mandarle el
`created_at`, que es de donde lo deriva.

---

## 36. Una decisión de diseño se sostiene con la medición, no con el argumento

**Qué pasó (2026-09-24).** Cuando hicimos el menú desplegable elegí que se
**superpusiera** al contenido en vez de correrlo, y lo defendí así: *"si
empujara, cada pasada del mouse reacomodaría la página entera"*. David lo
aprobó. Tres días después: *"necesito que hagas responsive todas las pantallas
cuando se agrande el navbar, no queda bien que se queden estáticas"*.

Mi primer impulso fue repetir el argumento de entonces. En cambio lo medí, y
**dos de mis tres razones eran falsas**:

- *"Va a desbordar a lo ancho"* — no: las tablas se achican de 1228 a 1044px y
  el desborde es 0.
- *"Va a quedar mal"* — no: con el reflow los nombres se leen enteros. Con la
  superposición se leía "osa 500ml" y "burguesa simple": el menú tapaba media
  columna de nombres, que es con la que se busca una fila.
- *"Se va a reacomodar en cada roce"* — **esta sí era cierta**: 0,768 de
  corrimiento acumulado en cinco pasadas del mouse.

Y la única cierta tenía un arreglo que no era volver atrás: **180ms de demora
al abrir**. Filtra el roce accidental y no se siente al ir a propósito.

**Regla.** Un argumento que convenció una vez no queda probado para siempre.
Cuando alguien cuestiona una decisión vieja, medirla de nuevo cuesta menos que
defenderla, y a veces la medición dice que el que la tomó estaba equivocado.

**Y el test tenía que darse vuelta.** Había uno que afirmaba *"abierto se
superpone: el contenido no se mueve"*. No se borra: se invierte y se le escribe
adentro por qué cambió, con los números. Un test es la decisión escrita en
código, y cuando la decisión cambia el test cuenta las dos.

---

## 37. En una pantalla nueva, el test se prueba rompiendo el código

**Qué pasó (2026-09-24).** La regla de la casa es correr cada test nuevo contra
el código viejo: si pasa en los dos, está probando otra cosa. Con el reporte de
costos no servía —es una pantalla que no existía, así que contra el código
viejo todo da 404 y cualquier test "falla"—.

Lo que sí sirvió: **romper a propósito** las reglas que el test dice cuidar y
ver si se entera.

- El margen calculado **sobre el costo** en vez de sobre el precio —el error
  clásico: 8000 de precio y 2000 de costo dan 300% en vez de 75%—. El test del
  margen falló.
- Sacar el filtro de productos activos. El test de "un inactivo no aparece"
  falló.

**Regla.** Cuando no hay versión vieja contra la cual comparar, la comparación
se fabrica: se elige qué regla cuida cada test, se rompe esa regla y se
confirma que falla. Un test que sigue verde con su regla rota no cuida nada.

## 38. Dos cosas que se mueven juntas, un solo estado que las gobierne

El menú se abría con un `useState` (con demora de 180 ms) y el contenido se
corría con CSS propio (`:has(aside:hover)`, `:has(aside:focus-within)`). En los
tests pasaba todo, porque cada test movía el mouse y nada más. David lo
encontró usándolo: eligió una sección, el foco quedó en el link, el mouse se
fue, el menú se cerró… y la tabla siguió corrida hasta el siguiente click.

**Regla.** Si dos elementos tienen que moverse juntos, los dos leen la misma
fuente —acá, `data-expandido` en el `<aside>`—. Dos condiciones "equivalentes"
escritas por separado (el hover del mouse y el estado de React) divergen en el
caso que no se probó. Y el test de una interacción tiene que incluir el click,
no solo el paso del mouse: es lo que el usuario hace después de abrir el menú.

## 39. Después de un `git stash`, el servidor de desarrollo puede seguir sirviendo lo viejo

**Qué pasó (2026-09-25).** Para probar que el escritorio no había cambiado,
guardé los cambios con `git stash`, saqué capturas de `main` en el mismo
`next dev` y los recuperé con `git stash pop`. Las capturas "después" que saqué
a continuación mostraban la columna de acciones sin fijar y las flechas de
reordenar chicas, como si el cambio no existiera. Los tests, corridos antes del
stash, decían lo contrario.

Turbopack había vuelto a leer los `.tsx`, pero no `globals.css`: servía la
versión de `main`, sin la variante `tactil` ni `.acciones-fijas`. Ni reiniciar
el servidor ni un `touch` al archivo lo arreglaron; hizo falta borrar
`.next/dev`. Y una recaptura de equipo hecha en ese estado había dado "igual a
main" por la razón equivocada.

**Regla.** Después de un stash, un checkout o cualquier cosa que cambie
archivos por fuera del editor, antes de medir se confirma que el servidor sirve
lo que está en disco: se busca en el CSS servido una clase que solo existe en
la versión nueva. Si no está, se borra `.next/dev` y se reinicia. Y toda
medición hecha en el intervalo se descarta y se repite, aunque haya dado bien.
Para comparar contra `main`, lo más limpio es otro checkout en otra carpeta, no
el mismo servidor.

## 40. Un recorrido que solo carga pantallas no ve lo que se abre desde ellas

**Qué pasó (2026-09-25).** El test del celular recorría las 29 rutas del panel
y daba cero fallas. David preguntó si faltaba alguna sección. Abriendo lo que
el recorrido no abría —pestañas, diálogos, la caja con un pedido— aparecieron
treinta controles chicos más y un error de flujo que existía antes del cambio:
en el celular, después de "Enviar a cocina", había que tocar dos veces el chip
del pedido para poder cobrarlo.

Y en esa misma ronda, un `afterAll` que falló a mitad de camino dejó borrada la
sesión de caja de la base local: la restauración estaba después de un paso que
tiró error.

**Regla.** "Recorrí todas las rutas" no es "revisé todas las pantallas": una
ruta es el estado inicial. Se lista qué se abre desde cada una y se recorre
también, haciendo lo que hace el usuario —tocar, enviar, volver—, no solo
mirando. Y lo que un test cambia en la base se devuelve en un `finally`: la
limpieza no puede depender de que todo lo anterior haya salido bien.
