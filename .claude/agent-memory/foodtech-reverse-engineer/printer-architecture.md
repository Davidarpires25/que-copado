# Thermal Printer Integration for Restaurant POS: Architecture Analysis

**Date**: 2026-03-13
**Context**: Reverse engineering thermal printer patterns across major restaurant POS platforms (Fudo, Toast, Square, Lightspeed) and evaluating solutions for Next.js SaaS restaurants

---

## Executive Summary

Thermal printer integration in web-based POS systems faces a fundamental challenge: **browsers cannot directly access USB or network printers due to security sandboxing**. Therefore, all production restaurant POS systems employ one of four architectural approaches:

1. **Native agent (local or server-side)** - Node.js daemon polling orders + TCP:9100 to network printers
2. **Electron desktop app** - Wraps web UI with Node.js backend for OS-level printer access
3. **Browser + local proxy** - QZ Tray or similar client-side agent installed at POS terminal
4. **Cloud polling service** - Star CloudPRNT or similar (printer pulls jobs from server)

Each has distinct trade-offs in installation complexity, reliability, and feature support. This document provides specific architectural guidance for Next.js SaaS restaurants.

---

## Part 1: How Major POS Systems Handle Thermal Printing

### Toast POS (Enterprise, Australia + LATAM)

**Architecture**: Hybrid network + local device

- **Receipt Printers**: Epson TM-T88V (80mm, Ethernet)
- **Kitchen Printers**: Epson TM-U220B (impact kitchen printer, Ethernet)
- **Configuration**: Through local Toast POS device (iPad or dedicated terminal)
- **Connection**: Network (LAN/WiFi) from POS device to printer
- **Offline Support**: Local KDS and backup kitchen printer
- **Protocol**: Proprietary Toast protocol + ESC/POS commands

**Technical Reality**:
- Toast POS devices are essentially iPads running a custom iOS app with native OS print APIs
- Printers must be network-connected (Ethernet/WiFi)
- Configuration stored locally on the device and synced to cloud
- Kitchen Display System (KDS) optional; kitchen printers are fallback when KDS offline

**For restaurants**: No complex agent installation; printers connect directly to WiFi router

---

### Square for Restaurants (SMB-Focused, USA + Some LATAM)

**Architecture**: Cloud-connected terminals with certified hardware

- **Receipt Printers**: Star Micronics TSP143III (80mm, Ethernet/WiFi)
- **Kitchen Printers**: Star SP 700 (impact, kitchen-rated)
- **Configuration**: Square app → Settings → Printers (cloud-synced)
- **Connection**: Network (Ethernet/WiFi) from Square Terminal to printer
- **Offline Support**: Limited; order tickets only if KDS available
- **Protocol**: Star proprietary + ESC/POS

**Technical Reality**:
- Square Terminal is a native Android device with direct printer API access
- Printers registered to account level, available across all terminals
- Only network-connected printers supported
- Cloud syncs printer configuration but printing happens locally

**For restaurants**: Simple web UI (cloud), but hardware is proprietary (Terminal) and expensive ($800-1200)

---

### Lightspeed Restaurant (Mid-Market, Global)

**Architecture**: Flexible local device + software routing

- **Receipt Printers**: Epson TM series (Ethernet/WiFi)
- **Kitchen Printers**: Thermal or impact, Ethernet/WiFi
- **Kitchen Display System (KDS)**: Digital alternative (no printer needed)
- **Configuration**: Through Lightspeed Back Office (cloud UI)
- **Connection**: Direct network connection from POS device to printer(s)
- **Offline Support**: Excellent (back office cached locally)
- **Protocol**: Native driver + ESC/POS

**Technical Reality**:
- Lightspeed recommends **LAN (direct router) printers for stability**
- Printers configured with IP address + port in Back Office
- "Production centers" can be physical printers OR digital KDS screens
- Same printer can route orders to multiple destinations (receipt + kitchen display)

**Key insight**: Lightspeed treats printing as a routing problem, not a integration headache. Orders route to destinations; those destinations can be printers or screens.

---

### Fudo (Argentine Market, Competitor)

**Architecture**: Inferred from public features

Based on available information:
- **Supported**: Thermal receipt printers (Epson, Star Micronics)
- **Kitchen Integration**: Likely network-based (no public documentation)
- **Delivery Integration**: WebSocket-based order updates to delivery apps
- **Offline Support**: Partial (cached orders, sync on reconnect)

