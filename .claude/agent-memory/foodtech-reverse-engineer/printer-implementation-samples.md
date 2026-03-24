# Thermal Printer Implementation: Ready-to-Use Code Samples

**Context**: Local Node.js Agent + ESC/POS for Que Copado
**ESC/POS Standard**: Epson's proprietary POS command set, supported by all thermal printers

---

## 1. Database Schema (Supabase SQL)

```sql
-- Restaurant printer configuration
CREATE TABLE restaurant_printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Printer identity
  name TEXT NOT NULL, -- e.g., "Kitchen Printer", "Bar Printer", "Receipt Printer"
  printer_type TEXT NOT NULL CHECK (printer_type IN ('epson', 'star', 'brother', 'bixolon')),

  -- Network configuration
  ip_address INET NOT NULL,
  port INT NOT NULL DEFAULT 9100,

  -- Printer characteristics
  paper_width INT NOT NULL DEFAULT 80, -- 80mm or 58mm
  has_cutter BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_online TIMESTAMP,
  last_health_check TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Print jobs queue (can be archived/deleted after 7 days)
CREATE TABLE print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  printer_id UUID NOT NULL REFERENCES restaurant_printers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE SET NULL,

  -- Job type
  job_type TEXT NOT NULL CHECK (job_type IN ('receipt', 'kitchen_ticket', 'bar_ticket', 'label')),

  -- Content
  escpos_data BYTEA NOT NULL, -- Raw ESC/POS command bytes

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'success', 'failed', 'cancelled')),
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  printed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Printer health/status log (optional, for monitoring)
CREATE TABLE printer_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id UUID NOT NULL REFERENCES restaurant_printers(id) ON DELETE CASCADE,
  is_online BOOLEAN,
  response_time_ms INT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_print_jobs_restaurant_status ON print_jobs(restaurant_id, status);
CREATE INDEX idx_print_jobs_printer_status ON print_jobs(printer_id, status);
CREATE INDEX idx_restaurant_printers_active ON restaurant_printers(restaurant_id, is_active);
```

---

## 2. TypeScript Types

```typescript
// lib/types/printer.ts

export type PrinterType = 'epson' | 'star' | 'brother' | 'bixolon';
export type JobType = 'receipt' | 'kitchen_ticket' | 'bar_ticket' | 'label';
export type JobStatus = 'pending' | 'printing' | 'success' | 'failed' | 'cancelled';

export interface RestaurantPrinter {
  id: string;
  restaurant_id: string;
  name: string;
  printer_type: PrinterType;
  ip_address: string;
  port: number;
  paper_width: 80 | 58;
  has_cutter: boolean;
  is_active: boolean;
  last_online: string | null;
  last_health_check: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrintJob {
  id: string;
  restaurant_id: string;
  printer_id: string;
  order_id: string | null;
  job_type: JobType;
  escpos_data: Buffer;
  status: JobStatus;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  printed_at: string | null;
  updated_at: string;
}

export interface PrinterStatus {
  id: string;
  printer_id: string;
  is_online: boolean;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface PrinterConfig {
  printerType: PrinterType;
  paperWidth: 80 | 58;
  hasCutter: boolean;
  codePage?: 'CP437' | 'CP850' | 'CP860' | 'CP863' | 'CP865' | 'CP1252';
}

export interface PrintOrderOptions {
  includeOrderNumber: boolean;
  includeTimestamp: boolean;
  includeTotalPrice: boolean;
  footerText?: string;
}
```

---

## 3. ESC/POS Command Generator

