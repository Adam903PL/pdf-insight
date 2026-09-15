import type { MiddlewareHandler } from 'hono'

export type RateLimitOptions = {
  /** Length of the fixed window in milliseconds. */
  windowMs: number
  /** Maximum number of requests per client within one window. */
  max: number
}

export type RateLimitEntry = {
  count: number
  /** Epoch milliseconds at which the current window resets. */
  resetAt: number
}

/**
 * Per-process rate limiter backed by an in-memory Map (no Redis by design):
 * state resets on restart and is not shared between instances.
 */
export function rateLimit(
  _options: RateLimitOptions,
  _store: Map<string, RateLimitEntry> = new Map(),
): MiddlewareHandler {
  return async (_c, next) => {
    // TODO: key by client IP (x-forwarded-for behind Railway's proxy), count hits in the store,
    // respond 429 with Retry-After when over the limit. Pass-through until implemented.
    await next()
  }
}