**Inference**: Fudo likely uses a **local device architecture** (iPad/Android tablet running native app) with network printer support. This is the industry standard for LATAM restaurants.

**Why this matters**: Fudo's advantage is not in printer integration technology, but in **ease of deployment** and **delivery app integrations**. They don't need to solve the thermal printer problem better; they solve the delivery order routing problem better.

---

## Part 2: The Four Core Architectural Approaches

### Approach 1: Local Node.js Agent (TCP:9100)

**Pattern**: Daemon running on restaurant's server/NAS, polls database, sends ESC/POS to network printer

```
┌─────────────────┐
│  Next.js Cloud  │ (your SaaS)
│  Supabase DB    │
└────────┬────────┘
         │ Insert order (HTTP/API)
         │
         ▼
┌─────────────────────────────────┐
│  Restaurant's Network           │
│  ┌─────────────────────────────┐│
│  │ Node.js Print Agent         ││ (runs on NAS/laptop/RPi)
│  │ • Polls /api/print-queue    ││
│  │ • Formats ESC/POS commands  ││
│  │ • TCP:9100 to printer       ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ Thermal Printer (Network)   ││
│  │ • Epson TM-T88V             ││
│  │ • Star Micronics TSP143     ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Implementation**:
```javascript
// npm install node-thermal-printer socket
const ThermalPrinter = require('node-thermal-printer').printer;
const net = require('net');

const printer = new ThermalPrinter({
  type: ThermalPrinter.EPSON,
  interface: 'tcp://192.168.1.100:9100'
});

// From polling endpoint
app.get('/api/print-queue', async (req, res) => {
  const orders = await supabase
    .from('orders')
    .select('*')
    .eq('printed', false);

  for (const order of orders) {
    printer.println(`Order #${order.id}`);
    printer.println(order.items.map(i => `${i.qty}x ${i.name}`).join('\n'));
    printer.cut();
    printer.execute();

    // Mark printed
    await supabase.from('orders').update({ printed: true }).eq('id', order.id);
  }
  res.json({ printed: orders.length });
});
```

**Pros**:
- ✅ **Pure web-based**: No native apps, no installations
- ✅ **Stateless**: Agent can be restarted anytime
- ✅ **Cheap**: Runs on $20 Raspberry Pi
- ✅ **Flexible**: ESC/POS works with any network printer (Epson, Star, Brother, Bixolon)
- ✅ **Scalable**: Restaurant can add printers by IP address
- ✅ **Offline resilient**: Agent queues locally if cloud is down

**Cons**:
- ❌ **Network printers only**: No USB thermal printers (small restaurants often have USB)
- ❌ **Installation friction**: Requires IT setup (IP address config, network access)
- ❌ **Polling latency**: Order → print is 500ms-2s (not critical for kitchen)
- ❌ **Port conflict**: TCP:9100 must be open on printer
- ❌ **Support burden**: Restaurant calls you when printer is off network

**Best for**: Medium restaurants (5+ seats), modern infrastructure, network-connected printers

---

### Approach 2: QZ Tray (Browser + Local Agent)

**Pattern**: Desktop agent installed at POS terminal, browser sends print data via localhost

```
┌───────────────────────────┐
│  POS Workstation (Desktop)│
│ ┌───────────────────────┐ │
│ │ Browser (Next.js App) │ │
│ │ • User clicks "Print" │ │
│ │ • POST to localhost:8383 │
│ └────────┬──────────────┘ │
│          │                 │
│ ┌────────▼──────────────┐ │
│ │ QZ Tray Agent         │ │
│ │ • Listens :8383       │ │
│ │ • Signs requests (JWT)│ │
│ │ • Direct USB access   │ │
│ └────────┬──────────────┘ │
│          │                 │
│ ┌────────▼──────────────┐ │
│ │ USB Printer           │ │
│ │ (Thermal or thermal)  │ │
│ └───────────────────────┘ │
└───────────────────────────┘
```

**Implementation**:
```javascript
// Browser-side (React)
import qz from 'qz-tray';

async function printOrder(order) {
  await qz.security.setSignatureAlgorithm('SHA-512');
  await qz.security.setSignaturePromise(signaturePromise); // JWT

  const config = qz.configs.create('Epson TMT88');
  const data = generateEscPosCommands(order); // ESC/POS byte array

  await qz.print(config, [data]);
}

