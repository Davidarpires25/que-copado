const fs = require('fs')
const os = require('os')
const path = require('path')

// El .env se busca JUNTO AL EJECUTABLE, no en el directorio actual.
// `dotenv.config()` a secas usa process.cwd(), y la tarea programada de Windows
// arranca el .exe con C:\Windows\System32 como directorio: ahi no hay ningun
// .env y el bridge no levantaba al iniciar sesion, aunque a mano funcionara.
const DIR_EXE = path.dirname(process.execPath)

// Se acepta `configuracion.txt` ademas de `.env`: crear un archivo que empieza
// con punto desde el Explorador de Windows es incomodo, y quien instala esto en
// el local no tiene por que pelearse con eso.
for (const nombre of ['.env', 'configuracion.txt']) {
  require('dotenv').config({ path: path.join(DIR_EXE, nombre) })
}
// Fallback para correrlo con `node index.js` durante el desarrollo.
require('dotenv').config()
const net = require('net')
const { execFile } = require('child_process')
const { Bandeja } = require('./tray')
const { createClient } = require('@supabase/supabase-js')
const ThermalPrinter = require('node-thermal-printer')


const { printer: Printer, types: PrinterTypes } = ThermalPrinter

// ─── Registro ───────────────────────────────────────────────────────────────
//
// Sin ventana de consola hay que poder ver que paso. El log vive junto al
// ejecutable, o en la carpeta del usuario si ese directorio fuera de solo
// lectura (pasa cuando el .exe queda en Archivos de Programa).

const LOG_PATH = (() => {
  const junto = path.join(DIR_EXE, 'print-bridge.log')
  try {
    fs.appendFileSync(junto, '')
    return junto
  } catch {
    return path.join(os.homedir(), 'print-bridge.log')
  }
})()

function registrar(...partes) {
  const linea = `[${new Date().toISOString()}] ${partes.join(' ')}`
  console.log(linea)
  try {
    fs.appendFileSync(LOG_PATH, linea + os.EOL)
  } catch { /* que no se pueda escribir el log no puede frenar la impresion */ }
}

/**
 * Una sola instancia a la vez.
 *
 * Sin esto, un doble clic en el lanzador deja dos bridges escuchando la misma
 * cola y cada ticket sale impreso dos veces.
 *
 * El mutex es un puerto en loopback, no un archivo con el PID. Un lock por PID
 * falla de dos formas: si el proceso muere de golpe queda huerfano, y si el
 * sistema recicla ese numero para otro proceso, la instancia nueva cree que hay
 * otra viva y se cierra sola. Un puerto lo libera el sistema operativo al morir
 * el proceso, pase lo que pase, y nunca se confunde con otro.
 */
const PUERTO_MUTEX = Number(process.env.BRIDGE_MUTEX_PORT || 47113)

function tomarLock() {
  return new Promise((resolve) => {
    try {
      const servidor = net.createServer()
      servidor.once('error', (err) => {
        // EADDRINUSE es la respuesta esperada cuando ya hay otra corriendo.
        resolve(err && err.code === 'EADDRINUSE' ? false : true)
      })
      servidor.once('listening', () => {
        servidor.unref()   // que no impida al proceso terminar
        resolve(true)
      })
      servidor.listen(PUERTO_MUTEX, '127.0.0.1')
    } catch {
      resolve(true)   // ante la duda, mejor imprimir que no arrancar
    }
  })
}

const bandeja = new Bandeja()

function abrirLog() {
  const cmd = process.platform === 'win32' ? 'notepad'
    : process.platform === 'darwin' ? 'open' : 'xdg-open'
  try { execFile(cmd, [LOG_PATH]) } catch { /* no es critico */ }
}

