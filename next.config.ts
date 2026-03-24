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

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
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
