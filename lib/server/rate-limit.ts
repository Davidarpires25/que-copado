/**
 * Simple in-memory rate limiter.
 * Works per-process — sufficient for single-instance restaurant deployment.
 * Replace with Redis (Upstash) when scaling to multi-instance SaaS.
 */

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

// Prune expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000)

/**
 * @param key       Unique identifier (e.g. `signin:email@x.com`, `order:1.2.3.4`)
 * @param max       Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= max) {
    return { allowed: false }
  }

  entry.count++
  return { allowed: true }
}
