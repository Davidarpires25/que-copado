# Plan: Integración Impresora Térmica

## Fase 1 — USB (implementar primero)

Agente local Node.js que corre en la PC del local, escucha en `localhost:3001`,
recibe datos del ticket desde el browser y escribe ESC/POS a `/dev/usb/lp0`.

### Arquitectura
```
[Browser POS] → fetch('http://localhost:3001/print', datos) → [Agente local] → /dev/usb/lp0
```

### Pasos
- [ ] Crear `print-agent/` en la raíz del repo (proyecto Node.js independiente)
- [ ] `npm install node-thermal-printer` en el agente
- [ ] Servidor HTTP Express/Fastify en puerto 3001
- [ ] Endpoint `POST /print` que recibe `{ orderId, type: 'kitchen'|'receipt', items, order }`
- [ ] Generar ticket ESC/POS con `node-thermal-printer` (interfaz: `/dev/usb/lp0`)
- [ ] Reemplazar `printInBackground()` y `window.open(...print)` en `pos-interface.tsx`
  por `fetch('http://localhost:3001/print', { body: JSON.stringify(datos) })`
- [ ] Fallback: si el agente no responde, usar `window.print()` como antes
- [ ] Script de instalación / instrucciones para correrlo en el local

### Notas técnicas
- Impresora detectada en: `usb://EML/POS-80C?serial=012345678AB` → `/dev/usb/lp0`
- Permisos: usuario debe estar en grupo `lp` (ya está en este caso)
- CUPS configurado con cola `termica` (raw)
- El agente puede usar interfaz directa `/dev/usb/lp0` o CUPS (`printer:termica`)
- CORS: el agente necesita `Access-Control-Allow-Origin: *` para recibir del browser

---

## Fase 2 — LAN/Red (arquitectura profesional, para después)

La impresora OCPP-80S tiene puerto LAN. Conectada al router del local con IP estática.
El servidor Next.js NO puede llegar a la IP local → se necesita agente de todos modos,
pero el agente se conecta a la impresora por TCP en lugar de USB.

### Arquitectura
```
[Cloud - Next.js]
      ↓ actualiza columnas en orders
[Supabase - tabla orders]
      ↑ polling cada 1s
[Agente local Node.js]  →  TCP:9100  →  [Impresora LAN 192.168.1.x]
```

### Cambios en DB necesarios
```sql
ALTER TABLE orders ADD COLUMN kitchen_printed_at timestamptz;
ALTER TABLE orders ADD COLUMN receipt_printed_at timestamptz;
```

### Lógica del agente (Fase 2)
- Polling query:
  ```sql
  SELECT * FROM orders
  WHERE kitchen_printed_at IS NULL
  AND status != 'cancelado'
  AND created_at > now() - interval '1 hour'
  ```
- Después de imprimir: `UPDATE orders SET kitchen_printed_at = now() WHERE id = $1`
- Ventaja: no depende del browser, imprime aunque la ventana esté cerrada
- Ventaja: múltiples terminales pueden disparar pedidos, una sola impresora

### Ventajas vs Fase 1
- Sin dependencia del browser para imprimir
- Más robusto (reintenta si falla)
- Cualquier PC del local puede correr el agente (no necesita tener la impresora enchufada)
- Arquitectura usada por Lightspeed, similares SaaS POS

### Config impresora
- Asignar IP estática en el router (ej: `192.168.1.100`)
- Puerto estándar ESC/POS: `9100`
- Interfaz en `node-thermal-printer`: `tcp://192.168.1.100:9100`
