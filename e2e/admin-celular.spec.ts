import { test, expect, type Page } from '@playwright/test'
import { asegurarUsuario, rest, SUPABASE, SERVICE } from './local'
import { CELULAR, resolverRutas, entrar, abrir, medir, paginaTactil } from './panel'

/**
 * El panel en un celular: 390x844, el ancho de un telefono comun.
 *
 * El panel se diseño en la computadora del local y se probaba solo ahi. En el
 * celular, el formulario de producto tenia el campo "Nombre" de 26px, las
 * tablas escondian la columna para editar y habia 298 controles de menos de
 * 44px. Nada de eso se ve desde un escritorio.
 *
 * Las rutas salen de las carpetas y no de una lista escrita a mano: una
 * pantalla nueva entra sola al recorrido, igual que la regla de impresion es
 * `endsWith('/print')` y no una lista.
 */

/**
 * Los recorridos corren en dos anchos. 390 es un iPhone comun; 360, el Android
 * mas comun, y el que mas aprieta: lo que entra justo a 390 se sale a 360.
 */
const ANCHOS = [390, 360]
const ESCRITORIO = { width: 1280, height: 800 }

test.setTimeout(240_000)
test.beforeAll(asegurarUsuario)

// ─── Mediciones ─────────────────────────────────────────────────────────────

/**
 * Controles cuya area de toque no llega a 44x44 (WCAG 2.2, 2.5.5).
 *
 * No mide el rectangulo del elemento: mide donde responde. Desde el centro
 * de cada control se prueban ocho puntos del borde de un cuadrado de 44 con
 * `elementFromPoint`, y
 * cada uno tiene que caer en el control (o en algo suyo). Asi cuenta el area
 * agrandada con un pseudo-elemento, y tambien falla si la tapa un vecino.
 */
function controlesChicos(page: Page, raiz?: string) {
  return page.evaluate((raiz) => {
    const SELECTOR = [
      'button', 'a[href]', 'select', 'textarea',
      'input:not([type=hidden])',
      '[role=button]', '[role=checkbox]', '[role=switch]', '[role=combobox]',
      '[role=tab]', '[role=radio]', '[role=menuitem]', '[role=option]',
    ].join(',')

    const exceptuado = (el: Element) =>
      // WCAG 2.5.5 exceptua los links dentro de un texto corrido.
      (el.tagName === 'A' && el.closest('p, li > span') !== null && el.closest('nav') === null) ||
      // El mapa de zonas: dibujar con el dedo quedo fuera de alcance.
      el.closest('.leaflet-container') !== null ||
      // El link "Saltar al contenido" solo existe con el foco del teclado.
      el.classList.contains('sr-only') ||
      // Deshabilitado no recibe el toque (pointer-events: none): no es un
      // area de toque hasta que se habilita, y ahi se mide.
      el.matches(':disabled, [aria-disabled="true"]') ||
      el.closest('[aria-hidden="true"]') !== null

    const visible = (el: Element) => {
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      if (s.visibility === 'hidden' || s.display === 'none' || r.width <= 1 || r.height <= 1) return false
      // Un panel plegado con opacidad 0 (y max-h-0) no se ve ni se toca, aunque
      // su contenido conserve el tamaño.
      for (let p: Element | null = el; p; p = p.parentElement) if (getComputedStyle(p).opacity === '0') return false
      return true
    }

    const responde = (el: Element, hit: Element | null) => {
      if (!hit) return false
      if (el === hit || el.contains(hit)) return true
      // Un <label> que envuelve o apunta al control lo activa.
      const label = hit.closest('label') as HTMLLabelElement | null
      return !!label && (label.control === el || label.contains(el))
    }

    // Con un dialogo o el menu abiertos se mide solo adentro: lo de atras
    // queda bajo el fondo oscuro y no se puede tocar.
    const base: ParentNode = raiz
      ? Array.from(document.querySelectorAll(raiz)).filter(visible).pop() ?? document
      : document

    const fallas: string[] = []
    const vistos = new Set<Element>()
    // Tambien lo que se toca sin ser un control: un <div onClick> no aparece
    // en el selector, pero con cursor de mano se ofrece para tocar igual. Se
    // toma el de mas afuera, para no contar cada hijo de una tarjeta.
    const clickeables = Array.from(base.querySelectorAll('div, span, li, tr, p, img, svg, label'))
      .filter((el) => getComputedStyle(el).cursor === 'pointer'
        && (!el.parentElement || getComputedStyle(el.parentElement).cursor !== 'pointer')
        && !el.closest(SELECTOR))
    for (const el of [...Array.from(base.querySelectorAll(SELECTOR)), ...clickeables]) {
      if (vistos.has(el) || !visible(el) || exceptuado(el)) continue
      // Un control dentro de otro (un icono con role=button en un link) se
      // mide como uno solo: el de afuera.
      const padre = el.parentElement?.closest(SELECTOR)
      if (padre && visible(padre)) continue
      vistos.add(el)

      // Al centro y no a la orilla: en una tabla que se desliza, la orilla
      // derecha es donde esta la columna fija de acciones, que la taparia. Un
      // usuario desliza hasta ver el control entero; esto hace lo mismo.
      el.scrollIntoView({ block: 'center', inline: 'center' })
      // Si igual queda bajo la columna fija de acciones (a 360 pasa), se desliza
      // la tabla hasta dejarlo a su izquierda, que es lo que haria el usuario.
      const fija = el.closest('tr')?.querySelector('.acciones-fijas')
      if (fija && !fija.contains(el)) {
        // Cuenta el area de toque (22px desde el centro), no el borde del icono.
        const rr = el.getBoundingClientRect()
        const solapa = Math.max(rr.right, rr.left + rr.width / 2 + 22) - fija.getBoundingClientRect().left
        let caja = el.parentElement
        while (caja && !(caja.scrollWidth > caja.clientWidth && getComputedStyle(caja).overflowX !== 'visible')) caja = caja.parentElement
        if (caja && solapa > 0) caja.scrollLeft += solapa + 2
      }
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const W = window.innerWidth
      const H = window.innerHeight
      // Los cuatro bordes a 21px y las diagonales a 15: Chromium no cuenta las
      // esquinas redondeadas como zona de toque, y un circulo de 44 llega a
      // 15px en diagonal (15·√2 ≈ 21). WCAG mide la caja, no la curva.
      const puntos = [[0, -21], [-21, 0], [21, 0], [0, 21], [-15, -15], [15, -15], [-15, 15], [15, 15]]
      const malos = puntos.filter(([dx, dy]) => {
        const x = cx + dx
        const y = cy + dy
        // Fuera de la pantalla no se puede tocar: no cuenta ni a favor ni en contra.
        if (x < 0 || y < 0 || x >= W || y >= H) return false
        return !responde(el, document.elementFromPoint(x, y))
      })
      if (malos.length) {
        const nombre = el.getAttribute('aria-label') ?? (el as HTMLElement).innerText?.trim().replace(/\s+/g, ' ').slice(0, 30) ?? ''
        fallas.push(`${el.tagName.toLowerCase()} "${nombre}" ${Math.round(r.width)}x${Math.round(r.height)}`)
      }
    }
    return fallas
  }, raiz)
}

