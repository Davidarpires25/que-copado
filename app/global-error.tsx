'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFF7ED',
          padding: '1rem',
        }}>
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
              :(
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#7C2D12', marginBottom: '0.5rem' }}>
              Error crítico
            </h2>
            <p style={{ color: '#9A3412', marginBottom: '1.5rem' }}>
              La aplicación encontró un error inesperado.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#FEC501',
                color: 'black',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
