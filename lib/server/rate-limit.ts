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
 * Checks if a key is currently rate-limited WITHOUT incrementing the counter.
 */
export function isRateLimited(key: string, max: number): boolean {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) return false
  return entry.count >= max
}

/**
 * Records a failure for rate limiting purposes (increments counter).
 * Call this only after a failed attempt, not on success.
 *
 * @param key       Unique identifier (e.g. `signin:email@x.com`)
 * @param max       Max failures allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export function recordFailure(key: string, max: number, windowMs: number): void {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (entry.count < max) {
    entry.count++
  }
}

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
