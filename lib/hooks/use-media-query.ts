'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Suscripcion a una media query.
 *
 * `matchMedia` es un store externo del navegador, asi que se lee con
 * `useSyncExternalStore` en vez de `useState` + `useEffect`: eso evita el
 * render extra (y el flash de layout) que produce sembrar el estado en un
 * efecto despues del primer pintado.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    },
    [query]
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  // En SSR no hay matchMedia: asumimos el caso mobile-first (no match).
  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