const desborde = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

const dentroDeLaVentana = async (page: Page, sel: ReturnType<Page['locator']>) => {
  const b = await sel.boundingBox()
  const w = page.viewportSize()!.width
  return !!b && b.x >= 0 && b.x + b.width <= w + 0.5
}

// ─── Recorridos ─────────────────────────────────────────────────────────────

for (const ancho of ANCHOS) {
  test(`ninguna pantalla del panel desborda a lo ancho a ${ancho}px`, async ({ page }) => {
    const { rutas, sinDatos } = await resolverRutas()
    for (const s of sinDatos) test.info().annotations.push({ type: 'sin datos', description: s })

    await page.setViewportSize({ width: ancho, height: 800 })
    await entrar(page)

    const desbordan: string[] = []
    for (const ruta of rutas) {
      await abrir(page, ruta)
      const px = await medir(page, () => desborde(page))
      if (px > 0) desbordan.push(`${ruta} +${px}px`)
    }
    expect(desbordan).toEqual([])
  })
}

for (const ancho of ANCHOS) {
  test(`todo control del panel responde en 44x44 con el dedo a ${ancho}px`, async ({ browser }) => {
    const { rutas } = await resolverRutas()
    const { ctx, page } = await paginaTactil(browser, ancho)
    await entrar(page)

    const chicos: string[] = []
    for (const ruta of rutas) {
      await abrir(page, ruta)
      for (const f of await medir(page, () => controlesChicos(page))) chicos.push(`${ruta}: ${f}`)
    }
    await ctx.close()
    expect(chicos, `${chicos.length} controles por debajo de 44x44`).toEqual([])
  })
}

/**
 * Safari de iPhone hace zoom sobre un campo cuya letra mide menos de 16px al
 * tocarlo, y no lo deshace al salir: la pantalla queda agrandada y corrida.
 * No hay WebKit en la maquina de pruebas, pero la regla depende solo del
 * tamaño de letra, y eso se mide igual en Chromium.
 */
function camposQueHacenZoom(page: Page) {
  return page.evaluate(() => {
    const NO_TEXTO = ['checkbox', 'radio', 'range', 'hidden', 'button', 'submit', 'color', 'file']
    return Array.from(document.querySelectorAll('input, textarea, select'))
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const s = getComputedStyle(el)
        if (r.width <= 1 || r.height <= 1 || s.visibility === 'hidden' || s.display === 'none') return false
        if (el instanceof HTMLInputElement && NO_TEXTO.includes(el.type)) return false
        return parseFloat(s.fontSize) < 16
      })
      .map((el) => `${el.tagName.toLowerCase()}[${(el as HTMLInputElement).name || el.getAttribute('placeholder') || el.getAttribute('aria-label') || ''}] ${getComputedStyle(el).fontSize}`)
  })
}

test('ningun campo del panel hace zoom en iPhone', async ({ browser }) => {
  const { rutas } = await resolverRutas()
  const { ctx, page } = await paginaTactil(browser)
  await entrar(page)
  const zoom: string[] = []
  for (const ruta of rutas) {
    await abrir(page, ruta)
    for (const c of await medir(page, () => camposQueHacenZoom(page))) zoom.push(`${ruta}: ${c}`)
  }
  await ctx.close()
  expect(zoom, `${zoom.length} campos con letra de menos de 16px`).toEqual([])
})

