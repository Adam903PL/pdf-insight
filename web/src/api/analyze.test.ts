import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalysisResult } from '@/lib/schema'
import { analyze, ApiError, getApiBaseUrl } from './analyze'

const payload = { fileName: 'umowa.pdf', pages: 4, text: 'Umowa serwisowa…' }

const validResult: AnalysisResult = {
  document: {
    fileName: 'umowa.pdf',
    pages: 4,
    language: 'pl',
    type: 'umowa',
    title: 'Umowa serwisowa',
    date: '2026-09-01',
  },
  summary: 'Umowa serwisowa. Określa zakres usług. Termin płatności to 30 dni.',
  keyPoints: ['Zakres usług', 'Wynagrodzenie', 'Termin płatności'],
  entities: { organizations: ['Acme sp. z o.o.'], people: [] },
  amounts: [{ value: 12500, currency: 'PLN', context: 'wynagrodzenie' }],
  dates: [{ date: '2026-10-01', context: 'termin płatności' }],
  keywords: ['umowa'],
}

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('Expected analyze() to reject')
}

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'https://api.example.test/')
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('analyze', () => {
  it('POSTs the payload as JSON to /api/analyze without a doubled slash', async () => {
    fetchMock.mockResolvedValue(jsonResponse(validResult, 200))

    await analyze(payload)

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://api.example.test/api/analyze')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    const body = init?.body
    if (typeof body !== 'string') throw new Error('Expected the request body to be a JSON string')
    expect(JSON.parse(body)).toEqual(payload)
  })

  it('returns the result when the body matches the schema', async () => {
    fetchMock.mockResolvedValue(jsonResponse(validResult, 200))

    await expect(analyze(payload)).resolves.toEqual(validResult)
  })

  it('rejects a 200 whose body does not match the schema', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...validResult, keyPoints: [] }, 200))

    const error = await captureError(analyze(payload))

    expect(error.kind).toBe('invalid-response')
    expect(error.retryable).toBe(true)
  })

  it('rejects a 200 whose body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 200 }))

    expect((await captureError(analyze(payload))).kind).toBe('invalid-response')
  })

  it('shows the server message for 429 and allows a retry', async () => {
    const message = 'Przekroczono limit zapytań (10 na 10 min). Spróbuj ponownie za 120 s.'
    fetchMock.mockResolvedValue(jsonResponse({ error: message }, 429))

    const error = await captureError(analyze(payload))

    expect(error).toMatchObject({ kind: 'rate-limit', status: 429, message, retryable: true })
  })

  it.each([400, 413])('treats %i as a rejection that retrying cannot fix', async (status) => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Nieprawidłowe dane wejściowe.' }, status))

    const error = await captureError(analyze(payload))

    expect(error).toMatchObject({ kind: 'rejected', status, retryable: false })
  })

  it('maps a 504 to a retryable timeout', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Analiza trwała zbyt długo.' }, 504))

    expect(await captureError(analyze(payload))).toMatchObject({ kind: 'timeout', status: 504 })
  })

  it('never shows a non-JSON error page, falling back to Polish copy by status', async () => {
    fetchMock.mockResolvedValue(new Response('<h1>Bad Gateway</h1>', { status: 502 }))

    const error = await captureError(analyze(payload))

    expect(error.kind).toBe('server')
    expect(error.message).toBe('Usługa AI zwróciła niepoprawną odpowiedź. Spróbuj ponownie.')
  })

  it('uses generic copy for an unexpected status with an unexpected body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'stack trace' }, 503))

    const error = await captureError(analyze(payload))

    expect(error.message).toBe(
      'Serwer analizy jest chwilowo niedostępny. Spróbuj ponownie za chwilę.',
    )
  })

  it('reports a network failure when fetch itself rejects', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    expect((await captureError(analyze(payload))).kind).toBe('network')
  })

  it('reports the client-side deadline as a timeout', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'))

    const error = await captureError(analyze(payload))

    expect(error).toMatchObject({ kind: 'timeout', status: null, retryable: true })
  })
})

describe('getApiBaseUrl', () => {
  it('fails loudly when VITE_API_URL is missing', () => {
    vi.stubEnv('VITE_API_URL', '')

    expect(() => getApiBaseUrl()).toThrow('VITE_API_URL is not set')
  })
})
