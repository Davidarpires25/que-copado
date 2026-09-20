import { test, expect } from '@playwright/test'
import { rest } from './local'

/**
 * GET /api/agent/payment-info — los datos para transferir.
 *
 * Existe porque un cliente elegía transferencia por WhatsApp, el agente le
 * tomaba el pedido y se quedaba sin nada que darle: los datos estaban en la
 * base pero no había por dónde leerlos.
 *
 * Lo que se comprueba es la **forma exacta** contra la que el agente ya está
 * implementado (`app/pos/cliente.py`, `tests/test_transferencia.py` en el repo
 * AgentePOS). Un contrato que se prueba de un solo lado no es un contrato.
 */

const SECRETO = 'secreto-de-prueba-para-los-tests'
const RUTA = '/api/agent/payment-info'

const ALIAS = 'Quecopado2026'
const CBU = '0000003100036988175010'
const TITULAR = 'Marcio Maximiliano De Jesús Arpires'

/** Deja los tres campos como diga el caso. */
const configurar = (campos: Record<string, string | null>) =>
  rest('business_settings?id=not.is.null', {
    method: 'PATCH',
    body: JSON.stringify(campos),
  })

test.afterAll(() =>
  configurar({ transfer_alias: null, transfer_cbu: null, transfer_titular: null })
)

test('sin el secreto no contesta', async ({ request }) => {
  const sinHeader = await request.get(RUTA)
  expect(sinHeader.status()).toBe(401)

  const conOtro = await request.get(RUTA, { headers: { 'x-agent-secret': 'otro' } })
  expect(conOtro.status()).toBe(401)
})

test('con los tres datos cargados los devuelve', async ({ request }) => {
  await configurar({ transfer_alias: ALIAS, transfer_cbu: CBU, transfer_titular: TITULAR })

  const res = await request.get(RUTA, { headers: { 'x-agent-secret': SECRETO } })
  expect(res.status()).toBe(200)
  expect(await res.json()).toEqual({
    transferencia: { alias: ALIAS, cbu: CBU, titular: TITULAR },
  })
})

test('que el local no los haya cargado no es un error', async ({ request }) => {
  await configurar({ transfer_alias: null, transfer_cbu: null, transfer_titular: null })

  const res = await request.get(RUTA, { headers: { 'x-agent-secret': SECRETO } })
  // 200 y no 404: el agente distingue "el local no lo configuró" de "algo se
  // rompió", y en el primer caso pasa la conversación a una persona en vez de
  // inventar un alias.
  expect(res.status()).toBe(200)
  expect(await res.json()).toEqual({ transferencia: null })
})

test('sin titular tampoco sirve, aunque haya alias y CBU', async ({ request }) => {
  await configurar({ transfer_alias: ALIAS, transfer_cbu: CBU, transfer_titular: '' })

  const res = await request.get(RUTA, { headers: { 'x-agent-secret': SECRETO } })
  expect(res.status()).toBe(200)
  // El cliente carga el alias en su banco y sin el nombre no sabe si le está
  // transfiriendo al local o a un desconocido. Los tres o ninguno, y la
  // garantía vive acá para que valga para cualquier consumidor.
  expect(await res.json()).toEqual({ transferencia: null })
})