function generateEscPosCommands(order) {
  // Build ESC/POS buffer
  const escpos = [];
  escpos.push(27, 64); // Initialize
  escpos.push(29, 66, 1); // Set bold
  escpos.push(...Buffer.from(`Order #${order.id}\n`));
  escpos.push(27, 105); // Cut
  return new Uint8Array(escpos);
}
```

**Pros**:
- ✅ **Supports USB printers**: Direct OS-level access
- ✅ **Fast**: Instant printing (no polling)
- ✅ **Works offline**: Printer doesn't need network
- ✅ **Cross-platform**: Windows, Mac, Linux agent
- ✅ **Battle-tested**: Used by Odoo POS at scale

**Cons**:
- ❌ **Installation required**: Restaurant must install QZ Tray on each POS terminal
- ❌ **Desktop-only**: Doesn't work on iPad/tablets
- ❌ **JWT signing**: Requires certificate management
- ❌ **License cost**: QZ Tray is $149/printer/year for production
- ❌ **Support burden**: Agent crashes, version mismatches, firewall issues

**Best for**: Restaurants with USB printers, small chains (5-10 locations), technical owners

**Cost analysis** (important):
- QZ Tray: $149/printer/year
- 3 printers × 10 restaurants × 5 years = $22,350
- This becomes expensive at scale

---

### Approach 3: Electron Native App

**Pattern**: Wrap web UI in Electron, use Node.js backend for OS-level printer access

```
┌─────────────────────────────────┐
│ Electron Desktop App            │
│ ┌─────────────────────────────┐ │
│ │ Renderer Process (Chromium) │ │
│ │ • Next.js Frontend          │ │
│ │ • IPC emit: { printOrder }  │ │
│ └────────────┬────────────────┘ │
│              │ IPC                │
│ ┌────────────▼────────────────┐ │
│ │ Main Process (Node.js)      │ │
│ │ • node-printer module       │ │
│ │ • ESC/POS generation        │ │
│ │ • CUPS/WinPrint APIs        │ │
│ └────────────┬────────────────┘ │
│              │                    │
│ ┌────────────▼────────────────┐ │
│ │ OS Print Queue              │ │
│ │ (Windows Print Spooler,     │ │
│ │  macOS CUPS, Linux CUPS)    │ │
│ └────────────┬────────────────┘ │
│              │                    │
│ ┌────────────▼────────────────┐ │
│ │ Printer (USB or Network)    │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Implementation**:
```javascript
// Main process (Node.js/Electron)
const { ipcMain } = require('electron');
const PrinterModule = require('printer');

ipcMain.handle('print-order', async (event, order) => {
  const escpos = generateEscPosCommands(order);

  const printerName = 'Epson TM-T88V'; // Or from restaurant config
  const success = await new Promise((resolve) => {
    PrinterModule.printDirect({
      printer: printerName,
      data: escpos,
      success: () => resolve(true),
      error: () => resolve(false)
    });
  });

  return { success };
});
```

**Pros**:
- ✅ **Full hardware access**: USB, Network, Bluetooth printers
- ✅ **Offline-first**: Works with no internet
- ✅ **Fast printing**: Instant OS-level access
- ✅ **Native UX**: File dialogs, system menu integration
- ✅ **Professional appearance**: Looks like native app

**Cons**:
- ❌ **Installation overhead**: 150MB+ download, installation on each terminal
- ❌ **Update friction**: Restaurant PCs often locked down (IT approval needed)
- ❌ **Development split**: Maintain web + desktop codebases
- ❌ **No iPad support**: Electron only for Windows/Mac/Linux
- ❌ **OSX code signing**: Requires Apple Developer account ($99/year)

**Best for**: Enterprise restaurants, kiosk installations, offline-first requirements

---

### Approach 4: Star CloudPRNT (Cloud Polling Model)

**Pattern**: Printer polls Star server periodically; server delivers jobs from your cloud backend

```
┌─────────────────────┐
│  Your Cloud Backend  │
│  (Next.js + Queue)   │
└────────┬─────────────┘
         │ POST job to queue
         │
┌────────▼───────────────┐
│ Star CloudPRNT Server  │
│ (Star Micronics)       │
└────────┬───────────────┘
         │ Polls
         │ every 30s
┌────────▼──────────────────┐
│  Restaurant Network       │
│  ┌────────────────────┐   │
│  │ Star Printer       │   │
│  │ (WiFi)             │   │
│  │ Polls CloudPRNT    │   │
│  │ Gets & prints jobs │   │
│  └────────────────────┘   │
└───────────────────────────┘
```

