import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs'

const SUPABASE_HOST = 'yyphmsxxzgjdvblfrfpv.supabase.co'

const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer policy — don't leak full URL to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features not needed
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  // Force HTTPS for 1 year
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js needs unsafe-inline + unsafe-eval for dev HMR; in prod only inline styles/scripts from Next.js itself
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // Images: self, data URIs, and Supabase Storage
      `img-src 'self' data: blob: https://${SUPABASE_HOST} https://tofuu.getjusto.com https://st.depositphotos.com https://www.yoquiero.com.ar https://encrypted-tbn0.gstatic.com https://static.wixstatic.com https://*.tile.openstreetmap.org`,
      // API calls: Supabase REST + realtime WebSocket + Sentry error reporting + Nominatim geocoding
      `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://*.ingest.us.sentry.io https://*.ingest.sentry.io https://nominatim.openstreetmap.org`,
      "font-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Block embedding in iframes on other sites
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

/**
 * Cuanto puede guardar el navegador cada cosa.
 *
 * Esto vivia en `netlify.toml`, y el proyecto se despliega en Vercel: o sea que
 * no lo leia nadie. Los tiles del mapa del checkout y las imagenes del menu se
 * volvian a bajar en cada carga.
 *
 * Aca funciona en cualquier plataforma, que es donde tenia que estar desde el
 * principio: es configuracion de la app, no del lugar donde corre.
 */
const cacheHeaders = [
  {
    // Lo que genera Next: el nombre lleva un hash, asi que nunca cambia sin
    // cambiar de nombre. Next ya las pone; quedan explicitas para que se lea.
    source: '/_next/static/:path*',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
  },
  {
    // Los tiles de Leaflet, que son los que mas pesan y nunca cambian.
    source: '/leaflet/:path*',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }],
  },
  {
    // Los logos y demas estaticos, que viven en la raiz de `public/`.
    //
    // La regla que habia apuntaba a `/public/*`, y eso no existe como ruta:
    // lo que esta en `public/` se sirve en la raiz. O sea que esa cabecera no
    // hubiera aplicado ni en la plataforma para la que estaba escrita.
    source: '/:archivo*.(svg|png|jpg|jpeg|webp|ico)',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      ...cacheHeaders,
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tofuu.getjusto.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'st.depositphotos.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.yoquiero.com.ar',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.wixstatic.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'yyphmsxxzgjdvblfrfpv.supabase.co',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: 'o4511089839243264',
  project: 'javascript-nextjs',
  // Upload source maps to Sentry for readable stack traces
  silent: true,
  // Automatically tree-shake Sentry debug code in production
  disableLogger: true,
  // Avoid sending huge source maps in CI
  widenClientFileUpload: true,
})