/**
 * Controles cuyo texto es mas ancho que su propia caja: se sale y se monta
 * sobre el vecino.
 *
 * Paso con las pestañas de Configuracion: `tactil:min-w-11` le cambia a un
 * item flex el piso de `min-width: auto` (el ancho de su texto) por 44px, y en
 * una fila que no entra "Apariencia" se comprimia hasta tocar a "Datos". Lo
 * que se recorta a proposito —con puntos suspensivos u overflow oculto— no
 * cuenta.
 */
function textoFueraDelControl(page: Page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('button, a[href], [role=tab]'))
    .filter((el) => {
      const s = getComputedStyle(el)
      const b = el.getBoundingClientRect()
      return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 1
        && s.textOverflow !== 'ellipsis' && s.overflowX === 'visible'
        && el.scrollWidth > el.clientWidth + 1 && (el as HTMLElement).innerText.trim() !== ''
    })
    .map((el) => `"${(el as HTMLElement).innerText.trim().replace(/\s+/g, ' ').slice(0, 30)}" caja ${el.clientWidth}px, texto ${el.scrollWidth}px`))
}

for (const ancho of ANCHOS) {
  test(`ningun texto se sale de su boton o pestaña a ${ancho}px`, async ({ browser }) => {
    const { rutas } = await resolverRutas()
    const { ctx, page } = await paginaTactil(browser, ancho)
    await entrar(page)
    const fuera: string[] = []
    for (const ruta of rutas) {
      await abrir(page, ruta)
      for (const f of await medir(page, () => textoFueraDelControl(page))) fuera.push(`${ruta}: ${f}`)
    }
    await ctx.close()
    expect(fuera).toEqual([])
  })
}

// ─── Formularios ────────────────────────────────────────────────────────────

test('un producto se crea desde el celular', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  await entrar(page)
  await abrir(page, '/admin/products/new')

  const nombre = page.locator('input[name="name"]')
  const ancho = (await nombre.boundingBox())?.width ?? 0
  expect(ancho, 'el campo nombre ocupa el ancho del formulario').toBeGreaterThanOrEqual(250)
  expect(await dentroDeLaVentana(page, page.getByRole('button', { name: 'Guardar Producto' }))).toBe(true)
})

test('en la computadora el formulario de producto sigue en dos columnas', async ({ page }) => {
  await page.setViewportSize(ESCRITORIO)
  await entrar(page)
  await abrir(page, '/admin/products/new')

  const izquierda = await page.getByRole('heading', { name: 'Información del Producto' }).boundingBox()
  const derecha = await page.getByRole('heading', { name: 'Configuración' }).boundingBox()
  expect(Math.abs(izquierda!.y - derecha!.y), 'las dos columnas arrancan a la misma altura').toBeLessThan(4)
  expect(derecha!.x).toBeGreaterThan(izquierda!.x + 300)

  // Con mouse los controles no cambian de tamaño: el boton por defecto mide 36.
  const cancelar = await page.getByRole('button', { name: 'Cancelar' }).boundingBox()
  expect(Math.round(cancelar!.height)).toBe(36)
})

// ─── Tablas ─────────────────────────────────────────────────────────────────

for (const ruta of ['/admin/products', '/admin/recipes', '/admin/ingredients', '/admin/stock', '/admin/empleados']) {
  test(`la accion de la primera fila se ve sin deslizar: ${ruta}`, async ({ page }) => {
    await page.setViewportSize(CELULAR)
    await entrar(page)
    await abrir(page, ruta)

    const accion = page.locator('table tbody tr').first().locator('td').last().locator('button, a').first()
    await expect(accion).toBeVisible()
    expect(await dentroDeLaVentana(page, accion)).toBe(true)

    // Ningun encabezado se sale de su celda y se monta sobre el vecino.
    const pisados = await page.locator('table thead th').evaluateAll((ths) =>
      ths.filter((th) => th.scrollWidth > th.clientWidth + 1).map((th) => th.textContent?.trim())
    )
    expect(pisados).toEqual([])
  })
}

test('en el reporte de costos, los numeros se ven sin deslizar', async ({ page }) => {
  // Es lo que el reporte existe para mostrar. Con categoria y tipo como
  // columnas, en el celular solo se veian los nombres: costo, precio y margen
  // quedaban afuera, sin nada que avisara que habia que deslizar.
  await page.setViewportSize(CELULAR)
  await entrar(page)
  await abrir(page, '/admin/reportes/costos')
  for (const col of ['Costo', 'Precio', 'Margen']) {
    const th = page.locator('table thead th').filter({ hasText: new RegExp(`^${col}`, 'i') })
    expect(await dentroDeLaVentana(page, th), `${col} a la vista`).toBe(true)
  }
})

// ─── Barra superior ─────────────────────────────────────────────────────────

const barra = (page: Page) => page.locator('header').first()

/** El menu lateral del celular, abierto: un dialogo que se llama "Menú". */
const menuAbierto = (page: Page) => page.getByRole('dialog', { name: 'Menú' })

/** Abre el menu desde la barra; si el boton no existe falla en segundos, no al timeout del test. */
async function abrirMenu(page: Page) {
  const boton = barra(page).getByRole('button', { name: 'Abrir menú' })
  await expect(boton).toBeVisible()
  await boton.click()
}

test('la barra superior dice en que seccion se esta', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  await entrar(page)
  await abrir(page, '/admin/products/new')

  await expect(barra(page)).toContainText('Productos')
  await expect(barra(page).getByRole('button', { name: 'Abrir menú' })).toBeVisible()
  // El logo del local va en el menu; en la barra no hay un icono haciendo de logo.
  await expect(barra(page)).not.toContainText('Que Copado')
})

