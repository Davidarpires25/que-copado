import fs from 'fs'
import os from 'os'
import path from 'path'
import { rest } from './local'

/**
 * Un turno de caja propio para un test, sin tocar el de nadie.
 *
 * La base local puede tener datos de alguien que esta probando la caja a mano:
 * su sesion con pedidos, mesas ocupadas. Nada de eso se borra (leccion 47). La
 * sesion abierta se estaciona —se marca cerrada— y las mesas ocupadas se
 * liberan mientras corre el test; al final vuelven con sus valores exactos.
 *
 * Antes de tocar nada se escribe un respaldo en disco. Si al arrancar ya hay
 * uno, es de una corrida cortada a mitad de camino: primero se restaura.
 */

type Respaldo = {
  sesiones: Record<string, unknown>[]
  mesas: { id: string; status: string; current_order_id: string | null }[]
}

const respaldo = (nombre: string) => path.join(os.tmpdir(), `que-copado-turno-${nombre}.json`)

async function restaurar(archivo: string, propia?: string) {
  const r: Respaldo = JSON.parse(fs.readFileSync(archivo, 'utf8'))
  if (propia) await rest(`cash_register_sessions?id=eq.${propia}`, { method: 'DELETE' })

  // Solo puede haber una sesion abierta. Si aparecio otra mientras corria el
  // test, no se borra a ciegas: el respaldo queda para restaurarlo a mano.
  const abiertas: { id: string }[] = await rest('cash_register_sessions?status=eq.open&select=id')
  if (r.sesiones.length && abiertas.length) {
    throw new Error(
      `No se restauro el turno: hay otra sesion abierta (${abiertas.map((a) => a.id).join(', ')}). ` +
      `El respaldo sigue en ${archivo}.`
    )
  }

  for (const m of r.mesas) {
    await rest(`restaurant_tables?id=eq.${m.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: m.status, current_order_id: m.current_order_id }),
    })
  }
  for (const s of r.sesiones) {
    const { id, ...valores } = s
    await rest(`cash_register_sessions?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(valores) })
  }
  fs.rmSync(archivo)
}

/**
 * Estaciona lo que haya y abre un turno propio. Devuelve su id.
 * `nombre` distingue el respaldo de cada archivo de test.
 */
export async function estacionarTurno(nombre: string, apertura = 20_000): Promise<string> {
  const archivo = respaldo(nombre)
  if (fs.existsSync(archivo)) {
    // Lo que quedo abierto de la corrida cortada es del test, no de nadie.
    const abiertas: { id: string }[] = await rest('cash_register_sessions?status=eq.open&select=id')
    for (const { id } of abiertas) await rest(`cash_register_sessions?id=eq.${id}`, { method: 'DELETE' }).catch(() => {})
    await restaurar(archivo)
  }

  const r: Respaldo = {
    sesiones: await rest('cash_register_sessions?status=eq.open&select=*'),
    mesas: await rest('restaurant_tables?status=neq.libre&select=id,status,current_order_id'),
  }
  fs.writeFileSync(archivo, JSON.stringify(r))

  await rest('cash_register_sessions?status=eq.open', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'closed', closed_at: new Date().toISOString() }),
  })
  await rest('restaurant_tables?status=neq.libre', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'libre', current_order_id: null }),
  })

  const [perfil] = await rest('profiles?select=id&role=eq.admin&limit=1')
  const [sesion] = await rest('cash_register_sessions', {
    method: 'POST',
    body: JSON.stringify({ opened_by: perfil.id, opening_balance: apertura, status: 'open' }),
  })
  return sesion.id
}

/**
 * Borra el turno propio y devuelve lo estacionado. Los pedidos del test los
 * borra el test antes de llamar a esto: son suyos y solo el sabe cuales son.
 */
export async function devolverTurno(nombre: string, propia: string) {
  const archivo = respaldo(nombre)
  if (!fs.existsSync(archivo)) return
  await restaurar(archivo, propia || undefined)
}
