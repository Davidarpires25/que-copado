'use client'

import { User, Phone, MapPin, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { telefonoWhatsApp } from '@/lib/utils/phone'

interface CustomerBlockProps {
  name?: string | null
  phone?: string | null
  address?: string | null
  zoneName?: string | null
  mapsUrl?: string | null
  /** 'card' lleva marco y titulo (drawer de pedidos); 'plain' va al ras (panel de cobro). */
  variant?: 'card' | 'plain'
}

/**
 * Los datos de quien recibe el pedido.
 *
 * Vivia escrito en el drawer de pedidos y otra vez, distinto, en el panel de
 * cobro de caja. Ahora es uno solo, con la fila de icono que ya usaba el
 * drawer: el icono dice de que dato se trata sin gastar una columna de
 * etiquetas, que en un panel de 340px se lleva un tercio del ancho.
 *
 * Dos cosas que el original hacia mal:
 *
 * No comprobaba que hubiera cliente, asi que un pedido de mostrador —que no
 * tiene— mostraba el titulo "Cliente" y tres iconos con la nada al lado.
 *
 * Y el telefono iba a `tel:`, que en una computadora de mostrador no hace nada.
 * Va a WhatsApp, que es por donde se confirma y se coordina la entrega.
 */
export function CustomerBlock({
  name, phone, address, zoneName, mapsUrl, variant = 'card',
}: CustomerBlockProps) {
  if (!name && !phone && !address) return null

  const whatsapp = phone ? telefonoWhatsApp(phone) : null

  return (
    <div
      className={cn(
        'space-y-2.5',
        variant === 'card'
          ? 'rounded-xl bg-[var(--admin-bg)] p-4'
          : 'border-b border-[var(--admin-border)] px-5 py-3'
      )}
    >
      {variant === 'card' && (
        <h3 className="mb-3 font-semibold text-[var(--admin-text)]">Cliente</h3>
      )}

      {name && (
        <Fila icon={User}>
          <p className="text-[13px] font-semibold text-[var(--admin-text)]">{name}</p>
        </Fila>
      )}

      {phone && (
        <Fila icon={Phone}>
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[13px] text-[var(--admin-accent-text)] hover:underline"
            >
              {phone}
            </a>
          ) : (
            // Pedido viejo con un telefono que no sirve para armar el link.
            <span
              title="No se puede abrir WhatsApp con este número"
              className="text-[13px] text-[var(--admin-text-muted)]"
            >
              {phone}
            </span>
          )}
        </Fila>
      )}

      {address && (
        <Fila icon={MapPin}>
          <p className="text-[13px] leading-snug text-[var(--admin-text)]">{address}</p>
          {zoneName && (
            <p className="mt-0.5 text-[12px] text-[var(--admin-text-muted)]">Zona: {zoneName}</p>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank" rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[12px] text-[var(--admin-accent-text)] hover:underline"
            >
              Ver en Google Maps
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </Fila>
      )}
    </div>
  )
}

function Fila({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-text-muted)]" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
