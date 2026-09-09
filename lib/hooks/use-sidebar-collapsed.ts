'use client'

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'admin-sidebar-collapsed'

/**
 * Estado colapsado del sidebar del admin, persistido en localStorage.
 *
 * Se modela como un store externo (`useSyncExternalStore`) en lugar de
 * `useState` + `useEffect`: leer localStorage dentro de un efecto obliga a un
 * segundo render y produce un salto visible del sidebar tras la hidratacion.
 * Ademas mantiene sincronizadas las pestanas abiertas del admin.
 */

const listeners = new Set<() => void>()
let snapshot: boolean | null = null
let storageBound = false

function readStorage(): boolean {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'false') === true
  } catch {
    // Modo privado o storage bloqueado: el sidebar arranca expandido.
    return false
  }
}

function emit(): void {
  snapshot = null
  listeners.forEach((listener) => listener())
}

function subscribe(onStoreChange: () => void): () => void {
  if (!storageBound) {
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) emit()
    })
    storageBound = true
  }
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

function getSnapshot(): boolean {
  if (snapshot === null) snapshot = readStorage()
  return snapshot
}

// En el servidor no existe localStorage. React reconcilia el valor real tras
// la hidratacion sin disparar un hydration mismatch.
function getServerSnapshot(): boolean {
  return false
}

export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggle = useCallback(() => {
    const next = !getSnapshot()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Sin persistencia: igual emitimos para que la UI responda.
    }
    emit()
  }, [])

  return [collapsed, toggle]
}