**Implementation**:
```javascript
// Your backend
const star = require('@star/cloudprnt-sdk');

async function printOrder(order) {
  const escpos = generateEscPosCommands(order);

  await star.api.createPrintJob({
    printerSerialNumber: '12AB34CD', // Unique per printer
    data: escpos.toString('base64'),
    jobType: 'receipt'
  });
}

// Printer-side (handled by Star firmware)
// Printer firmware automatically polls every 30 seconds
// Retrieves jobs, prints, reports status
```

**Pros**:
- ✅ **Minimal setup**: Just register printer serial number
- ✅ **Printer-agnostic**: Works with any Star CloudPRNT printer
- ✅ **Stateless**: No agent installation
- ✅ **Reliable**: Star handles polling retry logic

**Cons**:
- ❌ **Star-only ecosystem**: Only works with Star Micronics printers
- ❌ **Polling latency**: 30-60 second delay before printing (unacceptable for kitchen)
- ❌ **Printer cost**: Star thermal printers are 20-30% more expensive
- ❌ **Dependency on Star**: If Star API goes down, you can't print
- ❌ **Limited integration**: Can't do complex order routing (e.g., separate receipt + kitchen)

**Best for**: Small restaurants with Star printers already, non-time-critical printing

**Cost analysis**:
- Star CloudPRNT: Usually included with printer or $50-100/year
- Star TSP143 printer: ~$500 (vs Epson TM-T88V ~$350)
- Delay acceptable? Only if not kitchen critical

---

## Part 3: Trade-Off Matrix

| Feature | Local Node.js | QZ Tray | Electron | CloudPRNT |
|---------|---------------|---------|----------|-----------|
| **USB printers** | ❌ No | ✅ Yes | ✅ Yes | ❌ No |
| **Network printers** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Installation** | 🟡 Medium | 🟡 Medium | ❌ Hard | ✅ Easy |
| **Kitchen latency** | 🟡 500ms-2s | ✅ <100ms | ✅ <100ms | ❌ 30-60s |
| **Offline support** | ✅ Excellent | ✅ Excellent | ✅ Excellent | ❌ None |
| **License cost/yr** | ✅ $0 | ❌ $150/printer | ✅ $0 | 🟡 $50-100 |
| **Scalability** | ✅ Easy | 🟡 Hard | 🟡 Hard | ✅ Easy |
| **iPad support** | ❌ No | ❌ No | ❌ No | ✅ Yes (native app) |
| **Maintenance burden** | 🟡 Medium | ❌ High | ❌ High | ✅ Low |
| **Printer flexibility** | ✅ Any | ✅ Any | ✅ Any | ❌ Star only |

---

## Part 4: Industry Reality Check

### What the Big Players Actually Do

**Toast POS**: iPad app (Electron equivalent) with network printers only
- Why? iPad ecosystem, excellent app distribution, no agent installation

**Square for Restaurants**: Native Android terminal (proprietary) + network printers
- Why? Control over hardware, certification, less tech support burden

**Lightspeed**: Flexible local device (any tablet) + network printers
- Why? Lower cost, restaurant can choose hardware, reduces support

**Odoo POS**: Electron desktop app (small/medium) + QZ Tray (web)
- Why? Open-source community uses Electron; enterprises use QZ Tray

**Fudo (inferred)**: iPad app (native) + network printers + delivery integration
- Why? Same as Toast; focus on delivery routing, not printer tech

### The Latency Reality

- **Kitchen tickets**: <1s is nice, 2s is acceptable, >5s is unacceptable
- **Customer receipts**: 2-5s is fine
- **CloudPRNT 30-60s**: Only works for pre-printed labels, not kitchen

This is why **CloudPRNT is rarely used for kitchen printing**, only for post-transaction receipts or labels.

---

## Part 5: Recommendation for Que Copado / Next.js SaaS

### Short Answer: Local Node.js Agent (TCP:9100)