```typescript
// lib/services/escpos-generator.ts

/**
 * ESC/POS Command Generator
 * Generates raw thermal printer commands for Epson, Star, Brother, etc.
 */

class EscPosGenerator {
  private buffer: number[] = [];

  constructor(private paperWidth: 80 | 58 = 80) {}

  // ======= PRINTER CONTROL =======

  initialize(): this {
    this.buffer.push(0x1b, 0x40); // ESC @
    return this;
  }

  reset(): this {
    this.buffer.push(0x1b, 0x63, 0x30); // ESC c 0
    return this;
  }

  cut(): this {
    this.buffer.push(0x1d, 0x56, 0x00); // GS V 0 (partial cut)
    return this;
  }

  feedPaper(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a); // LF
    }
    return this;
  }

  // ======= TEXT FORMATTING =======

  text(str: string): this {
    const encoded = Buffer.from(str, 'utf8');
    this.buffer.push(...Array.from(encoded));
    return this;
  }

  line(str: string = ''): this {
    return this.text(str + '\n');
  }

  bold(enabled: boolean = true): this {
    if (enabled) {
      this.buffer.push(0x1b, 0x45, 0x01); // ESC E 1
    } else {
      this.buffer.push(0x1b, 0x45, 0x00); // ESC E 0
    }
    return this;
  }

  underline(enabled: boolean = true): this {
    if (enabled) {
      this.buffer.push(0x1b, 0x2d, 0x01); // ESC - 1
    } else {
      this.buffer.push(0x1b, 0x2d, 0x00); // ESC - 0
    }
    return this;
  }

  inverse(enabled: boolean = true): this {
    if (enabled) {
      this.buffer.push(0x1d, 0x42, 0x01); // GS B 1
    } else {
      this.buffer.push(0x1d, 0x42, 0x00); // GS B 0
    }
    return this;
  }

  // ======= ALIGNMENT =======

  align(alignment: 'left' | 'center' | 'right'): this {
    const alignmentCode = alignment === 'left' ? 0 : alignment === 'center' ? 1 : 2;
    this.buffer.push(0x1b, 0x61, alignmentCode); // ESC a <n>
    return this;
  }

  // ======= FONT SIZE =======

  fontSize(width: 1 | 2 | 3 = 1, height: 1 | 2 | 3 = 1): this {
    if (width < 1 || width > 3 || height < 1 || height > 3) {
      throw new Error('Font size must be 1, 2, or 3');
    }
    const widthBits = (width - 1) << 4;
    const heightBits = height - 1;
    this.buffer.push(0x1d, 0x21, widthBits | heightBits); // GS !
    return this;
  }

  normalSize(): this {
    return this.fontSize(1, 1);
  }

  // ======= BARCODES & IMAGES =======

  barcode(code: string, type: 'code128' | 'ean13' | 'upca' = 'code128'): this {
    const typeCode = type === 'code128' ? 0x49 : type === 'ean13' ? 0x43 : 0x42;
    this.buffer.push(0x1d, 0x68, 0x40); // GS h (barcode height)
    this.buffer.push(0x1d, 0x77, 0x02); // GS w (barcode width)
    this.buffer.push(0x1d, 0x6b, typeCode); // GS k (barcode type)
    this.buffer.push(code.length); // Length
    this.buffer.push(...Buffer.from(code)); // Data
    return this;
  }

  qrcode(data: string, size: number = 5): this {
    const dataLen = data.length;
    this.buffer.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, size, 0x00); // QR settings
    this.buffer.push(0x1d, 0x28, 0x6b); // QR store data
    this.buffer.push((dataLen + 2) & 0xff, ((dataLen + 2) >> 8) & 0xff);
    this.buffer.push(0x31, 0x44);
    this.buffer.push(...Buffer.from(data));
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x52, 0x00); // QR print
    return this;
  }

  // ======= UTILITY =======

  separator(char: string = '─'): this {
    const maxChars = this.paperWidth === 80 ? 40 : 25;
    return this.line(char.repeat(maxChars));
  }

  toBuffer(): Buffer {
    return Buffer.from(this.buffer);
  }

  toString(): string {
    return Buffer.from(this.buffer).toString('hex');
  }
}

export default EscPosGenerator;
```

---

## 4. Order Receipt Generator (High-Level)

