import type { Context, MiddlewareHandler } from 'hono'
import { logger } from './logger.js'

export type RateLimitOptions = {
  /** Length of the sliding window in milliseconds. */
  windowMs: number
  /** Maximum number of requests per client within one window. */
  max: number
}

/** Hit timestamps (epoch ms) per client key, newest last. */
export type RateLimitStore = Map<string, number[]>

/** Used when no proxy header identifies the client — everyone shares one bucket. */
const UNKNOWN_CLIENT = 'unknown'

/**
 * Railway terminates TLS at its proxy, so the socket address is always the proxy.
 * `x-forwarded-for` is a comma-separated chain and the first entry is the original
 * client. Falls back to `cf-connecting-ip`, then to a shared bucket — never to the
 * socket address, which would put every request behind the proxy in one bucket
 * without saying so.
 */
function clientKey(c: Context): string {
  const forwardedFor = c.req.header('x-forwarded-for')
  const firstHop = forwardedFor?.split(',')[0]?.trim()
  if (firstHop !== undefined && firstHop !== '') {
    return firstHop
  }

  const cloudflareIp = c.req.header('cf-connecting-ip')?.trim()
  if (cloudflareIp !== undefined && cloudflareIp !== '') {
    return cloudflareIp
  }

  return UNKNOWN_CLIENT
}

/** Drops hits that fell out of the window, and keys left with none. */
function prune(store: RateLimitStore, cutoff: number): void {
  for (const [key, hits] of store) {
    const recent = hits.filter((hit) => hit > cutoff)
    if (recent.length === 0) {
      store.delete(key)
    } else {
      store.set(key, recent)
    }
  }
}

/**
 * Per-process sliding-window rate limiter backed by an in-memory Map (no Redis by
 * design): state resets on restart and is not shared between instances.
 *
 * Expiry is swept on every request rather than by `setInterval`, so an idle process
 * holds no timer and the store cannot outlive the traffic that filled it.
 */
export function rateLimit(
  options: RateLimitOptions,
  store: RateLimitStore = new Map(),
): MiddlewareHandler {
  const { windowMs, max } = options

  return async (c, next) => {
    const now = Date.now()
    prune(store, now - windowMs)

    const key = clientKey(c)
    const hits = store.get(key) ?? []

    if (hits.length >= max) {
      const oldest = hits[0] ?? now
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
      const windowMinutes = Math.round(windowMs / 60_000)

      logger.warn('rate limit exceeded', {
        identified: key !== UNKNOWN_CLIENT,
        hits: hits.length,
        retryAfterSeconds,
      })

      c.header('Retry-After', String(retryAfterSeconds))
      return c.json(
        {
          error: `Przekroczono limit zapytań (${max} na ${windowMinutes} min). Spróbuj ponownie za ${retryAfterSeconds} s.`,
        },
        429,
      )
    }

    hits.push(now)
    store.set(key, hits)
    await next()
  }
}
