'use client'

import { useSyncExternalStore } from 'react'

/**
 * `false` en el servidor y durante la hidratacion; `true` despues, ya en el
 * navegador.
 *
 * Para lo que solo tiene sentido en el cliente —la hora local, lo guardado en
 * localStorage—: renderizarlo en el servidor da un texto distinto al del
 * navegador y React descarta el arbol al hidratar. `useSyncExternalStore` y no
 * `useState` + `useEffect`, que dispara un render en cascada.
 */
const sinSuscripcion = () => () => {}

export function useHydrated() {
  return useSyncExternalStore(sinSuscripcion, () => true, () => false)
}
