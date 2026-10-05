import assert from 'node:assert/strict'
import { test } from 'node:test'

// Never load .env or call a provider in these tests. Only HTTP is substituted; the
// real Gemini SDK, OpenRouter client, Zod contract and fallback flow run together.
process.env.GEMINI_API_KEY = 'test-gemini-placeholder'
process.env.OPENROUTER_API_KEY = 'test-openrouter-placeholder'
const { analyzeDocument, ANALYSIS_BUDGET_MS } = await import('../dist/analysis.js')
const { GEMINI_TIMEOUT_MS } = await import('../dist/gemini.js')
const { OPENROUTER_MODEL } = await import('../dist/openrouter.js')
const { AiQuotaError, AiValidationError } = await import('../dist/ai.js')

const valid = {
  document: {
    fileName: 'model-guessed.pdf',
    pages: 99,
    language: 'pl',
    type: 'umowa',
    title: 'Umowa serwisowa',
    date: null,
  },
  summary: 'Dokument opisuje serwis. Usługa trwa rok. Cena wynosi 1200 PLN.',
  keyPoints: ['Serwis', 'Okres jednego roku', 'Cena 1200 PLN'],
  entities: { organizations: [], people: [] },
  amounts: [{ value: 1200, currency: 'PLN', context: 'cena' }],
  dates: [],
  keywords: ['serwis'],
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const geminiOk = (text) => json({ candidates: [{ content: { role: 'model', parts: [{ text }] } }] })
const geminiError = (status) =>
  json({ error: { code: status, message: 'Gemini failed', status: 'UNAVAILABLE' } }, status)
const completion = (content) => json({ choices: [{ message: { role: 'assistant', content } }] })

/** Routes each fetch to the Gemini or OpenRouter handler; a missing handler fails the test. */
function providers(t, handlers) {
  const requests = { gemini: [], openrouter: [] }
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const target = String(url).includes('openrouter.ai') ? 'openrouter' : 'gemini'
    requests[target].push({ body: JSON.parse(init.body), headers: init.headers })
    const handler = handlers[target]
    assert.ok(handler, `Unexpected ${target} request`)
    return handler(requests[target].length)
  })
  return requests
}

test('Gemini answering skips the fallback entirely', async (t) => {
  const requests = providers(t, { gemini: () => geminiOk(JSON.stringify(valid)) })
  const result = await analyzeDocument('Document text', 'actual.pdf', 2)
  assert.equal(result.summary, valid.summary)
  assert.equal(requests.gemini.length, 1)
})

test('a Gemini 503 falls back to OpenRouter with trusted file metadata', async (t) => {
  const requests = providers(t, {
    gemini: () => geminiError(503),
    openrouter: () => completion(JSON.stringify(valid)),
  })
  const result = await analyzeDocument('Document text', 'actual.pdf', 2)

  assert.deepEqual(result.document, { ...valid.document, fileName: 'actual.pdf', pages: 2 })
  assert.equal(requests.openrouter.length, 1)
  const { body, headers } = requests.openrouter[0]
  assert.equal(headers.Authorization, 'Bearer test-openrouter-placeholder')
  assert.equal(body.model, OPENROUTER_MODEL)
  assert.equal(body.messages[0].role, 'system')
  assert.match(body.messages[1].content, /^<document>\nDocument text\n<\/document>$/)
})

test('OpenRouter gets a strict JSON Schema derived from the Gemini schema', async (t) => {
  const requests = providers(t, {
    gemini: () => geminiError(503),
    openrouter: () => completion(JSON.stringify(valid)),
  })
  await analyzeDocument('Document text', 'actual.pdf', 2)

  const format = requests.openrouter[0].body.response_format
  assert.equal(format.type, 'json_schema')
  assert.equal(format.json_schema.strict, true)
  const schema = format.json_schema.schema
  assert.equal(schema.type, 'object')
  assert.equal(schema.additionalProperties, false)
  assert.equal(schema.properties.document.additionalProperties, false)
  assert.deepEqual(schema.properties.document.properties.date.type, ['string', 'null'])
  assert.equal(schema.properties.keyPoints.minItems, 3)
  assert.equal(schema.properties.keyPoints.maxItems, 7)
  assert.equal(schema.properties.amounts.items.additionalProperties, false)
})

test('exhausted Gemini credits fall back too', async (t) => {
  const requests = providers(t, {
    gemini: () => geminiError(402),
    openrouter: () => completion(JSON.stringify(valid)),
  })
  await analyzeDocument('Document text', 'actual.pdf', 2)
  assert.equal(requests.openrouter.length, 1)
})

test('invalid Gemini output is not handed to the fallback', async (t) => {
  const requests = providers(t, { gemini: () => geminiOk('not json') })
  await assert.rejects(analyzeDocument('Document text', 'actual.pdf', 2), AiValidationError)
  assert.equal(requests.gemini.length, 2)
  assert.equal(requests.openrouter.length, 0)
})

test('OpenRouter output gets the same single correction attempt', async (t) => {
  const requests = providers(t, {
    gemini: () => geminiError(503),
    openrouter: (call) =>
      completion(call === 1 ? JSON.stringify({ ...valid, keyPoints: [] }) : JSON.stringify(valid)),
  })
  await analyzeDocument('Document text', 'actual.pdf', 2)

  assert.equal(requests.openrouter.length, 2)
  const retry = requests.openrouter[1].body.messages
  assert.equal(retry[2].role, 'assistant')
  assert.match(retry[3].content, /keyPoints/)
})

test('two invalid OpenRouter answers become a validation error, with no third call', async (t) => {
  const requests = providers(t, {
    gemini: () => geminiError(503),
    openrouter: () => completion('{'),
  })
  await assert.rejects(analyzeDocument('Document text', 'actual.pdf', 2), AiValidationError)
  assert.equal(requests.openrouter.length, 2)
})

test('both providers out of credits surfaces as a quota error', async (t) => {
  providers(t, {
    gemini: () => geminiError(402),
    openrouter: () => json({ error: { code: 402, message: 'Insufficient credits' } }, 402),
  })
  await assert.rejects(analyzeDocument('Document text', 'actual.pdf', 2), AiQuotaError)
})

test('a Gemini timeout falls back within the remaining overall budget', async (t) => {
  const geminiDeadline = new AbortController()
  const realTimeout = AbortSignal.timeout.bind(AbortSignal)
  const budgets = []
  t.mock.method(AbortSignal, 'timeout', (ms) => {
    budgets.push(ms)
    return budgets.length === 1 ? geminiDeadline.signal : realTimeout(ms)
  })
  providers(t, {
    gemini: () => {
      geminiDeadline.abort()
      throw new DOMException('Aborted', 'AbortError')
    },
    openrouter: () => completion(JSON.stringify(valid)),
  })

  await analyzeDocument('Document text', 'actual.pdf', 2)

  assert.equal(budgets[0], GEMINI_TIMEOUT_MS)
  assert.ok(budgets[1] <= ANALYSIS_BUDGET_MS && budgets[1] > ANALYSIS_BUDGET_MS - 1000)
})