```typescript
// lib/services/receipt-generator.ts

import EscPosGenerator from './escpos-generator';
import { Order, OrderItem } from '@/lib/types/database';
import { formatPrice } from '@/lib/utils';

interface ReceiptGeneratorOptions {
  restaurantName: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  headerText?: string;
  footerText?: string;
  showOrderNumber?: boolean;
  showTimestamp?: boolean;
  paperWidth?: 80 | 58;
}

export function generateKitchenTicket(
  order: Order & { order_items: OrderItem[] },
  options: ReceiptGeneratorOptions
): Buffer {
  const escpos = new EscPosGenerator(options.paperWidth || 80);

  escpos
    .initialize()
    .align('center')
    .fontSize(2, 2)
    .bold(true)
    .line('ORDEN #' + order.id.slice(0, 8).toUpperCase())
    .bold(false)
    .fontSize(1, 1)
    .line(new Date().toLocaleString('es-AR'))
    .separator()
    .feedPaper(1);

  // Group items by category or type
  const groups = groupItemsByType(order.order_items);

  for (const [groupName, items] of Object.entries(groups)) {
    if (groupName !== 'default') {
      escpos.align('center').bold(true).line(groupName).bold(false).align('left');
    }

    for (const item of items) {
      const qty = String(item.quantity).padStart(2, ' ');
      const name = item.product_name.substring(0, 28);
      escpos.line(`${qty}x ${name}`);

      if (item.notes) {
        escpos.align('left').fontSize(1, 1).line(`    ${item.notes}`).normalSize();
      }
    }

    escpos.feedPaper(1);
  }

  escpos
    .separator()
    .align('center')
    .fontSize(1, 1)
    .line(`Total: ${formatPrice(order.total)}`)
    .feedPaper(2)
    .cut()
    .feedPaper(1);

  return escpos.toBuffer();
}

export function generateReceiptTicket(
  order: Order & { order_items: OrderItem[] },
  options: ReceiptGeneratorOptions
): Buffer {
  const escpos = new EscPosGenerator(options.paperWidth || 80);

  escpos.initialize();

  // Header
  if (options.restaurantName) {
    escpos.align('center').fontSize(2, 1).bold(true).line(options.restaurantName);
  }

  if (options.restaurantAddress) {
    escpos.align('center').fontSize(1, 1).line(options.restaurantAddress);
  }

  escpos.feedPaper(1).separator();

  // Order info
  if (options.showOrderNumber) {
    escpos.align('left').line(`Pedido: #${order.id.slice(0, 8)}`);
  }

  if (options.showTimestamp) {
    escpos.line(`Fecha: ${new Date().toLocaleString('es-AR')}`);
  }

  escpos.feedPaper(1).separator();

  // Items
  escpos.align('left');
  for (const item of order.order_items) {
    const price = item.price * item.quantity;
    const name = item.product_name.substring(0, 28);
    const qty = item.quantity;

    escpos.line(`${qty}x ${name}`);
    escpos.align('right').line(formatPrice(price)).align('left');
  }

  // Totals
  escpos.feedPaper(1).separator().align('right').bold(true);

  if (order.subtotal && order.subtotal > 0) {
    escpos.line(`Subtotal: ${formatPrice(order.subtotal)}`);
  }

  if (order.shipping_cost && order.shipping_cost > 0) {
    escpos.line(`Envío: ${formatPrice(order.shipping_cost)}`);
  }

  escpos.fontSize(2, 2).line(`TOTAL: ${formatPrice(order.total)}`);

  // Footer
  escpos.fontSize(1, 1).bold(false).align('center').feedPaper(1);

  if (options.footerText) {
    escpos.line(options.footerText);
  }

  escpos.line('Gracias por su compra!').feedPaper(2).cut().feedPaper(1);

  return escpos.toBuffer();
}