test.describe('la campana de alertas de stock', () => {
  const INSUMO = 'e0000000-0000-0000-0000-000000000001'
  let original: { current_stock: number; min_stock: number | null; stock_tracking_enabled: boolean }

  test.beforeAll(async () => {
    ;[original] = await rest(`ingredients?id=eq.${INSUMO}&select=current_stock,min_stock,stock_tracking_enabled`)
  })
  test.afterAll(async () => {
    await rest(`ingredients?id=eq.${INSUMO}`, { method: 'PATCH', body: JSON.stringify(original) })
  })

  test('con un insumo bajo el minimo aparece y lleva a stock', async ({ page }) => {
    await rest(`ingredients?id=eq.${INSUMO}`, {
      method: 'PATCH',
      body: JSON.stringify({ current_stock: 1, min_stock: 10, stock_tracking_enabled: true }),
    })
    await page.setViewportSize(CELULAR)
    await entrar(page)
    await abrir(page, '/admin/products')

    const campana = barra(page).getByRole('link', { name: /alertas? de stock/i })
    await expect(campana).toBeVisible()
    await expect(campana).toHaveAttribute('href', '/admin/stock')

    // La misma cuenta que el menu muestra junto a "Stock".
    const enLaCampana = (await campana.innerText()).trim()
    await abrirMenu(page)
    const enElMenu = await menuAbierto(page).getByRole('link', { name: /Stock/ }).innerText()
    expect(enElMenu).toContain(enLaCampana)
  })

  test('sin alertas no aparece', async ({ page }) => {
    // Sin alertas se decide por el mismo numero que usa el menu: si el menu no
    // muestra cuenta junto a Stock, la barra no muestra campana.
    await rest(`ingredients?id=eq.${INSUMO}`, { method: 'PATCH', body: JSON.stringify(original) })
    await page.setViewportSize(CELULAR)
    await entrar(page)
    await abrir(page, '/admin/products')

    await abrirMenu(page)
    const enElMenu = (await menuAbierto(page).getByRole('link', { name: /Stock/ }).innerText()).replace(/\D/g, '')
    const campanas = await barra(page).getByRole('link', { name: /alertas? de stock/i }).count()
    expect(campanas).toBe(enElMenu ? 1 : 0)
  })

  test('un rol que no ve stock no tiene campana', async ({ page }) => {
    await rest(`ingredients?id=eq.${INSUMO}`, {
      method: 'PATCH',
      body: JSON.stringify({ current_stock: 1, min_stock: 10, stock_tracking_enabled: true }),
    })
    const cocina = await asegurarUsuarioConRol('cocina@local.test', 'cocina')
    await page.setViewportSize(CELULAR)
    await entrar(page, cocina)
    await abrir(page, '/admin/cocina')

    await expect(barra(page).getByRole('button', { name: 'Abrir menú' })).toBeVisible()
    await expect(barra(page).getByRole('link', { name: /alertas? de stock/i })).toHaveCount(0)
  })
})

/** Un usuario del local con el rol pedido, exista o no de antes. */
async function asegurarUsuarioConRol(email: string, rol: string) {
  const cab = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }
  const password = 'prueba1234'
  const lista = await fetch(`${SUPABASE}/auth/v1/admin/users`, { headers: cab }).then((r) => r.json())
  let u = (lista.users ?? []).find((x: { email?: string }) => x.email === email)
  if (!u) {
    u = await fetch(`${SUPABASE}/auth/v1/admin/users`, {
      method: 'POST', headers: cab, body: JSON.stringify({ email, password, email_confirm: true }),
    }).then((r) => r.json())
  } else {
    // La clave se repone siempre: el caso de "Nueva clave" le genera otra.
    await fetch(`${SUPABASE}/auth/v1/admin/users/${u.id}`, {
      method: 'PUT', headers: cab, body: JSON.stringify({ password, email_confirm: true }),
    })
  }
  await rest('profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ id: u.id, full_name: 'Cocina de Prueba', role: rol, is_active: true }),
  })
  return { email, password }
}

// ─── Caja ───────────────────────────────────────────────────────────────────

