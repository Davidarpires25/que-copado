'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { guardarFacturacion, probarConexion, type CambiosFacturacion, type EstadoFacturacion } from '@/app/actions/facturas'

/**
 * Ajustes → Facturación (change la-caja-emite-factura-c, decisión 7).
 *
 * Una sección más del panel, como las otras: los datos que el comprobante
 * tiene que decir, con qué medios de pago se factura solo al cobrar (como
 * Fudo), y "Probar conexión" para saber si los dos trámites de ARCA están
 * hechos antes de encender nada.
 */

const MEDIOS = [
  { valor: 'cash', etiqueta: 'Efectivo' },
  { valor: 'card', etiqueta: 'Tarjeta' },
  { valor: 'transfer', etiqueta: 'Transferencia' },
  { valor: 'mercadopago', etiqueta: 'Mercado Pago' },
]

const TODOS = MEDIOS.map((m) => m.valor)

interface Props {
  inicial: EstadoFacturacion
  field: string
  label: string
}

/** Lo que se edita, armado desde lo guardado. */
function desdeDatos(d: EstadoFacturacion['datos']): CambiosFacturacion {
  return {
    activa: d?.activa ?? false,
    razon_social: d?.razon_social ?? '',
    cuit: d?.cuit ?? '',
    punto_venta: d?.punto_venta ?? null,
    domicilio_comercial: d?.domicilio_comercial ?? '',
    ingresos_brutos: d?.ingresos_brutos ?? '',
    inicio_actividades: d?.inicio_actividades ?? null,
    medios_automaticos: d?.medios_automaticos ?? TODOS,
  }
}