function groupItemsByType(items: OrderItem[]): Record<string, OrderItem[]> {
  const groups: Record<string, OrderItem[]> = {};

  for (const item of items) {
    // You could group by category, course, or any other criteria
    const key = item.product_category || 'default';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }

  return groups;
}
```

---

## 5. Print Service (Server Action)

```typescript
// app/actions/print-service.ts

'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { generateKitchenTicket, generateReceiptTicket } from '@/lib/services/receipt-generator';
import { Order, OrderItem } from '@/lib/types/database';

interface PrintOrderOptions {
  order: Order & { order_items: OrderItem[] };
  restaurantId: string;
  printReceipt?: boolean;
  printKitchen?: boolean;
}

export async function createPrintJob(options: PrintOrderOptions) {
  const supabase = createAdminClient();

  const { order, restaurantId, printReceipt = true, printKitchen = true } = options;

  // Get restaurant printers
  const { data: printers } = await supabase
    .from('restaurant_printers')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true);

  if (!printers || printers.length === 0) {
    return {
      data: null,
      error: 'No printers configured for this restaurant'
    };
  }

  const jobs = [];

  // Kitchen ticket
  if (printKitchen) {
    const kitchenPrinter = printers.find(p => p.name.toLowerCase().includes('kitchen'));
    if (kitchenPrinter) {
      const escposData = generateKitchenTicket(order, {
        restaurantName: 'Mi Hamburguesería',
        paperWidth: kitchenPrinter.paper_width
      });

      const { data: job } = await supabase
        .from('print_jobs')
        .insert({
          restaurant_id: restaurantId,
          printer_id: kitchenPrinter.id,
          order_id: order.id,
          job_type: 'kitchen_ticket',
          escpos_data: escposData.toString('base64')
        })
        .select()
        .single();

      if (job) jobs.push(job);
    }
  }

  // Receipt ticket
  if (printReceipt) {
    const receiptPrinter = printers.find(p => p.name.toLowerCase().includes('receipt')) || printers[0];
    const escposData = generateReceiptTicket(order, {
      restaurantName: 'Mi Hamburguesería',
      showOrderNumber: true,
      showTimestamp: true,
      paperWidth: receiptPrinter.paper_width
    });

    const { data: job } = await supabase
      .from('print_jobs')
      .insert({
        restaurant_id: restaurantId,
        printer_id: receiptPrinter.id,
        order_id: order.id,
        job_type: 'receipt',
        escpos_data: escposData.toString('base64')
      })
      .select()
      .single();

    if (job) jobs.push(job);
  }

  return {
    data: jobs,
    error: null
  };
}

export async function getPrintQueue(restaurantId: string) {
  const supabase = createAdminClient();

  const { data: jobs } = await supabase
    .from('print_jobs')
    .select('*, restaurant_printers(*)')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20);

  return {
    data: jobs,
    error: null
  };
}
```

---

## 6. Print Agent (Node.js Worker)

```typescript
// scripts/print-agent.ts
// Run on restaurant's server: node -r ts-node/register print-agent.ts

import net from 'net';
import { createClient } from '@supabase/supabase-js';

const POLL_INTERVAL = 500; // 500ms
const SOCKET_TIMEOUT = 5000; // 5 seconds
const BATCH_SIZE = 10;
const RETRY_MAX = 3;

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface PrintJob {
  id: string;
  printer_id: string;
  escpos_data: string; // base64
  restaurant_printers: {
    ip_address: string;
    port: number;
  };
}

async function pollPrintQueue() {
  try {
    const { data: jobs, error } = await supabase
      .from('print_jobs')
      .select('id, printer_id, escpos_data, restaurant_printers(ip_address, port)')
      .eq('status', 'pending')
      .lt('retry_count', RETRY_MAX)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      console.error('Database error:', error);
      return;
    }

    if (!jobs || jobs.length === 0) {
      return; // Nothing to do
    }

    console.log(`[${new Date().toISOString()}] Processing ${jobs.length} print job(s)`);

    for (const job of jobs) {
      await processPrintJob(job);
    }
  } catch (error) {
    console.error('Unexpected error in pollPrintQueue:', error);
  }
}

