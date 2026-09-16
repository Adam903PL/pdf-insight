import { z } from 'zod'
import { AnalysisResultSchema, type AnalysisResult } from '@/lib/schema'

export type AnalyzePayload = {
  fileName: string
  pages: number
  text: string
}

/**
 * Client-side ceiling for one analysis. Deliberately above the server's own 25 s
 * Gemini budget so the server's 504 (with its message) arrives first; this only
 * catches a request that hangs somewhere between the browser and the API.
 */
export const REQUEST_TIMEOUT_MS = 35_000

export type ApiErrorKind =
  /** fetch never got a response: offline, DNS, CORS. */
  | 'network'
  /** The server's 504, or the client-side ceiling above. */
  | 'timeout'
  /** 429 from the per-IP limiter. */
  | 'rate-limit'
  /** 400 / 413 — the server refused this input; sending it again cannot help. */
  | 'rejected'
  /** Any other non-2xx status. */
  | 'server'
  /** 2xx whose body does not match AnalysisResultSchema (brief F-04). */
  | 'invalid-response'

/** A failed analysis request. `message` is Polish and safe to show to the user. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  /** Whether sending the same document again could succeed. */
  readonly retryable: boolean

  constructor(kind: ApiErrorKind, message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.retryable = kind !== 'rejected'
  }
}

/** Every error body from our server has this shape, with a Polish, user-safe message. */
const ErrorBodySchema = z.object({ error: z.string().min(1) })

const MESSAGES = {
  network:
    'Nie udało się połączyć z serwerem analizy. Sprawdź połączenie z internetem i spróbuj ponownie.',
  clientTimeout: `Serwer nie odpowiedział w ciągu ${REQUEST_TIMEOUT_MS / 1000} s. Spróbuj ponownie.`,
  invalidResponse: 'Otrzymano niepoprawny wynik analizy. Spróbuj ponownie.',
  status: {
    400: 'Serwer odrzucił dane dokumentu.',
    413: 'Dokument jest za duży do analizy.',
    429: 'Wykonano zbyt wiele analiz w krótkim czasie. Spróbuj ponownie za kilka minut.',
    502: 'Usługa AI zwróciła niepoprawną odpowiedź. Spróbuj ponownie.',
    504: 'Analiza trwała zbyt długo. Spróbuj ponownie lub wgraj krótszy dokument.',
  } as Partial<Record<number, string>>,
  serverFallback: 'Serwer analizy jest chwilowo niedostępny. Spróbuj ponownie za chwilę.',
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 413) return 'rejected'
  if (status === 429) return 'rate-limit'
  if (status === 504) return 'timeout'
  return 'server'
}

/**
 * Prefers the server's own Polish message (it is written for users and, for 400 and
 * 429, more specific), but a proxy error page or an empty body must not reach the UI,
 * so anything that is not `{ error: string }` falls back to copy chosen by status.
 */
async function errorFromResponse(response: Response): Promise<ApiError> {
  const kind = kindForStatus(response.status)
  const fallback = MESSAGES.status[response.status] ?? MESSAGES.serverFallback

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return new ApiError(kind, fallback, response.status)
  }

  const parsed = ErrorBodySchema.safeParse(body)
  return new ApiError(kind, parsed.success ? parsed.data.error : fallback, response.status)
}

/** Sends extracted text to the backend and returns the validated analysis result. */
export async function analyze(payload: AnalyzePayload): Promise<AnalysisResult> {
  let response: Response
  try {
    response = await fetch(`${getApiBaseUrl()}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError('timeout', MESSAGES.clientTimeout)
    }
    if (error instanceof TypeError) {
      throw new ApiError('network', MESSAGES.network)
    }
    throw error
  }

  if (!response.ok) {
    throw await errorFromResponse(response)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ApiError('invalid-response', MESSAGES.invalidResponse, response.status)
  }

  const parsed = AnalysisResultSchema.safeParse(body)
  if (!parsed.success) {
    throw new ApiError('invalid-response', MESSAGES.invalidResponse, response.status)
  }
  return parsed.data
}

/** Backend base URL, injected at build time via VITE_API_URL. */
export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    throw new Error(
      'VITE_API_URL is not set. Copy web/.env.example to web/.env and set the backend URL.',
    )
  }
  return url.replace(/\/+$/, '')
}
