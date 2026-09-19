import { defineConfig } from '@playwright/test'

/**
 * Los tests de navegador corren contra el stack local de Supabase, nunca
 * contra produccion.
 *
 * Esa distincion costo una entrega sin probar: `.env.local` apunta al proyecto
 * real y el local esta en uso, asi que "no toques la base" era cierto para ahi
 * —y falso para el stack local, que es exactamente donde se prueba—. Por eso
 * las variables estan escritas aca y pisan a las del archivo: un test no puede
 * terminar borrando un insumo de verdad por leer el `.env` equivocado.
 *
 * Las claves son las de demo del stack local de Supabase, iguales en cualquier
 * maquina y publicadas en su documentacion. No son secretos.
 *
 * Antes de correr: `npm run db:start`.
 */

const SUPABASE_LOCAL = 'http://127.0.0.1:54321'

const ANON_LOCAL =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const SERVICE_LOCAL =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const PORT = 3005
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // Comparten la misma base: en paralelo se pisan los datos entre si.
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_LOCAL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_LOCAL,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_LOCAL,
      NEXT_PUBLIC_WHATSAPP_NUMBER: '5490000000000',
    },
  },
})
