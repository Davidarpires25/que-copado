# Tasks

Todo contra el stack local; el tema se fija con
`localStorage['admin-theme']` antes de cargar cada página.

## 1. El test primero

- [x] 1.1 En `e2e/admin-accesible.spec.ts`, activar `color-contrast` y correr
      el recorrido de axe en tema claro y oscuro (390 táctil y 1280 mouse).
      Verifica: contra el código de hoy falla con `color-contrast` en los dos
      temas.
- [x] 1.2 Capturas "antes" de Dashboard, Productos, Stock, Caja y Analytics a
      1280px en los dos temas, para comparar al final. Verifica: las capturas
      guardadas.

## 2. Tokens

- [x] 2.1 `--admin-text-faint`: `#637185` en claro, `#7C8BA3` en oscuro
      (Decisión 1). Verifica: axe deja de reportar el gris terciario; cálculo
      de contraste contra cada fondo de su tema ≥ 4,5.

## 3. Usos

- [x] 3.1 `text-[var(--admin-text-muted)]/NN` → `text-[var(--admin-text-faint)]`
      en `app/admin` y `components/admin` (Decisión 2). Verifica:
      `grep -rn "admin-text-muted)\]/[0-9]"` sin resultados en `text-`.
- [x] 3.2 Selector de período con `text-black` (Decisión 3). Verifica: axe sin
      fallas en Analytics en claro.
- [x] 3.3 Los sueltos de la Decisión 4 y lo que reporte axe después de 2 y 3.
      Verifica: el recorrido de 1.1 pasa en los dos temas.

## 4. Cierre

- [x] 4.1 Capturas "después" de las mismas pantallas en los dos temas, lado a
      lado con las de 1.2, mostradas a David. Verifica: las capturas y su
      respuesta.
- [x] 4.2 `npm run lint`, `npm run build` y la suite completa. Verifica: salida
      de los tres.
- [x] 4.3 Después de archivar: el propósito de `openspec/specs/panel-accesible`
      deja de decir que el contraste queda fuera; actualizar la memoria
      `light-theme-contrast-debt` (el acento en claro ya estaba corregido).
      Verifica: los dos textos.

## Notas de implementación

- 4.1: David vio las capturas de antes y después (Productos, Stock, Dashboard,
  claro y oscuro) y pidió verificar y subir.
- 3.3, además de lo previsto: "N permisos" sobre la tarjeta de rol elegida no
  cumplía en oscuro (tinte amarillo `#33332E`) y pasa a secundario; el slug de
  categoría nueva perdió la opacidad que lo atenuaba (cursor-not-allowed y el
  placeholder ya dicen que no se edita). Los 8 `muted/30–50` restantes son
  íconos decorativos y quedan.
- Otra vez CSS viejo servido tras editar `globals.css` (lección 39): la primera
  medición después de cambiar el token midió los valores anteriores. Se
  detectó comparando el CSS servido y se repitió con `.next/dev` limpio.
- Suite completa 105 de 105, lint sin errores, build OK.
