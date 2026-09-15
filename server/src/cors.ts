import type { MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'

/**
 * CORS restricted to the single frontend origin from `ALLOWED_ORIGIN`.
 * Fails fast at startup when the variable is missing or is not a bare origin
 * (a wildcard `*` is never accepted).
 */
export function corsMiddleware(): MiddlewareHandler {
  const allowedOrigin = process.env.ALLOWED_ORIGIN
  if (!allowedOrigin) {
    throw new Error(
      'ALLOWED_ORIGIN is not set. Set it to the frontend origin, e.g. https://<github-user>.github.io',
    )
  }
  if (!URL.canParse(allowedOrigin) || new URL(allowedOrigin).origin !== allowedOrigin) {
    throw new Error(
      `ALLOWED_ORIGIN must be a single origin (scheme://host[:port], no path, no trailing slash, no wildcard), got "${allowedOrigin}"`,
    )
  }

  return cors({
    origin: allowedOrigin,
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 600,
  })
}
