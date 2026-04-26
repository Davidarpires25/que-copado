require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const ThermalPrinter = require('node-thermal-printer')

const { printer: Printer, types: PrinterTypes } = ThermalPrinter

// ─── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const ALLOW_ANON_SUPABASE_KEY = process.env.ALLOW_ANON_SUPABASE_KEY === 'true'
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
const PRINTER_IP        = process.env.PRINTER_IP   || '192.168.1.100'
const PRINTER_PORT      = process.env.PRINTER_PORT || '9100'
const PRINTER_INTERFACE = process.env.PRINTER_INTERFACE || `tcp://${PRINTER_IP}:${PRINTER_PORT}`

const configuredLineWidth = Number(process.env.PRINTER_LINE_WIDTH || 44)
const LINE_WIDTH = Number.isFinite(configuredLineWidth) && configuredLineWidth >= 24 ? configuredLineWidth : 44
const LINE       = '-'.repeat(LINE_WIDTH)
const LINE_SOLID = '_'.repeat(LINE_WIDTH)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Falta SUPABASE_URL y/o una key de Supabase (SERVICE_ROLE recomendado)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

if (!SUPABASE_SERVICE_ROLE_KEY) {
  if (!ALLOW_ANON_SUPABASE_KEY) {
    console.error('❌  Falta SUPABASE_SERVICE_ROLE_KEY en .env')
    console.error('   El bridge necesita actualizar print_jobs (pending -> printed/error),')
    console.error('   y con RLS activo la ANON key suele ser bloqueada.')
    console.error('   Configura SUPABASE_SERVICE_ROLE_KEY o, bajo tu riesgo, ALLOW_ANON_SUPABASE_KEY=true.')
    process.exit(1)
  }
  console.warn('⚠️  ALLOW_ANON_SUPABASE_KEY=true: usando SUPABASE_ANON_KEY (puede fallar por RLS).')
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(price) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(price)
}

function leftRight(left, right) {
  const maxLeft = LINE_WIDTH - right.length - 1
  const safeLeft = left.length > maxLeft ? left.substring(0, maxLeft) : left
  return safeLeft + ' '.repeat(LINE_WIDTH - safeLeft.length - right.length) + right
}

function centerLine(text, width = LINE_WIDTH) {
  const value = String(text ?? '')
  if (value.length >= width) return value.slice(0, width)
  const leftPad = Math.floor((width - value.length) / 2)
  const rightPad = width - value.length - leftPad
  return ' '.repeat(leftPad) + value + ' '.repeat(rightPad)
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
  try {
    if (job.type === 'client_ticket') {
      await printClientTicket(job.data)
    } else if (job.type === 'kitchen_ticket') {
      await printKitchenTicket(job.data)
    } else {
      throw new Error(`Tipo de job desconocido: ${job.type}`)
    }

    const { error: markPrintedError } = await supabase
      .from('print_jobs')
      .update({ status: 'printed' })
      .eq('id', job.id)

    if (markPrintedError) {
      throw new Error(`No se pudo marcar como printed: ${markPrintedError.message}`)
    }

    console.log(`✅  Job ${job.id.slice(-8)} (${job.type}) impreso`)
  } catch (err) {
    console.error(`❌  Job ${job.id.slice(-8)} falló:`, err?.message ?? JSON.stringify(err))
    const { error: markErrorStatusError } = await supabase
      .from('print_jobs')
      .update({ status: 'error', error_msg: err.message })
      .eq('id', job.id)

    if (markErrorStatusError) {
      console.error(`❌  No se pudo marcar el job ${job.id.slice(-8)} como error:`, markErrorStatusError.message)
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🖨️   Que Copado Print Bridge`)
  console.log(`📡  Impresora: ${PRINTER_INTERFACE}`)
  console.log(`📏  Ancho ticket: ${LINE_WIDTH} columnas`)
  console.log(`🔗  Supabase:  ${SUPABASE_URL}`)
  console.log('')

  // 1. Procesar jobs pendientes que quedaron de antes
  const { data: pending, error } = await supabase
    .from('print_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at')

  if (error) {
    console.error('Error consultando jobs pendientes:', error.message)
  } else if (pending && pending.length > 0) {
    console.log(`📋  ${pending.length} jobs pendientes encontrados, procesando...`)
    for (const job of pending) await processJob(job)
  } else {
    console.log('📋  Sin jobs pendientes')
  }

  // 2. Suscribirse a nuevos jobs via Realtime
  supabase
    .channel('print_jobs_channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'print_jobs' },
      async ({ new: job }) => {
        if (job.status !== 'pending') return
        console.log(`\n📄  Nuevo job: ${job.id.slice(-8)} (${job.type})`)
        await processJob(job)
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅  Realtime activo — esperando jobs de impresión...\n')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌  Realtime error:', err?.message || err)
      } else if (status === 'TIMED_OUT') {
        console.error('❌  Realtime timeout — reintentando...')
      } else {
        console.log(`ℹ️   Realtime status: ${status}`)
      }
    })
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