// ─── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// La ANON key es la que corresponde y alcanza: la migracion 017 le dio al rol
// `anon` exactamente los dos permisos que el bridge necesita sobre print_jobs
// —leer los pendientes y marcarlos printed/error— y ninguno mas.
//
// Antes se exigia la SERVICE_ROLE, que saltea toda la RLS. Ese .exe vive en la
// PC del local: cualquiera con acceso a esa maquina tendria control total de la
// base. Se sigue aceptando por compatibilidad con instalaciones viejas, pero
// avisando, y la anon tiene prioridad.
const SUPABASE_KEY = SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY
const PRINTER_IP        = process.env.PRINTER_IP   || '192.168.1.100'
const PRINTER_PORT      = process.env.PRINTER_PORT || '9100'
const PRINTER_INTERFACE = process.env.PRINTER_INTERFACE || `tcp://${PRINTER_IP}:${PRINTER_PORT}`

const configuredLineWidth = Number(process.env.PRINTER_LINE_WIDTH || 44)
const LINE_WIDTH = Number.isFinite(configuredLineWidth) && configuredLineWidth >= 24 ? configuredLineWidth : 44
const LINE       = '-'.repeat(LINE_WIDTH)
const LINE_SOLID = '_'.repeat(LINE_WIDTH)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  registrar('❌  Falta SUPABASE_URL y/o SUPABASE_ANON_KEY en configuracion.txt')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

if (!SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY) {
  registrar('⚠️  Estas usando la SERVICE_ROLE key, que da acceso total a la base.')
  registrar('   El bridge no la necesita: cambiala por SUPABASE_ANON_KEY.')
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(price) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(price)
}

// Los Math.max no son decorativos: si `right` ocupara la linea entera,
// repeat() recibia un negativo y tiraba RangeError, que aborta el job y deja el
// ticket sin salir. Un total con muchos digitos alcanza.
function leftRight(left, right) {
  const maxLeft = Math.max(0, LINE_WIDTH - right.length - 1)
  const safeLeft = left.length > maxLeft ? left.substring(0, maxLeft) : left
  const relleno = Math.max(0, LINE_WIDTH - safeLeft.length - right.length)
  return safeLeft + ' '.repeat(relleno) + right
}

