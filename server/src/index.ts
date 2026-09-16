import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import type { ZodError } from 'zod'
import { corsMiddleware } from './cors.js'
import { AiTimeoutError, AiUpstreamError, AiValidationError, analyzeDocument } from './gemini.js'
import { logger } from './logger.js'
import { rateLimit } from './rateLimit.js'
import { AnalyzeRequestSchema, MAX_TEXT_LENGTH } from './schema.js'

const app = new Hono()

app.use('/api/*', corsMiddleware())
app.use('/api/*', rateLimit({ windowMs: 10 * 60_000, max: 10 }))

app.get('/health', (c) => c.json({ ok: true }))

/*
 * Polish copy per field, so a 400 never leaks a raw Zod message. Keys are the
 * dotted issue path from AnalyzeRequestSchema.
 */
const FIELD_MESSAGES: Record<string, string> = {
  fileName: 'pole "fileName" musi być niepustą nazwą pliku',
  pages: 'pole "pages" musi być dodatnią liczbą całkowitą',
  text: `pole "text" musi zawierać od 1 do ${MAX_TEXT_LENGTH} znaków`,
}

function describeRequestIssues(error: ZodError): string {
  const messages = new Set<string>()
  for (const issue of error.issues) {
    const field = issue.path.map(String).join('.')
    messages.add(
      FIELD_MESSAGES[field] ?? `pole "${field === '' ? 'body' : field}" jest nieprawidłowe`,
    )
  }
  return [...messages].join('; ')
}

app.post('/api/analyze', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Treść żądania musi być poprawnym dokumentem JSON.' }, 400)
  }

  const parsed = AnalyzeRequestSchema.safeParse(body)
  if (!parsed.success) {
    const details = describeRequestIssues(parsed.error)
    logger.warn('analyze request rejected', { reason: 'invalid_request', details })
    return c.json({ error: `Nieprawidłowe dane wejściowe: ${details}.` }, 400)
  }

  const { fileName, pages, text } = parsed.data
  const startedAt = Date.now()

  try {
    const result = await analyzeDocument(text, fileName, pages)
    logger.info('analyze request succeeded', {
      fileName,
      pages,
      textLength: text.length,
      durationMs: Date.now() - startedAt,
    })
    return c.json(result, 200)
  } catch (error) {
    const durationMs = Date.now() - startedAt

    if (error instanceof AiValidationError) {
      logger.error('analyze request failed', {
        reason: 'ai_validation',
        fileName,
        textLength: text.length,
        durationMs,
        issues: error.issues.join('; '),
      })
      return c.json(
        { error: 'Model zwrócił odpowiedź niezgodną ze schematem. Spróbuj ponownie za chwilę.' },
        502,
      )
    }

    if (error instanceof AiTimeoutError) {
      logger.error('analyze request failed', {
        reason: 'ai_timeout',
        fileName,
        textLength: text.length,
        durationMs,
      })
      return c.json(
        {
          error:
            'Analiza trwała zbyt długo i została przerwana. Spróbuj ponownie lub użyj krótszego dokumentu.',
        },
        504,
      )
    }

    // Everything below is a server-side fault: log the detail, return a generic message.
    logger.error('analyze request failed', {
      reason: error instanceof AiUpstreamError ? 'ai_upstream' : 'unexpected',
      status: error instanceof AiUpstreamError ? (error.status ?? null) : null,
      fileName,
      textLength: text.length,
      durationMs,
      detail: error instanceof Error ? error.message : String(error),
    })
    return c.json({ error: 'Wystąpił nieoczekiwany błąd serwera podczas analizy dokumentu.' }, 500)
  }
})

const port = Number(process.env.PORT ?? 3000)
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`PORT must be a positive integer, got "${process.env.PORT ?? ''}"`)
}

serve({ fetch: app.fetch, port }, (info) => {
  logger.info('server started', { port: info.port })
})