test.describe('la caja en el celular', () => {
  // Las sesiones abiertas que habia se guardan y se devuelven: el test no deja
  // la caja del local distinta de como la encontro.
  let previas: Record<string, unknown>[] = []

  test.beforeAll(async () => {
    previas = await rest('cash_register_sessions?status=eq.open&select=*')
  })
  test.afterAll(async () => {
    await rest('cash_register_sessions?status=eq.open', { method: 'DELETE' })
    if (previas.length) await rest('cash_register_sessions', { method: 'POST', body: JSON.stringify(previas) })
  })

  const abrirTurno = async () => {
    await rest('cash_register_sessions?status=eq.open', { method: 'DELETE' })
    const [perfil] = await rest('profiles?select=id&role=eq.admin&limit=1')
    await rest('cash_register_sessions', {
      method: 'POST',
      body: JSON.stringify({ opened_by: perfil.id, opening_balance: 0, status: 'open' }),
    })
  }

  test('sin turno hay un solo boton de menu, y se abre con el dedo', async ({ browser }) => {
    // El recorrido tactil pasa por la caja con el turno que haya en la base:
    // la pantalla de abrir turno se mide aca.
    await rest('cash_register_sessions?status=eq.open', { method: 'DELETE' })
    const { ctx, page } = await paginaTactil(browser)
    await entrar(page)
    await abrir(page, '/admin/caja')
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toHaveCount(1)
    expect(await controlesChicos(page)).toEqual([])
    await ctx.close()
  })

  test('con turno: una barra, y cerrar caja, vendido y en caja a la vista', async ({ page }) => {
    await abrirTurno()
    await page.setViewportSize(CELULAR)
    await entrar(page)
    await abrir(page, '/admin/caja')

    await expect(page.getByRole('button', { name: 'Abrir menú' })).toHaveCount(1)
    expect(await dentroDeLaVentana(page, page.getByRole('button', { name: /Cerrar caja/i }))).toBe(true)
    expect(await dentroDeLaVentana(page, page.getByText('Vendido', { exact: true }))).toBe(true)
    expect(await dentroDeLaVentana(page, page.getByText('En caja', { exact: true }))).toBe(true)
  })

  test('en la computadora la barra del turno es un renglon con los mismos textos', async ({ page }) => {
    await abrirTurno()
    await page.setViewportSize(ESCRITORIO)
    await entrar(page)
    await abrir(page, '/admin/caja')

    const barraTurno = page.getByText('Caja abierta', { exact: true }).locator('xpath=ancestor::div[contains(@class,"h-[52px]")]')
    await expect(barraTurno).toHaveCount(1)
    for (const t of ['Caja abierta', 'Vendido', 'En caja', 'Movimiento de Caja', 'Cerrar Caja']) {
      await expect(barraTurno).toContainText(t)
    }
    expect(Math.round((await barraTurno.boundingBox())!.height)).toBe(52)
  })
})

// ─── La tienda no cambia ────────────────────────────────────────────────────

test('la tienda mide lo mismo con el dedo que con el mouse', async ({ browser }) => {
  const alturas = async (tactil: boolean) => {
    const ctx = await browser.newContext({ viewport: CELULAR, hasTouch: tactil, isMobile: tactil })
    const page = await ctx.newPage()
    // Con el dedo tambien se entra antes al panel: la tienda no puede heredar
    // nada del paso por ahi.
    if (tactil) { await entrar(page); await abrir(page, '/admin/products') }
    await abrir(page, '/')
    const h = await page.locator('button, input').evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().height)).filter((x) => x > 0)
    )
    await ctx.close()
    return h
  }
  const conMouse = await alturas(false)
  const conDedo = await alturas(true)
  expect(conDedo.length).toBeGreaterThan(0)
  expect(conDedo).toEqual(conMouse)
})

// ─── Lo que se abre desde cada pantalla ─────────────────────────────────────
//
// El recorrido mide cada ruta como carga: la primera pestaña, sin dialogos,
// con lo que haya en la base. Lo de abajo abre el resto —pestañas, dialogos,
// la caja con un pedido— y lo mide igual, con el dedo.

/** Desborde y 44x44 en lo que esta a la vista ahora; las fallas se juntan. */
async function revisar(page: Page, donde: string, fallas: string[], raiz?: string) {
  await page.waitForTimeout(500)
  // Las notificaciones salen arriba y tapan la barra un par de segundos: se
  // mide cuando ya se fueron.
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 8_000 }).catch(() => {})
  const px = await medir(page, () => desborde(page))
  if (px > 0) fallas.push(`${donde}: desborda +${px}px`)
  for (const f of await medir(page, () => controlesChicos(page, raiz))) fallas.push(`${donde}: ${f}`)
  for (const c of await medir(page, () => camposQueHacenZoom(page))) fallas.push(`${donde}: zoom en iPhone: ${c}`)
}

const DIALOGO = '[role="dialog"], [role="alertdialog"]'

test('el login se usa con el dedo', async ({ browser }) => {
  const { ctx, page } = await paginaTactil(browser)
  const fallas: string[] = []
  await abrir(page, '/admin/login')
  await revisar(page, 'login', fallas)
  await ctx.close()
  expect(fallas).toEqual([])
})

test('el menu lateral abierto se usa con el dedo', async ({ browser }) => {
  const { ctx, page } = await paginaTactil(browser)
  const fallas: string[] = []
  await entrar(page)
  await abrir(page, '/admin/dashboard')
  await abrirMenu(page)
  await revisar(page, 'menu lateral', fallas, DIALOGO)
  await ctx.close()
  expect(fallas).toEqual([])
})

test('las pestañas secundarias se usan con el dedo', async ({ browser }) => {
  const [producto] = await rest('products?select=id&limit=1')
  const PESTAÑAS: [string, string[]][] = [
    ['/admin/stock', ['Alertas', 'Movimientos', 'Consumo Histórico']],
    ['/admin/settings', ['Pausa', 'Cobros', 'Stock', 'Apariencia']],
    ['/admin/empleados', ['Roles']],
    ['/admin/reportes/costos', ['Insumos']],
    [`/admin/stock/ficha/${producto.id}`, ['Lista de compras']],
  ]
  const { ctx, page } = await paginaTactil(browser)
  const fallas: string[] = []
  await entrar(page)
  for (const [ruta, pestañas] of PESTAÑAS) {
    await abrir(page, ruta)
    for (const p of pestañas) {
      const boton = page.locator('main').getByRole('button', { name: new RegExp(`^${p}`) }).first()
      await expect(boton, `${ruta} › ${p}`).toBeVisible()
      await boton.click()
      await revisar(page, `${ruta} › ${p}`, fallas)
    }
  }
  await ctx.close()
  expect(fallas).toEqual([])
})