function wrapText(text, width = LINE_WIDTH) {
  if (!text) return ['']
  const words = String(text).trim().split(/\s+/)
  const lines = []
  let current = ''

  for (const word of words) {
    if (!current) {
      current = word
      continue
    }
    const next = `${current} ${word}`
    if (next.length <= width) {
      current = next
    } else {
      lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function createPrinter() {
  const p = new Printer({
    type: PrinterTypes.EPSON,
    interface: PRINTER_INTERFACE,
    characterSet: 'PC858_EURO',
    removeSpecialCharacters: false,
    width: LINE_WIDTH,
  })
  p.add(Buffer.from([0x1b, 0x40])) // ESC @ reset
  return p
}

// ─── Print functions ────────────────────────────────────────────────────────

async function printClientTicket(data) {
  const printer = createPrinter()

  printer.alignCenter()
  printer.bold(true)
  printer.setTextSize(1, 0)
  printer.println('QUE COPADO')
  printer.bold(false)
  printer.setTextSize(0, 0)
  printer.println(LINE_SOLID)
  printer.println('')
  printer.println(`${data.orderLabel}${data.guestName ? ` · ${data.guestName}` : ''}`)
  printer.println(`${data.dateStr} · ${data.timeStr}`)
  printer.println('')
  printer.println(LINE)
  printer.println('')

  printer.alignLeft()
  for (const item of data.items) {
    const itemTitle = `${item.quantity}x ${item.name}`
    const itemTotal = fmt(item.price * item.quantity)
    const itemLeftWidth = Math.max(1, LINE_WIDTH - itemTotal.length - 1)
    const wrappedTitle = wrapText(itemTitle, itemLeftWidth)

    // Classic receipt layout: first line with item on left and price on right.
    printer.println(leftRight(wrappedTitle[0] || '', itemTotal))
    // If item name is long, continue on following lines without truncation.
    for (const extraLine of wrappedTitle.slice(1)) {
      printer.println(extraLine)
    }

    if (item.notes) {
      const wrappedNotes = wrapText(`-> ${item.notes}`, LINE_WIDTH)
      for (const noteLine of wrappedNotes) printer.println(noteLine)
    }
    printer.println('')
  }

  printer.alignCenter()
  printer.println(LINE)
  printer.println('')
  printer.alignLeft()

  if (data.shippingCost > 0) {
    printer.println(leftRight('Subtotal', fmt(data.subtotal)))
    printer.println(leftRight('Envio', fmt(data.shippingCost)))
  }
  printer.bold(true)
  printer.println(leftRight('TOTAL', fmt(data.total)))
  printer.bold(false)
  printer.println(leftRight(data.paymentLabel, data.cashReceived ? fmt(data.cashReceived) : fmt(data.total)))
  if (data.change && data.change > 0) {
    printer.println(leftRight('Vuelto', fmt(data.change)))
  }
  printer.println('')
  printer.alignCenter()
  printer.println(LINE)
  printer.println('')
  printer.println('Gracias!')
  printer.println(`#${data.orderId.slice(-8).toUpperCase()}`)
  printer.cut()

  await printer.execute()
}

async function printKitchenTicket(data) {
  const printer = createPrinter()

  printer.alignCenter()
  printer.setTextSize(1, 1)
  printer.bold(true)
  printer.println('COCINA')
  printer.setTextSize(0, 0)
  printer.bold(false)
  printer.bold(true)
  printer.println(data.orderLabel)
  printer.bold(false)
  printer.println(`${data.dateStr} · ${data.timeStr}`)
  printer.println(`#${data.orderId.slice(-8).toUpperCase()}`)
  printer.println(LINE)

  printer.alignLeft()
  for (const item of data.items) {
    printer.setTextSize(1, 0)
    printer.bold(true)
    printer.println(`${item.quantity}x ${item.name}`)
    printer.setTextSize(0, 0)
    printer.bold(false)
    if (item.notes) printer.println(`  -> ${item.notes}`)
  }

  printer.cut()
  await printer.execute()
}

// ─── Job processor ──────────────────────────────────────────────────────────

async function processJob(job) {
  bandeja.actualizar('imprimiendo')
  try {
    if (job.type === 'client_ticket') {
      await printClientTicket(job.data)
    } else if (job.type === 'kitchen_ticket') {
      await printKitchenTicket(job.data)
    } else {
      throw new Error(`Tipo de job desconocido: ${job.type}`)
    }

    // Via RPC y no UPDATE directo: con la anon key el UPDATE se rechaza, porque
    // Postgres exige que la fila resultante siga siendo visible por las
    // policies SELECT del rol, y anon solo ve 'pending'. Ver migracion 035.
    const { error: markPrintedError } = await supabase.rpc('marcar_print_job', {
      p_id: job.id,
      p_status: 'printed',
    })

    if (markPrintedError) {
      throw new Error(`No se pudo marcar como printed: ${markPrintedError.message}`)
    }

    registrar(`✅  Job ${job.id.slice(-8)} (${job.type}) impreso`)
    bandeja.actualizar('listo')
  } catch (err) {
    registrar(`❌  Job ${job.id.slice(-8)} fallo:`, err?.message ?? JSON.stringify(err))
    bandeja.actualizar('error', err?.code === 'ECONNREFUSED' ? 'no responde' : '')
    const { error: markErrorStatusError } = await supabase.rpc('marcar_print_job', {
      p_id: job.id,
      p_status: 'error',
      p_error: err.message,
    })

    if (markErrorStatusError) {
      registrar(`❌  No se pudo marcar el job ${job.id.slice(-8)} como error:`, markErrorStatusError.message)
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function imprimirPrueba() {
  registrar('🧪  Ticket de prueba solicitado desde la bandeja')
  bandeja.actualizar('imprimiendo')
  try {
    await printClientTicket({
      orderLabel: 'PRUEBA',
      dateStr: new Date().toLocaleDateString('es-AR'),
      timeStr: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      items: [{ name: 'Ticket de prueba', quantity: 1, price: 0 }],
      subtotal: 0, total: 0, shippingCost: 0,
      paymentLabel: 'Prueba',
    })
    registrar('✅  Ticket de prueba impreso')
    bandeja.actualizar('listo')
  } catch (err) {
    registrar('❌  El ticket de prueba fallo:', err?.message ?? String(err))
    bandeja.actualizar('error', 'no responde')
  }
}

/**
 * Modo `--probar`: imprime un ticket de prueba y sale.
 *
 * El menu del icono de bandeja no funciona: los clicks no llegan al proceso
 * principal cuando corre empaquetado con pkg (verificado en Windows 11). Para
 * no perder la funcion, "imprimir prueba" se ofrece como un .bat aparte.
 */
async function modoProbar() {
  registrar('🧪  Ticket de prueba (modo --probar)')
  try {
    await printClientTicket({
      orderLabel: 'PRUEBA',
      dateStr: new Date().toLocaleDateString('es-AR'),
      timeStr: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      items: [{ name: 'Ticket de prueba', quantity: 1, price: 0 }],
      subtotal: 0, total: 0, shippingCost: 0,
      paymentLabel: 'Prueba',
    })
    registrar('✅  Salio el ticket de prueba: la impresora responde')
    return 0
  } catch (err) {
    registrar('❌  No se pudo imprimir:', err?.message ?? String(err))
    registrar('   Revisá que la impresora este encendida y que la IP sea la correcta.')
    return 1
  }
}

async function main() {
  if (process.argv.includes('--probar')) {
    process.exit(await modoProbar())
  }

  if (!(await tomarLock())) {
    registrar('⚠️  Ya hay otra instancia corriendo. Esta se cierra para no duplicar tickets.')
    process.exit(0)
  }

  bandeja.iniciar({
    impresora: PRINTER_INTERFACE.replace(/^tcp:\/\//, ''),
    onProbar: imprimirPrueba,
    onVerLog: abrirLog,
    onSalir: () => { bandeja.cerrar(); process.exit(0) },
  })

  registrar(`🖨️   Que Copado Print Bridge`)
  registrar(`📡  Impresora: ${PRINTER_INTERFACE}`)
  registrar(`📏  Ancho ticket: ${LINE_WIDTH} columnas`)
  registrar(`🔗  Supabase:  ${SUPABASE_URL}`)
  registrar(`📝  Registro:  ${LOG_PATH}`)

  // 1. Procesar jobs pendientes que quedaron de antes
  const { data: pending, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at')

  if (error) {
    registrar('❌  Error consultando tickets pendientes:', error.message)
    bandeja.actualizar('error', 'sin conexion')
  } else if (pending && pending.length > 0) {
    registrar(`📋  ${pending.length} tickets pendientes, procesando...`)
    for (const job of pending) await processJob(job)
  } else {
    registrar('📋  Sin tickets pendientes')
  }

  // 2. Suscribirse a nuevos jobs via Realtime
  supabase
    .channel('print_jobs_channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'print_jobs' },
      async ({ new: job }) => {
        if (job.status !== 'pending') return
        registrar(`📄  Nuevo ticket: ${job.id.slice(-8)} (${job.type})`)
        await processJob(job)
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        registrar('✅  Realtime activo — esperando tickets')
        bandeja.actualizar('listo')
      } else if (status === 'CHANNEL_ERROR') {
        registrar('❌  Realtime error:', err?.message || err)
        bandeja.actualizar('error', 'sin conexion')
      } else if (status === 'TIMED_OUT') {
        registrar('❌  Sin respuesta del servidor, reintentando...')
        bandeja.actualizar('error', 'sin conexion')
      } else {
        registrar(`ℹ️   Estado de la conexion: ${status}`)
      }
    })
}

main().catch((err) => {
  registrar('💥  Error fatal:', err?.stack ?? String(err))
  process.exit(1)
})
