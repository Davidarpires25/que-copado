'use client'

import { useEffect, useRef, type DependencyList } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/** Techo del backoff. Sin el, un corte largo termina reintentando cada varios minutos. */
const ESPERA_MAX = 30_000

interface Opciones {
  /**
   * Se llama al reconectar despues de una caida, nunca en el arranque normal.
   *
   * Reconectar no trae lo que paso mientras el canal estuvo cerrado: esos
   * eventos ya no existen. Hay que releer.
   */
  onReconexion?: () => void
  /** Prefijo de los avisos en consola. Por defecto, el nombre del canal. */
  etiqueta?: string
}

/**
 * Una suscripcion de realtime que se reconecta sola.
 *
 * Las cuatro pantallas que escuchan cambios —caja, cocina, tabla de pedidos y
 * mapa de mesas— llamaban a `.subscribe()` sin callback de estado. Una
 * suscripcion que fallo se ve exactamente igual que una que anda y no tiene
 * novedades: silencio en los dos casos. Por eso nadie noto durante meses que la
 * publicacion `supabase_realtime` no incluia ninguna de las tablas que se
 * escuchan, y las cuatro pantallas eran codigo muerto con forma de
 * funcionalidad.
 *
 * Y aun con la publicacion arreglada el socket se cae: el token de auth no se
 * puede refrescar cuando varias pestañas pelean por el lock de Web Locks, se
 * corta la red, el navegador duerme la pestaña. Sin reintento el canal quedaba
 * muerto para el resto de la sesion, y la pantalla seguia ahi mostrando datos
 * viejos sin ningun indicio.
 *
 * @param nombre     Nombre del canal. Si dos pantallas comparten nombre comparten canal.
 * @param configurar Encadena los `.on(...)`. Recibe el canal y lo devuelve.
 * @param opciones   `onReconexion` y `etiqueta`.
 * @param deps       Igual que en useEffect: cuando cambian, el canal se rehace.
 *                   Van los callbacks que usan los handlers, porque quedan
 *                   capturados al configurar y si no se recrea el canal
 *                   terminarian llamando a closures viejas.
 */
export function useRealtimeChannel(
  nombre: string,
  configurar: (canal: RealtimeChannel) => RealtimeChannel,
  opciones: Opciones = {},
  deps: DependencyList = []
) {
  const configurarRef = useRef(configurar)
  const opcionesRef = useRef(opciones)
  useEffect(() => { configurarRef.current = configurar })
  useEffect(() => { opcionesRef.current = opciones })

  useEffect(() => {
    const supabase = createClient()
    let canal: RealtimeChannel | null = null
    let reintento: ReturnType<typeof setTimeout> | null = null
    let intentos = 0
    let cancelado = false

    const conectar = () => {
      if (cancelado) return

      canal = configurarRef.current(supabase.channel(nombre)).subscribe((estado, err) => {
        if (cancelado) return

        if (estado === 'SUBSCRIBED') {
          if (intentos > 0) {
            intentos = 0
            opcionesRef.current.onReconexion?.()
          }
          return
        }

        if (estado !== 'CLOSED' && estado !== 'CHANNEL_ERROR' && estado !== 'TIMED_OUT') return

        console.warn(`[${opcionesRef.current.etiqueta ?? nombre}] realtime:`, estado, err ?? '')

        // 1s, 2s, 4s... con techo. Sin backoff, un servidor caido se come un
        // reintento por segundo.
        const espera = Math.min(1000 * 2 ** intentos, ESPERA_MAX)
        intentos += 1

        reintento = setTimeout(() => {
          if (cancelado) return
          if (canal) void supabase.removeChannel(canal)
          conectar()
        }, espera)
      })
    }

    conectar()

    return () => {
      cancelado = true
      if (reintento) clearTimeout(reintento)
      if (canal) void supabase.removeChannel(canal)
    }
    // `deps` lo elige quien llama, igual que en useEffect. El linter no puede
    // verificar un array que recibe por parametro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, ...deps])
}