**Why?**
1. **You already have the stack**: Next.js backend, can add a Node.js worker
2. **Restaurant network-first**: Medium/larger restaurants have network printers
3. **Scalability**: Supports 10,000+ restaurants without licensing costs
4. **Developer flexibility**: ESC/POS is well-documented, community libraries solid
5. **No installation friction**: Agent runs on restaurant's existing server/NAS
6. **Pure SaaS model**: No native app, no client-side agent, no QZ Tray licensing

### Implementation Roadmap for Que Copado

**Phase 1: Proof of Concept (2-4 weeks)**
```
1. Add "printer_settings" table to Supabase
   - restaurant_id, printer_ip, printer_port (default 9100), printer_type

2. Create print-queue system
   - orders table gets "print_status" column (not_printed, printed, failed)

3. Deploy Node.js print agent
   - runs on restaurant's NAS/server/Raspberry Pi (Docker container)
   - polls /api/print-queue?location_id=X every 500ms
   - formats ESC/POS and sends to TCP:9100

4. Admin UI for printer config
   - Test connection button
   - Printer model selector (Epson, Star, Brother, Bixolon)
   - Queue monitor (show pending prints)
```

**Phase 2: Multi-Printer Routing (4-6 weeks)**
```
1. Extend recipe system to include "print_location"
   - Kitchen items → Kitchen Printer #1
   - Beverages → Bar Printer #2
   - Custom items → Main Printer

2. Order-to-printer routing logic
   - Group order items by destination
   - Send multiple print jobs per order

3. Print receipt + kitchen tickets
   - Receipt: after payment
   - Kitchen: immediately on order creation
```

**Phase 3: Enterprise Features (6-8 weeks)**
```
1. Offline queue (SQLite on agent)
   - Agent stores failed prints locally
   - Retries when cloud reconnects

2. Print analytics
   - Track print success/failure rates
   - Alert on printer offline (no successful prints in 30 min)

3. Logo & customization
   - Restaurant branding on receipts
   - Configurable receipt format
```

### Code Structure for Que Copado

```
/app/api/
  /printers/
    route.ts              # GET list, POST create, PUT update
    /[id]/config/route.ts # Test connection
    /[id]/queue/route.ts  # Print queue endpoint (called by agent)

/lib/
  /services/
    printer-service.ts    # ESC/POS command generation
    queue-service.ts      # Print queue logic

/types/
  printer.ts             # Types for printer settings, jobs, etc.

/scripts/
  print-agent.ts         # Node.js worker (can be separate Docker service)
```

### Database Schema Addition

```sql
-- Printers table
CREATE TABLE restaurant_printers (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name TEXT,
  printer_type TEXT CHECK (printer_type IN ('epson', 'star', 'brother', 'bixolon')),
  ip_address INET NOT NULL,
  port INT DEFAULT 9100,
  width INT DEFAULT 80, -- 80mm or 58mm
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Print queue
CREATE TABLE print_jobs (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  printer_id UUID NOT NULL REFERENCES restaurant_printers(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  job_type TEXT CHECK (job_type IN ('receipt', 'kitchen_ticket')),
  escpos_data BYTEA, -- Raw ESC/POS commands
  status TEXT CHECK (status IN ('pending', 'printing', 'success', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  printed_at TIMESTAMP
);

-- Printer status (for monitoring)
CREATE TABLE printer_status_log (
  id UUID PRIMARY KEY,
  printer_id UUID NOT NULL REFERENCES restaurant_printers(id),
  is_online BOOLEAN,
  last_heartbeat TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Local Print Agent (Docker-Ready)

```typescript
// scripts/print-agent.ts
import { createClient } from '@supabase/supabase-js';
import { generateEscPosReceipt } from '@/lib/services/printer-service';
import net from 'net';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Server key, not anon
);

const POLL_INTERVAL = 500; // 500ms
const BATCH_SIZE = 10;

async function pollAndPrint() {
  // Find pending jobs
  const { data: jobs } = await supabase
    .from('print_jobs')
    .select('*, restaurant_printers(*), orders(*, order_items(*))')
    .eq('status', 'pending')
    .limit(BATCH_SIZE)
    .order('created_at', { ascending: true });

  if (!jobs?.length) return;

  for (const job of jobs) {
    try {
      await sendToPrinter(job);
    } catch (error) {
      console.error(`Print job ${job.id} failed:`, error);
      await supabase
        .from('print_jobs')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', job.id);
    }
  }
}

