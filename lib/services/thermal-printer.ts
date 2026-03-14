import ThermalPrinter from 'node-thermal-printer'

const { printer: Printer, types: PrinterTypes } = ThermalPrinter as any

const LINE_WIDTH = 24
const LINE_WIDTH_SOLID = 22
const LINE = '-'.repeat(LINE_WIDTH)

const LINE_SOLID = '_'.repeat(LINE_WIDTH_SOLID)

// Uso:

function fmt(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(price)
}

function leftRight(left: string, right: string): string {
  const maxLeft = LINE_WIDTH - right.length - 1
  const safeLeft = left.length > maxLeft ? left.substring(0, maxLeft) : left
  return safeLeft + ' '.repeat(LINE_WIDTH - safeLeft.length - right.length) + right
}

function createPrinter() {
  const iface = process.env.THERMAL_PRINTER_INTERFACE
  if (!iface) throw new Error('THERMAL_PRINTER_INTERFACE no está configurado en .env.local')
  const p = new Printer({
    type: PrinterTypes.EPSON,
    interface: iface,
    characterSet: 'PC858_EURO',
    removeSpecialCharacters: false,
    width: LINE_WIDTH,
  })
  // ESC @ = inicializa impresora y resetea bold, tamaño y alineación
  p.add(Buffer.from([0x1b, 0x40]))
  return p
}

export interface TicketData {
  orderId: string
  orderLabel: string
  dateStr: string
  timeStr: string
  items: { name: string; quantity: number; price: number; notes?: string | null }[]
  total: number
  subtotal: number
  shippingCost: number
  paymentLabel: string
  cashReceived?: number
  change?: number
  guestName?: string
}

export interface KitchenData {
  orderId: string
  orderLabel: string
  dateStr: string
  timeStr: string
  items: { name: string; quantity: number; notes?: string | null }[]
}

// ─── Ticket cliente ────────────────────────────────────────────────────────

export async function printClientTicket(data: TicketData): Promise<void> {
  const printer = createPrinter()

  // Header — text-base bold + text-sm + text-xs
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


  // Items — normal, alineado izq
  printer.alignLeft()
  for (const item of data.items) {
    printer.println(leftRight(`${item.quantity}x ${item.name}`, fmt(item.price * item.quantity)))
    if (item.notes) {
      printer.println(`  -> ${item.notes}`)
    }
      printer.println('')
  }

  // Totals + Payment
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

  // Footer
  printer.println(LINE)
  printer.println('')

  printer.alignCenter()
  printer.println('Gracias!')
  printer.println(`#${data.orderId.slice(-8).toUpperCase()}`)
  printer.cut()

  await printer.execute()
}

// ─── Ticket cocina ─────────────────────────────────────────────────────────

export async function printKitchenTicket(data: KitchenData): Promise<void> {
  const printer = createPrinter()

  // COCINA en text-2xl (doble alto + ancho) + bold
  printer.alignCenter()
  printer.setTextSize(1, 1)
  printer.bold(true)
  printer.println('COCINA')
  printer.setTextSize(0, 0)
  printer.bold(false)

  // orderLabel en text-base bold
  printer.bold(true)
  printer.println(data.orderLabel)
  printer.bold(false)

  // date + id en text-xs normal
  printer.println(`${data.dateStr} · ${data.timeStr}`)
  printer.println(`#${data.orderId.slice(-8).toUpperCase()}`)
  printer.println(LINE)

  // Items: texto grande (text-lg) + bold
  printer.alignLeft()
  for (const item of data.items) {
    printer.setTextSize(1, 0)
    printer.bold(true)
    printer.println(`${item.quantity}x ${item.name}`)
    printer.setTextSize(0, 0)
    printer.bold(false)
    if (item.notes) {
      printer.println(`  -> ${item.notes}`)
    }
  }

  printer.cut()
  await printer.execute()
}