test('los dialogos se usan con el dedo', async ({ browser }) => {
  // Cada uno se abre, se mide y se cierra sin guardar.
  const DIALOGOS: [string, string, (page: Page) => Promise<void>][] = [
    ['/admin/stock', 'ajuste de stock', (p) => p.locator('table tbody tr').first().locator('td.acciones-fijas button').first().click()],
    ['/admin/stock', 'planilla', (p) => p.getByRole('button', { name: 'Planilla' }).click()],
    ['/admin/tables', 'alta de mesa', (p) => p.getByRole('button', { name: 'Agregar Mesa' }).click()],
    ['/admin/delivery-zones', 'nueva zona', (p) => p.getByRole('button', { name: 'Nueva Zona' }).click()],
    ['/admin/ingredients', 'actualizar precios', (p) => p.getByRole('button', { name: 'Actualizar precios' }).click()],
    ['/admin/ingredients', 'categorias de insumos', (p) => p.getByRole('button', { name: 'Gestionar categorias' }).click()],
    ['/admin/categories', 'confirmar borrado', (p) => p.locator('table tbody tr').first().locator('td').last().locator('button').last().click()],
  ]
  const { ctx, page } = await paginaTactil(browser)
  const fallas: string[] = []
  await entrar(page)
  for (const [ruta, nombre, abrirDialogo] of DIALOGOS) {
    await abrir(page, ruta)
    await abrirDialogo(page)
    await expect(page.locator(DIALOGO).last(), nombre).toBeVisible()
    await revisar(page, `${ruta} › ${nombre}`, fallas, DIALOGO)
    await page.keyboard.press('Escape')
  }
  await ctx.close()
  expect(fallas).toEqual([])
})

