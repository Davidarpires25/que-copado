require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const ThermalPrinter = require('node-thermal-printer')

const { printer: Printer, types: PrinterTypes } = ThermalPrinter

// ─── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_ANON_KEY
const PRINTER_IP        = process.env.PRINTER_IP   || '192.168.1.100'
const PRINTER_PORT      = process.env.PRINTER_PORT || '9100'
const PRINTER_INTERFACE = process.env.PRINTER_INTERFACE || `tcp://${PRINTER_IP}:${PRINTER_PORT}`

const LINE_WIDTH = 24
const LINE       = '-'.repeat(LINE_WIDTH)
const LINE_SOLID = '_'.repeat(22)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Falta SUPABASE_URL o SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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
  printer.println('QUE COPADO')
  printer.bold(false)
  printer.println(LINE_SOLID)
  printer.println(`${data.orderLabel}${data.guestName ? ` · ${data.guestName}` : ''}`)
  printer.println(`${data.dateStr} · ${data.timeStr}`)
  printer.println('')
  printer.println(LINE)
  printer.println('')

  printer.alignLeft()
  for (const item of data.items) {
    printer.println(leftRight(`${item.quantity}x ${item.name}`, fmt(item.price * item.quantity)))
    if (item.notes) printer.println(`  -> ${item.notes}`)
    printer.println('')
  }

  printer.println(LINE)
  printer.println('')

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
  printer.println(LINE)
  printer.println('')
  printer.alignCenter()
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

    await supabase.from('print_jobs').update({ status: 'printed' }).eq('id', job.id)
    console.log(`✅  Job ${job.id.slice(-8)} (${job.type}) impreso`)
  } catch (err) {
    console.error(`❌  Job ${job.id.slice(-8)} falló:`, err.message)
    await supabase
      .from('print_jobs')
      .update({ status: 'error', error_msg: err.message })
      .eq('id', job.id)
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🖨️   Que Copado Print Bridge`)
  console.log(`📡  Impresora: ${PRINTER_INTERFACE}`)
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
