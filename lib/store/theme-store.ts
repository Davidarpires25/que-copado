import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

/** Bandera propia, aparte del sobre de zustand. Ver `aplicar()`. */
const BANDERA = 'admin-dark'

/**
 * Deja el tema escrito en el DOM y en una bandera trivial de leer.
 *
 * El script anti-FOUC del layout necesita saber el tema ANTES de que corra
 * React, y hasta ahora lo sacaba parseando el sobre de zustand:
 * `JSON.parse(localStorage['admin-theme']).state.theme`. Eso ata el primer
 * pintado a un detalle interno de una libreria que acaba de pasar a v5: si el
 * sobre cambia de forma, el parseo falla en silencio —esta dentro de un
 * try/catch— y el panel arranca en claro hasta que hidrata. Que es exactamente
 * lo que se ve al refrescar la caja en oscuro: skeleton blanco y despues todo
 * oscuro.
 *
 * `admin-dark` es "1" o "0". No hay nada que parsear ni nada que se pueda
 * romper desde afuera.
 */
function aplicar(theme: Theme) {
  if (typeof document === 'undefined') return
  const oscuro = theme === 'dark'
  document.documentElement.classList.toggle('admin-dark', oscuro)
  try {
    localStorage.setItem(BANDERA, oscuro ? '1' : '0')
  } catch { /* modo privado, sin almacenamiento: el tema igual se aplico */ }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        aplicar(theme)
        set({ theme })
      },
    }),
    {
      name: 'admin-theme',
      // Al volver de localStorage, sincronizar el DOM y la bandera. Cubre
      // tambien la migracion: quien ya tenia el tema guardado se lleva la
      // bandera escrita en la primera carga.
      onRehydrateStorage: () => (estado) => {
        if (estado) aplicar(estado.theme)
      },
    }
  )
)