test.describe('la caja con un pedido en curso', () => {
  // Una venta de mostrador de prueba en el local: deja un pedido abierto y su
  // comanda para medir Pedidos, Cocina y Dashboard con datos. No se cobra, asi
  // que no toca stock; al final se borra todo lo que creo, y la sesion de caja
  // vuelve a ser la que habia.
  let previas: Record<string, unknown>[] = []
  let sesion = ''

  test.beforeAll(async () => {
    previas = await rest('cash_register_sessions?status=eq.open&select=*')
    await rest('cash_register_sessions?status=eq.open', { method: 'DELETE' })
    const [perfil] = await rest('profiles?select=id&role=eq.admin&limit=1')
    ;[{ id: sesion }] = await rest('cash_register_sessions', {
      method: 'POST',
      body: JSON.stringify({ opened_by: perfil.id, opening_balance: 0, status: 'open' }),
    })
  })

  test.afterAll(async () => {
    // La sesion de antes se devuelve pase lo que pase: si un borrado falla, la
    // caja del local no puede quedar distinta de como estaba.
    try {
      const pedidos: { id: string }[] = await rest(`orders?cash_register_session_id=eq.${sesion}&select=id`)
      for (const { id } of pedidos) {
        const comandas: { id: string }[] = await rest(`comandas?order_id=eq.${id}&select=id`)
        for (const c of comandas) await rest(`comanda_items?comanda_id=eq.${c.id}`, { method: 'DELETE' })
        await rest(`comandas?order_id=eq.${id}`, { method: 'DELETE' })
        await rest(`print_jobs?data->>orderId=eq.${id}`, { method: 'DELETE' })
        await rest(`order_items?order_id=eq.${id}`, { method: 'DELETE' })
        await rest(`orders?id=eq.${id}`, { method: 'DELETE' })
      }
      const quedan = await rest(`orders?cash_register_session_id=eq.${sesion}&select=id`)
      expect(quedan, 'la base local queda sin los pedidos de prueba').toEqual([])
    } finally {
      await rest(`cash_register_sessions?id=eq.${sesion}`, { method: 'DELETE' })
      if (previas.length) await rest('cash_register_sessions', { method: 'POST', body: JSON.stringify(previas) })
    }
  })

  test('pestañas, pedido, cobro, movimiento y cierre; despues las pantallas con datos', async ({ browser }) => {
    const { ctx, page } = await paginaTactil(browser)
    const fallas: string[] = []
    await entrar(page)
    await abrir(page, '/admin/caja')

    const tocar = async (l: ReturnType<Page['locator']>) => { await expect(l).toBeVisible(); await l.click() }

    for (const p of ['Mesas', 'Historial']) {
      await tocar(page.getByRole('button', { name: p, exact: true }))
      await revisar(page, `caja › ${p}`, fallas)
    }
    await tocar(page.getByRole('button', { name: 'Mostrador', exact: true }))

    // El pedido, desde el boton flotante.
    await tocar(page.getByText('Hamburguesa simple').first())
    await tocar(page.getByRole('button', { name: /productos ·/ }))
    await expect(page.getByRole('dialog', { name: 'Venta mostrador' })).toBeVisible()
    await revisar(page, 'caja › pedido', fallas, DIALOGO)

    // Ese boton manda el pedido a cocina y la hoja pasa al cobro, sin cerrarse.
    // Antes se cerraba y el primer toque en el chip de Pendientes solo lo
    // deseleccionaba: habia que tocarlo dos veces para cobrar.
    await tocar(page.getByRole('dialog').getByRole('button', { name: /^(Cobrar|Enviar a cocina)/ }))
    const cobro = page.getByRole('dialog', { name: /^Cobrar / })
    await expect(cobro).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(1_500)
    await expect(cobro, 'la hoja de cobro sigue abierta').toBeVisible()
    await revisar(page, 'caja › cobro', fallas, DIALOGO)
    await page.keyboard.press('Escape')
    await expect(cobro).toHaveCount(0)
    await tocar(page.getByRole('button', { name: /^#\d+/ }).first())
    await expect(cobro, 'un toque en el chip de Pendientes abre el cobro').toBeVisible()
    await page.keyboard.press('Escape')

    await tocar(page.getByRole('button', { name: 'Movimiento', exact: true }))
    await expect(page.locator(DIALOGO).last()).toBeVisible()
    await revisar(page, 'caja › movimiento', fallas, DIALOGO)
    await page.keyboard.press('Escape')

    // La pantalla de cierre: se mide y se vuelve, sin confirmar.
    await tocar(page.getByRole('button', { name: 'Cerrar caja' }))
    await expect(page.getByRole('button', { name: /Volver al POS/ })).toBeVisible()
    await revisar(page, 'caja › cierre', fallas)
    await page.getByRole('button', { name: /Volver al POS/ }).click()

    // Las pantallas que en la base local estaban vacias, ahora con un pedido.
    for (const ruta of ['/admin/orders', '/admin/cocina', '/admin/dashboard']) {
      await abrir(page, ruta)
      await revisar(page, `${ruta} con datos`, fallas)
    }
    await expect(page.getByText(/Hamburguesa simple/).first(), 'cocina muestra la comanda').toBeVisible()

    await ctx.close()
    expect(fallas).toEqual([])
  })
})

// ─── Segunda pasada: con datos cargados ─────────────────────────────────────

test('los formularios cargados se usan con el dedo', async ({ browser }) => {
  const [receta] = await rest('recipes?select=id&limit=1')
  const { ctx, page } = await paginaTactil(browser)
  const fallas: string[] = []
  const tocar = async (l: ReturnType<Page['locator']>) => { await expect(l).toBeVisible(); await l.click() }
  await entrar(page)

  await abrir(page, '/admin/products/new')
  for (const tipo of [/^Combo/, /^Mitad y Mitad/]) {
    await tocar(page.getByRole('button', { name: tipo }))
    await revisar(page, `producto nuevo › ${tipo.source}`, fallas)
  }

  await abrir(page, `/admin/recipes/${receta.id}/edit`)
  await tocar(page.getByRole('button', { name: /Agregar ingrediente/ }))
  await revisar(page, 'receta › desplegable de ingredientes', fallas, '[data-slot="ingredient-combobox-popup"]')

  await abrir(page, '/admin/stock/compras/nueva')
  await tocar(page.getByRole('button', { name: /Cheddar/ }).first())
  await revisar(page, 'compra › con un item', fallas)

  await abrir(page, '/admin/products')
  await tocar(page.locator('table tbody tr').first().getByRole('checkbox'))
  await revisar(page, 'productos › seleccion multiple', fallas)

  await abrir(page, '/admin/mi-cuenta')
  await tocar(page.getByRole('button', { name: 'Cambiar el email' }))
  await revisar(page, 'mi cuenta › cambiar email', fallas)
  await tocar(page.getByRole('button', { name: 'Cambiar la contraseña' }))
  await revisar(page, 'mi cuenta › cambiar contraseña', fallas)

  await ctx.close()
  expect(fallas).toEqual([])
})

test('los dialogos restantes se usan con el dedo', async ({ browser }) => {
  await asegurarUsuarioConRol('cocina@local.test', 'cocina')
  const lapiz = (p: Page) => p.locator('main button').filter({ has: p.locator('svg.lucide-pencil') }).first()
  const DIALOGOS: [string, string, (page: Page) => Promise<void>][] = [
    // "Cambiar email" usa window.prompt: lo dibuja el navegador, no hay nada
    // nuestro que medir. La clave nueva se genera sobre el usuario de cocina de
    // prueba, nunca sobre el que entra al panel en los tests.
    ['/admin/empleados', 'nueva clave', (p) => p.getByRole('row', { name: /cocina@local\.test/ }).getByRole('button', { name: 'Nueva clave' }).click()],
    ['/admin/tables', 'editar mesa', (p) => lapiz(p).click()],
    ['/admin/delivery-zones', 'editar zona', (p) => lapiz(p).click()],
  ]
  const { ctx, page } = await paginaTactil(browser)
  const fallas: string[] = []
  await entrar(page)
  for (const [ruta, nombre, abrirDialogo] of DIALOGOS) {
    await abrir(page, ruta)
    await abrirDialogo(page)
    await expect(page.locator(DIALOGO).last(), nombre).toBeVisible()
    await revisar(page, `${ruta} › ${nombre}`, fallas, DIALOGO)
    await page.keyboard.press('Escape')
  }
  await ctx.close()
  expect(fallas).toEqual([])
})

test.describe('la caja con una mesa y una media pizza', () => {
  // Una sesion propia, una mesa abierta con un producto y dos productos de
  // prueba para la media pizza. Nada se cobra; al final se borra todo y la mesa
  // y la sesion vuelven a como estaban.
  const MESA = 2
  const CATEGORIA = 'c0000000-0000-0000-0000-000000000001'
  let previas: Record<string, unknown>[] = []
  let sesion = ''
  const creados: string[] = []

  test.beforeAll(async () => {
    previas = await rest('cash_register_sessions?status=eq.open&select=*')
    await rest('cash_register_sessions?status=eq.open', { method: 'DELETE' })
    const [perfil] = await rest('profiles?select=id&role=eq.admin&limit=1')
    ;[{ id: sesion }] = await rest('cash_register_sessions', {
      method: 'POST',
      body: JSON.stringify({ opened_by: perfil.id, opening_balance: 0, status: 'open' }),
    })
    for (const [name, tipo] of [['Mitad de prueba', 'mitad'], ['Doble de prueba', 'reventa']]) {
      const [p] = await rest('products', {
        method: 'POST',
        body: JSON.stringify({ name, category_id: CATEGORIA, price: 9000, product_type: tipo, is_active: true, station: 'cocina' }),
      })
      creados.push(p.id)
    }
    await rest('product_half_configs', { method: 'POST', body: JSON.stringify({ product_id: creados[0], pricing_method: 'max' }) })
  })

  test.afterAll(async () => {
    try {
      const pedidos: { id: string }[] = await rest(`orders?cash_register_session_id=eq.${sesion}&select=id`)
      await rest(`restaurant_tables?number=eq.${MESA}`, { method: 'PATCH', body: JSON.stringify({ current_order_id: null, status: 'libre' }) })
      for (const { id } of pedidos) {
        const comandas: { id: string }[] = await rest(`comandas?order_id=eq.${id}&select=id`)
        for (const c of comandas) await rest(`comanda_items?comanda_id=eq.${c.id}`, { method: 'DELETE' })
        await rest(`comandas?order_id=eq.${id}`, { method: 'DELETE' })
        await rest(`print_jobs?data->>orderId=eq.${id}`, { method: 'DELETE' })
        await rest(`order_items?order_id=eq.${id}`, { method: 'DELETE' })
        await rest(`orders?id=eq.${id}`, { method: 'DELETE' })
      }
    } finally {
      for (const id of creados) {
        await rest(`product_half_configs?product_id=eq.${id}`, { method: 'DELETE' })
        await rest(`products?id=eq.${id}`, { method: 'DELETE' })
      }
      await rest(`cash_register_sessions?id=eq.${sesion}`, { method: 'DELETE' })
      if (previas.length) await rest('cash_register_sessions', { method: 'POST', body: JSON.stringify(previas) })
    }
  })

  test('mesa abierta, agregar, cobro de mesa, pago dividido y media pizza', async ({ browser }) => {
    const { ctx, page } = await paginaTactil(browser)
    const fallas: string[] = []
    const tocar = async (l: ReturnType<Page['locator']>) => { await expect(l).toBeVisible(); await l.click() }
    await entrar(page)
    await abrir(page, '/admin/caja')

    // La media pizza, desde el mostrador.
    await tocar(page.getByText('Mitad de prueba').first())
    await expect(page.locator(DIALOGO).last()).toBeVisible()
    await revisar(page, 'caja › media pizza', fallas, DIALOGO)
    await page.keyboard.press('Escape')

    // El cobro de mostrador con dos medios de pago: Efectivo viene marcado,
    // se suma Tarjeta.
    await tocar(page.getByText('Hamburguesa simple').first())
    await tocar(page.getByRole('button', { name: /productos ·/ }))
    await tocar(page.getByRole('dialog').getByRole('button', { name: /^(Cobrar|Enviar a cocina)/ }))
    const cobro = page.getByRole('dialog', { name: /^Cobrar / })
    await expect(cobro).toBeVisible({ timeout: 15_000 })
    await tocar(cobro.getByText('Tarjeta', { exact: true }))
    await revisar(page, 'caja › cobro con dos medios', fallas, DIALOGO)
    await page.keyboard.press('Escape')

    // La mesa: se abre, se le agrega un producto y se va al cobro.
    await tocar(page.getByRole('button', { name: 'Mesas', exact: true }))
    await tocar(page.getByRole('button', { name: new RegExp(`Mesa ${MESA}\\b`) }).first())
    await tocar(page.getByRole('button', { name: /Agregar Items/ }))
    // La hoja de la mesa se cierra para dejar ver la pantalla de agregar: antes
    // quedaba encima y no se podia cargar nada desde el celular.
    await expect(page.getByRole('dialog', { name: `Mesa ${MESA}` }), 'la hoja deja ver la pantalla de agregar').toHaveCount(0)
    await revisar(page, 'caja › mesa › agregar', fallas)
    // La grilla del mostrador sigue en el DOM, oculta: se toca la que se ve.
    await tocar(page.getByText('Hamburguesa simple').filter({ visible: true }).first())
    await tocar(page.getByRole('button', { name: /^Confirmar ·/ }))
    await expect(page.getByRole('dialog', { name: `Mesa ${MESA}` }), 'vuelve a la hoja de la mesa').toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: /^Cobrar$/ })).toBeEnabled()
    await revisar(page, 'caja › mesa con un pedido', fallas, DIALOGO)
    await tocar(page.getByRole('button', { name: /^Cobrar$/ }))
    await revisar(page, 'caja › cobro de mesa', fallas)

    await ctx.close()
    expect(fallas).toEqual([])
  })
})