async function processPrintJob(job: PrintJob) {
  const { id, printer_id, escpos_data, restaurant_printers } = job;

  try {
    // Decode base64 ESC/POS data
    const escposBuffer = Buffer.from(escpos_data, 'base64');

    // Send to printer
    await sendToPrinter(
      restaurant_printers.ip_address,
      restaurant_printers.port,
      escposBuffer
    );

    // Mark as success
    await supabase
      .from('print_jobs')
      .update({
        status: 'success',
        printed_at: new Date().toISOString()
      })
      .eq('id', id);

    console.log(`✓ Job ${id} printed successfully`);
  } catch (error) {
    // Increment retry count
    const { data: job } = await supabase
      .from('print_jobs')
      .select('retry_count')
      .eq('id', id)
      .single();

    const retryCount = (job?.retry_count || 0) + 1;

    if (retryCount >= RETRY_MAX) {
      // Max retries reached, mark as failed
      await supabase
        .from('print_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: retryCount
        })
        .eq('id', id);

      console.error(`✗ Job ${id} failed after ${retryCount} retries:`, error);
    } else {
      // Retry later
      await supabase
        .from('print_jobs')
        .update({ retry_count: retryCount })
        .eq('id', id);

      console.warn(`⚠ Job ${id} failed, retry ${retryCount}/${RETRY_MAX}:`, error);
    }
  }
}

function sendToPrinter(
  ipAddress: string,
  port: number,
  data: Buffer
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(
      {
        host: ipAddress,
        port: port || 9100,
        timeout: SOCKET_TIMEOUT
      },
      () => {
        socket.write(data, (error) => {
          if (error) {
            socket.destroy();
            reject(error);
          } else {
            socket.end();
            resolve();
          }
        });
      }
    );

    socket.on('error', (error) => {
      socket.destroy();
      reject(error);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Socket timeout'));
    });
  });
}

// Main loop
console.log('Print agent started');
console.log(`Polling interval: ${POLL_INTERVAL}ms`);
console.log(`Socket timeout: ${SOCKET_TIMEOUT}ms`);
console.log(`Batch size: ${BATCH_SIZE}`);
console.log(`Max retries: ${RETRY_MAX}`);

