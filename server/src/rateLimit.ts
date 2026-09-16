import type { Context, MiddlewareHandler } from 'hono'
import { logger } from './logger.js'

export type RateLimitOptions = {
  /** Length of the sliding window in milliseconds. */
  windowMs: number
  /** Maximum number of requests per client within one window. */
  max: number
}

/** Hit timestamps (epoch ms) per client key, oldest first. */
export type RateLimitStore = Map<string, number[]>

/** Used when no proxy header identifies the client — everyone shares one bucket. */
const UNKNOWN_CLIENT = 'unknown'

/**
 * Upper bound on distinct clients tracked at once. Keys are client IPs, and an
 * attacker holding many addresses (an IPv6 range, a botnet) could otherwise grow the
 * Map — and the per-request sweep over it — without limit. At most `max` timestamps
 * per key keeps a full store at a few MB and one sweep at ~10k entries.
 */
const MAX_TRACKED_CLIENTS = 10_000

/**
 * Railway terminates TLS at its edge, so the socket address is always the proxy.
 * The edge replaces any client-supplied `x-forwarded-for` with the real client IP
 * (verified against production: spoofed values landed in the caller's own bucket).
 * The LAST entry is read, not the first, so this stays correct if a proxy ever
 * appends instead of replacing — the leftmost entry is the one a client can forge.
 * Falls back to `cf-connecting-ip`, then to a shared bucket.
 */
function clientKey(c: Context): string {
  const lastHop = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim()
  if (lastHop !== undefined && lastHop !== '') {
    return lastHop
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
    // Hits are appended in time order, so if the oldest is still live, all are —
    // the common case costs one comparison and no allocation.
    if ((hits[0] ?? cutoff) > cutoff) {
      continue
    }
    const firstLive = hits.findIndex((hit) => hit > cutoff)
    if (firstLive === -1) {
      store.delete(key)
    } else {
      store.set(key, hits.slice(firstLive))
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

    // Evict the longest-tracked client rather than refusing new ones: failing closed
    // would let anyone with enough addresses lock every new visitor out.
    if (!store.has(key) && store.size >= MAX_TRACKED_CLIENTS) {
      const oldestKey = store.keys().next().value
      if (oldestKey !== undefined) {
        store.delete(oldestKey)
      }
    }

    hits.push(now)
    store.set(key, hits)
    await next()
  }
}
