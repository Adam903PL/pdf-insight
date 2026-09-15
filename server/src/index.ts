import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { corsMiddleware } from './cors.js'
import { rateLimit } from './rateLimit.js'

const app = new Hono()

app.use('/api/*', corsMiddleware())
// TODO: tune limits once Gemini quota is known.
app.use('/api/*', rateLimit({ windowMs: 60_000, max: 10 }))

app.get('/health', (c) => c.json({ ok: true }))

// TODO: validate body with AnalyzeRequestSchema, call analyzeDocument, map errors to HTTP codes.
app.post('/api/analyze', (c) => c.json({ error: 'Not implemented' }, 501))

const port = Number(process.env.PORT ?? 3000)
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`PORT must be a positive integer, got "${process.env.PORT ?? ''}"`)
}

serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(`pdf-insight server listening on port ${info.port}\n`)
})