setInterval(pollPrintQueue, POLL_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
```

---

## 7. API Endpoint for Print Queue (Optional)

```typescript
// app/api/restaurants/[id]/print-queue/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const restaurantId = params.id;
  const supabase = createAdminClient();

  try {
    const { data: jobs, error } = await supabase
      .from('print_jobs')
      .select('*, restaurant_printers(*)')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(jobs);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 8. Admin UI: Printer Configuration

```typescript
// components/admin/printers/printer-form.tsx

'use client';

import { useState } from 'react';
import { RestaurantPrinter } from '@/lib/types/printer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PrinterFormProps {
  printer?: RestaurantPrinter;
  restaurantId: string;
  onSave: (printer: Partial<RestaurantPrinter>) => Promise<void>;
  onTestConnection?: (ipAddress: string, port: number) => Promise<boolean>;
}

export function PrinterForm({
  printer,
  restaurantId,
  onSave,
  onTestConnection
}: PrinterFormProps) {
  const [formData, setFormData] = useState({
    name: printer?.name || '',
    printer_type: printer?.printer_type || 'epson',
    ip_address: printer?.ip_address || '',
    port: printer?.port || 9100,
    paper_width: printer?.paper_width || 80,
    has_cutter: printer?.has_cutter ?? true
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestConnection = async () => {
    if (!onTestConnection) return;

    setTesting(true);
    setTestResult(null);

    try {
      const success = await onTestConnection(
        formData.ip_address,
        formData.port
      );

      setTestResult(
        success
          ? '✓ Printer connected successfully'
          : '✗ Connection failed'
      );
    } catch (error) {
      setTestResult(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="Printer Name"
        value={formData.name}
        onChange={(e) =>
          setFormData({ ...formData, name: e.target.value })
        }
        placeholder="Kitchen Printer, Receipt Printer, etc."
      />

      <select
        value={formData.printer_type}
        onChange={(e) =>
          setFormData({ ...formData, printer_type: e.target.value as any })
        }
        className="w-full px-3 py-2 border rounded"
      >
        <option value="epson">Epson</option>
        <option value="star">Star Micronics</option>
        <option value="brother">Brother</option>
        <option value="bixolon">Bixolon</option>
      </select>

      <Input
        label="IP Address"
        value={formData.ip_address}
        onChange={(e) =>
          setFormData({ ...formData, ip_address: e.target.value })
        }
        placeholder="192.168.1.100"
      />

      <Input
        label="Port"
        type="number"
        value={formData.port}
        onChange={(e) =>
          setFormData({ ...formData, port: parseInt(e.target.value) })
        }
        defaultValue={9100}
      />

      <select
        value={formData.paper_width}
        onChange={(e) =>
          setFormData({ ...formData, paper_width: parseInt(e.target.value) as 80 | 58 })
        }
        className="w-full px-3 py-2 border rounded"
      >
        <option value={80}>80mm (Standard)</option>
        <option value={58}>58mm (Compact)</option>
      </select>

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={formData.has_cutter}
          onChange={(e) =>
            setFormData({ ...formData, has_cutter: e.target.checked })
          }
        />
        <span>Has paper cutter</span>
      </label>

      {testResult && (
        <div
          className={`p-3 rounded text-sm ${
            testResult.includes('✓')
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {testResult}
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleTestConnection} disabled={testing}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        <Button
          onClick={() => onSave(formData)}
          variant="primary"
        >
          Save Printer
        </Button>
      </div>
    </div>
  );
}
```

---

## 9. Integration: Order Placement

```typescript
// When an order is confirmed, trigger printing:

import { createPrintJob } from '@/app/actions/print-service';
import { createOrder } from '@/app/actions/orders';

export async function placeOrder(orderData: any) {
  // Create order
  const { data: order, error: orderError } = await createOrder(orderData);

  if (orderError || !order) {
    return { error: orderError };
  }

  // Create print jobs (kitchen ticket + receipt)
  await createPrintJob({
    order: order as any,
    restaurantId: orderData.restaurant_id,
    printKitchen: true,
    printReceipt: true
  });

  return { data: order };
}
```

---

## 10. Docker Setup for Print Agent

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY scripts/print-agent.ts ./
COPY lib ./lib
COPY tsconfig.json ./

# Environment variables (set via docker-compose or helm)
ENV NODE_ENV=production

# Run agent
CMD ["npx", "ts-node", "print-agent.ts"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  print-agent:
    build: .
    environment:
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
    restart: unless-stopped
    logs:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
```

---

## Testing Checklist

- [ ] ESC/POS generator produces valid binary output
- [ ] Receipt includes all order items with correct total
- [ ] Kitchen ticket groups items appropriately
- [ ] QR code encodes order ID correctly
- [ ] Socket connection fails gracefully with proper retry
- [ ] Agent restarts don't lose pending jobs (persisted in DB)
- [ ] Printer goes offline; agent retries and eventually fails
- [ ] Multiple restaurants' print jobs don't interfere
- [ ] Agent handles base64 decoding correctly
- [ ] UI allows configuration of multiple printers per restaurant

---

## References

- [ESC/POS Standard - Epson](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/index.html)
- [Star Micronics Command Manual](https://www.starmicronics.com/support/Mannualfolder/escpos_cm_en.pdf)
- [Node.js TCP Socket Documentation](https://nodejs.org/api/net.html)
