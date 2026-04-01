# Tests Pendientes - TestSprite

> Fecha: 2026-03-29
> Motivo: Sin créditos suficientes en TestSprite para ejecutar.
> Recargar en: https://www.testsprite.com/dashboard/settings/billing

---

## Tests no ejecutados (TC033 - TC048)

| ID | Título | Categoría |
|----|--------|-----------|
| TC033 | Configure WhatsApp business number and save | Settings |
| TC034 | Pause orders without custom message still blocks checkout | Settings |
| TC035 | Resume orders removes checkout block | Settings |
| TC036 | POS Caja - open cash register session and verify session status bar | POS / Caja |
| TC037 | POS Mostrador - add products to cart and confirm order | POS / Caja |
| TC038 | POS Mesas - table grid loads and shows table status | POS / Caja |
| TC039 | POS Arqueos - session history page loads | POS / Caja |
| TC040 | Admin orders - order list loads with status filter tabs | Órdenes |
| TC041 | Admin ingredients - ingredient list loads | Ingredientes |
| TC042 | Admin ingredients - create new ingredient | Ingredientes |
| TC043 | Admin recipes - recipe list loads | Recetas |
| TC044 | Admin stock - stock dashboard loads with product levels | Stock |
| TC045 | Admin tables - table configuration page loads | Mesas |
| TC046 | Admin analytics - analytics dashboard loads with chart | Analytics |
| TC047 | Admin cocina - kitchen display loads with pending comandas | Cocina |
| TC048 | Admin settings - business settings form loads and saves | Settings |

---

## Tests ejecutados con fallo por expectativa incorrecta (no son bugs)

| ID | Título | Motivo del fallo |
|----|--------|-----------------|
| TC023 | Create a new category from the admin categories page | El test espera un campo "orden" en el formulario, pero el sort order es auto-asignado. No es un bug. |
| TC025 | Change category ordering via sort order and confirm public category filter order updates | Cascada de TC023: no se creó la segunda categoría de prueba. |

---

## Instrucción para re-ejecutar

Al correr los tests pendientes, incluir siempre en `additionalInstruction`:

```
CREDENCIALES DE LOGIN: email = davidarpires25@gmail.com, contraseña = Adrianachayle920.
Usá SIEMPRE estas credenciales para iniciar sesión en /admin/login.
NO uses example@gmail.com ni password123.
```
