import assert from 'node:assert/strict'
import { test } from 'node:test'

// Never load .env or call the provider in these tests. Only HTTP is substituted;
// the real SDK, JSON parser, Zod contract and analysis retry flow run together.
process.env.GEMINI_API_KEY = 'test-placeholder'
const { analyzeDocument, AiValidationError, AiUpstreamError, AiTimeoutError } =
  await import('../dist/gemini.js')

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

function provider(t, outputs) {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    requests.push(JSON.parse(init.body))
    assert.ok(requests.length <= outputs.length, 'Unexpected additional provider request')
    const text = outputs[requests.length - 1]
    return new Response(
      JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text }] } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  })
  return requests
}

test('returns a valid first response with trusted file metadata', async (t) => {
  const requests = provider(t, [JSON.stringify(valid)])
  const result = await analyzeDocument('Document text', 'actual.pdf', 2)
  assert.deepEqual(result, {
    ...valid,
    document: { ...valid.document, fileName: 'actual.pdf', pages: 2 },
  })
  assert.equal(requests.length, 1)
})

test('retries malformed JSON once and returns the corrected result', async (t) => {
  const requests = provider(t, ['{"summary":', JSON.stringify(valid)])
  const result = await analyzeDocument('Document text', 'actual.pdf', 2)
  assert.equal(result.summary, valid.summary)
  assert.equal(requests.length, 2)
  assert.match(JSON.stringify(requests[1].contents), /JSON/)
})

test('two malformed responses become a validation error, with no third call', async (t) => {
  const requests = provider(t, ['not json', '{'])
  await assert.rejects(analyzeDocument('Document text', 'actual.pdf', 2), AiValidationError)
  assert.equal(requests.length, 2)
})

test('retries schema errors and describes the invalid field', async (t) => {
  const requests = provider(t, [JSON.stringify({ ...valid, keyPoints: [] }), JSON.stringify(valid)])
  await analyzeDocument('Document text', 'actual.pdf', 2)
  assert.equal(requests.length, 2)
  assert.match(JSON.stringify(requests[1].contents), /keyPoints/)
})

test('a malformed retry after a schema error is still a validation error', async (t) => {
  const requests = provider(t, [JSON.stringify({ ...valid, keyPoints: [] }), 'not json'])
  await assert.rejects(analyzeDocument('Document text', 'actual.pdf', 2), AiValidationError)
  assert.equal(requests.length, 2)
})

test('a schema error after malformed JSON exhausts the same retry budget', async (t) => {
  const requests = provider(t, ['not json', JSON.stringify({ ...valid, keyPoints: [] })])
  await assert.rejects(analyzeDocument('Document text', 'actual.pdf', 2), AiValidationError)
  assert.equal(requests.length, 2)
})

test('does not turn a provider rejection into an output correction retry', async (t) => {
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(JSON.stringify({ error: { code: 400, message: 'Bad request' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
  )
  await assert.rejects(analyzeDocument('Document text', 'actual.pdf', 2), AiUpstreamError)
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('the correction shares the original timeout budget', async (t) => {
  const controller = new AbortController()
  const timeout = t.mock.method(AbortSignal, 'timeout', () => controller.signal)
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls++
    if (calls === 1) {
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    controller.abort()
    throw new DOMException('Aborted', 'AbortError')
  })
  await assert.rejects(analyzeDocument('Document text', 'actual.pdf', 2), AiTimeoutError)
  assert.equal(calls, 2)
  assert.equal(timeout.mock.callCount(), 1)
})