export function FacturacionSection({ inicial, field, label }: Props) {
  const [form, setForm] = useState(() => desdeDatos(inicial.datos))
  const [guardado, setGuardado] = useState(form)
  const [guardando, setGuardando] = useState(false)
  const [probando, setProbando] = useState(false)
  const [prueba, setPrueba] = useState<{ ok: boolean; texto: string } | null>(null)
  const [confirmarEncendido, setConfirmarEncendido] = useState(false)

  const enProduccion = inicial.ambiente === 'produccion'
  const activa = guardado.activa
  const hayCambios = JSON.stringify({ ...form, activa }) !== JSON.stringify(guardado)
  const cambiar = <K extends keyof CambiosFacturacion>(campo: K, valor: CambiosFacturacion[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }))

  async function guardar(activaNueva = activa) {
    setGuardando(true)
    const c = { ...form, activa: activaNueva }
    const r = await guardarFacturacion(c)
    setGuardando(false)
    if (r.error) {
      toast.error(r.error)
      return
    }
    setForm(c)
    setGuardado(c)
    toast.success(
      activaNueva === activa ? 'Datos fiscales guardados' : activaNueva ? 'Facturación encendida' : 'Facturación apagada'
    )
  }

  function encenderOApagar() {
    if (activa) return void guardar(false)
    // En producción cada factura es real: se confirma sabiendo qué implica.
    if (enProduccion) return setConfirmarEncendido(true)
    void guardar(true)
  }

  async function probar() {
    setProbando(true)
    setPrueba(null)
    setPrueba(await probarConexion(form.cuit, form.punto_venta))
    setProbando(false)
  }

  const alternarMedio = (valor: string) =>
    cambiar(
      'medios_automaticos',
      form.medios_automaticos.includes(valor) ? form.medios_automaticos.filter((m) => m !== valor) : [...form.medios_automaticos, valor]
    )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--admin-text)]">Facturación</h2>
        <p className="mt-1.5 text-sm text-[var(--admin-text-muted)]">
          Factura C electrónica por ARCA, para monotributistas. Apagada, la caja funciona como
          siempre y el sistema no se comunica con ARCA.
        </p>
      </div>

      {!inicial.conCertificado && (
        <p className="text-sm text-aviso-texto">
          Esta instalación todavía no tiene cargado el certificado de ARCA: se pueden completar los
          datos, pero la facturación no se puede encender.
        </p>
      )}
      {inicial.conCertificado && !enProduccion && (
        <p className="text-sm text-aviso-texto">
          Modo de prueba (homologación de ARCA): las facturas que se emitan no tienen validez fiscal.
        </p>
      )}

      {/* Estado: una frase y un botón explícito, como el tope de stock. */}
      <div className="flex items-center gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--admin-text)]">
            {activa ? 'Se emiten facturas' : 'No se emiten facturas'}
          </p>
          <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">
            {activa
              ? 'Al cobrar con los medios tildados abajo, la factura sale sola. El resto se factura desde el Historial.'
              : 'Completá los datos y probá la conexión antes de encenderla.'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={encenderOApagar}
          disabled={guardando || (!activa && !inicial.conCertificado)}
          className={cn(
            'ml-auto shrink-0 h-11 text-[15px]',
            activa
              ? 'border-peligro/50 text-peligro-texto hover:bg-peligro/10'
              : 'border-exito/50 text-exito-texto hover:bg-exito/10'
          )}
        >
          {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {activa ? 'Apagar facturación' : 'Encender facturación'}
        </Button>
      </div>

      {/* Lo que el dueño hace una vez en ARCA. La guía completa está en
          docs/FACTURACION_ALTA_EN_ARCA.md. */}
      <div className="border-t border-[var(--admin-border)] pt-8">
        <h3 className="text-[15px] font-semibold text-[var(--admin-text)]">Antes, en ARCA</h3>
        <ol className="mt-2 space-y-1.5 text-sm text-[var(--admin-text-muted)] list-decimal pl-5">
          <li>
            Crear un punto de venta nuevo, con el sistema{' '}
            <span className="text-[var(--admin-text)]">«Factura electrónica – Monotributo – Web Services»</span>.
          </li>
          <li>
            En el Administrador de Relaciones, delegar el servicio{' '}
            <span className="text-[var(--admin-text)]">«Facturación Electrónica»</span>
            {inicial.cuitProveedor ? (
              <>
                {' '}en la CUIT <span className="font-mono text-[var(--admin-text)]">{inicial.cuitProveedor}</span>.
              </>
            ) : (
              ' en la CUIT del proveedor del sistema.'
            )}
          </li>
        </ol>
      </div>

      <div className="border-t border-[var(--admin-border)] pt-8 space-y-8">
        <h3 className="text-[15px] font-semibold text-[var(--admin-text)]">Datos del emisor</h3>

        <div>
          <label htmlFor="fc-razon" className={label}>Razón social</label>
          <Input id="fc-razon" value={form.razon_social} onChange={(e) => cambiar('razon_social', e.target.value)} className={cn(field, 'max-w-md')} />
          <p className="mt-2 text-sm text-[var(--admin-text-muted)]">Como figura en la constancia de inscripción de ARCA.</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 max-w-md">
          <div>
            <label htmlFor="fc-cuit" className={label}>CUIT</label>
            <Input
              id="fc-cuit"
              value={form.cuit}
              onChange={(e) => cambiar('cuit', e.target.value.replace(/\D/g, '').slice(0, 11))}
              inputMode="numeric"
              placeholder="20123456789"
              className={cn(field, 'font-mono tracking-wide')}
            />
          </div>
          <div>
            <label htmlFor="fc-pv" className={label}>Punto de venta</label>
            <Input
              id="fc-pv"
              value={form.punto_venta ?? ''}
              onChange={(e) => {
                const n = e.target.value.replace(/\D/g, '').slice(0, 5)
                cambiar('punto_venta', n ? Number(n) : null)
              }}
              inputMode="numeric"
              placeholder="3"
              className={cn(field, 'w-[140px]')}
            />
          </div>
        </div>

        <div>
          <label htmlFor="fc-domicilio" className={label}>Domicilio comercial</label>
          <Input id="fc-domicilio" value={form.domicilio_comercial} onChange={(e) => cambiar('domicilio_comercial', e.target.value)} className={cn(field, 'max-w-md')} />
        </div>

        <div className="grid gap-8 sm:grid-cols-2 max-w-md">
          <div>
            <label htmlFor="fc-iibb" className={label}>Ingresos brutos</label>
            <Input id="fc-iibb" value={form.ingresos_brutos} onChange={(e) => cambiar('ingresos_brutos', e.target.value)} placeholder="Número o «Exento»" className={field} />
          </div>
          <div>
            <label htmlFor="fc-inicio" className={label}>Inicio de actividades</label>
            <Input id="fc-inicio" type="date" value={form.inicio_actividades ?? ''} onChange={(e) => cambiar('inicio_actividades', e.target.value || null)} className={field} />
          </div>
        </div>
      </div>

      <fieldset className="border-t border-[var(--admin-border)] pt-8">
        <legend className="sr-only">Medios de pago que se facturan solos</legend>
        <h3 className="text-[15px] font-semibold text-[var(--admin-text)]" aria-hidden>
          Facturar automáticamente al cobrar con
        </h3>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
          {MEDIOS.map((m) => (
            <label key={m.valor} className="flex items-center gap-2.5 text-[15px] text-[var(--admin-text)] tactil:min-h-11 cursor-pointer">
              <input
                type="checkbox"
                checked={form.medios_automaticos.includes(m.valor)}
                onChange={() => alternarMedio(m.valor)}
                className="size-5 accent-[var(--admin-accent)]"
              />
              {m.etiqueta}
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm text-[var(--admin-text-muted)]">
          Lo que no se factura solo, se factura desde el Historial de la caja. Qué medios tildar es una
          decisión fiscal: consultala con tu contador.
        </p>
      </fieldset>

      <div className="border-t border-[var(--admin-border)] pt-8 flex flex-wrap items-center gap-4">
        <Button variant="outline" onClick={probar} disabled={probando || !inicial.conCertificado} className="h-11 text-[15px]">
          {probando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Probar conexión
        </Button>
        <p
          className={cn('text-sm', prueba ? (prueba.ok ? 'text-exito-texto' : 'text-peligro-texto') : 'text-[var(--admin-text-muted)]')}
          aria-live="polite"
        >
          {prueba?.texto ?? 'Usa la CUIT y el punto de venta de arriba, aunque no estén guardados.'}
        </p>
      </div>

      <div className="flex items-center gap-4 border-t border-[var(--admin-border)] pt-6">
        <Button
          onClick={() => void guardar()}
          disabled={guardando || !hayCambios}
          className="h-12 px-7 rounded-lg bg-[var(--admin-accent)] hover:bg-[#E5B001] text-black font-semibold disabled:opacity-100 disabled:bg-[var(--admin-surface-2)] disabled:text-[var(--admin-text-muted)]"
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        {hayCambios && (
          <p className="text-sm text-[var(--admin-text-muted)]" aria-live="polite">
            Tenés cambios sin guardar.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmarEncendido}
        onOpenChange={setConfirmarEncendido}
        title="Encender la facturación"
        description="Cada factura queda registrada en ARCA a nombre de esta CUIT y cuenta para la categoría del monotributo. Revisalo con tu contador antes de facturar cada venta."
        confirmLabel="Encender"
        onConfirm={() => {
          setConfirmarEncendido(false)
          void guardar(true)
        }}
      />
    </div>
  )
}
