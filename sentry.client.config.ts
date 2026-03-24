import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring (free tier friendly)
  tracesSampleRate: 0.1,

  // Only report errors in production
  enabled: process.env.NODE_ENV === 'production',

  // Hide source maps details from users
  debug: false,
})