async function sendToPrinter(job: any) {
  const { ip_address, port, printer_type, width } = job.restaurant_printers;

  // Generate ESC/POS commands
  const escpos = generateEscPosReceipt(job.orders, {
    printerType: printer_type,
    width: width
  });

  // Send via TCP:9100
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: ip_address,
      port: port || 9100,
      timeout: 5000
    });

    socket.write(escpos, () => {
      socket.end();
      // Mark as success
      supabase
        .from('print_jobs')
        .update({ status: 'success', printed_at: new Date() })
        .eq('id', job.id)
        .then(() => resolve(true));
    });

    socket.on('error', reject);
  });
}

// Main loop
setInterval(pollAndPrint, POLL_INTERVAL);
console.log('Print agent running...');
```

### ESC/POS Generation Helper

```typescript
// lib/services/printer-service.ts
export function generateEscPosReceipt(order: Order, options: PrinterOptions): Buffer {
  const commands: number[] = [];

  // Initialize printer
  commands.push(0x1B, 0x40); // ESC @

  // Set width (80mm or 58mm)
  if (options.width === 58) {
    commands.push(0x1B, 0x32); // ESC 2 (compressed)
  }

  // Header
  addLine(commands, `Order #${order.id}`, 'bold');
  addLine(commands, new Date().toLocaleString('es-AR'));
  addLine(commands, '─'.repeat(32));

  // Items
  for (const item of order.order_items) {
    addLine(commands, `${item.qty}x ${item.name}`);
    addLine(commands, `  $${formatPrice(item.price * item.qty)}`, 'right');
  }

  // Totals
  addLine(commands, '─'.repeat(32));
  addLine(commands, `Total: $${formatPrice(order.total)}`, 'bold');

  // Cut
  commands.push(0x1D, 0x56, 0x00); // GS V 0 (partial cut)

  return Buffer.from(commands);
}

function addLine(commands: number[], text: string, style?: 'bold' | 'right') {
  if (style === 'bold') {
    commands.push(0x1B, 0x45, 0x01); // ESC E 1
  }
  if (style === 'right') {
    commands.push(0x1B, 0x61, 0x02); // ESC a 2 (right align)
  }
  commands.push(...Buffer.from(text + '\n'));
  commands.push(0x1B, 0x61, 0x00); // Reset align
  if (style === 'bold') {
    commands.push(0x1B, 0x45, 0x00); // ESC E 0
  }
}
```

---

## Part 6: Vendor Comparison Summary

### For Que Copado Specifically

| Factor | Node.js Agent | QZ Tray | Electron | CloudPRNT |
|--------|-------------|---------|----------|-----------|
| **Next.js compatibility** | ✅ Excellent | 🟡 Browser only | ❌ Separate | 🟡 Slow |
| **Que Copado roadmap fit** | ✅ Yes | ❌ Too complex | ❌ Overkill | ❌ Too slow |
| **Restaurant setup complexity** | 🟡 Medium | ❌ High | ❌ Very high | ✅ Easy |
| **Support cost** | 🟡 Medium | ❌ High | ❌ High | ✅ Low |
| **Long-term scalability** | ✅ Excellent | ❌ Licensing hell | 🟡 OK | 🟡 Vendor locked |

### Recommendation: **Local Node.js Agent**

Start with Node.js agent because:
1. You control the technology stack
2. No vendor lock-in
3. Scales from 1 to 10,000 restaurants without licensing costs
4. ESC/POS is a stable, well-understood standard
5. You can pivot to QZ Tray or CloudPRNT later if needed (for SMB without network printers)

---

## References

- [Toast POS - Adding Kitchen Printers](https://doc.toasttab.com/doc/platformguide/adminAddKitchenPrinter.html)
- [Square - Printer Compatibility](https://squareup.com/us/en/compatibility/accessories/printers)
- [Lightspeed Restaurant - Printing Setup](https://resto-support.lightspeedhq.com/hc/en-us/articles/226305287-Adding-printers)
- [Star Micronics - CloudPRNT SDK](https://github.com/star-micronics/cloudprnt-sdk)
- [Epson ESC/POS Reference](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/index.html)
- [node-thermal-printer - npm](https://www.npmjs.com/package/node-thermal-printer)
- [QZ Tray Documentation](https://qz.io/)
- [Electron Printing Guide](https://www.electronjs.org/docs/tutorial/printing)
