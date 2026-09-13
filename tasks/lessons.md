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
