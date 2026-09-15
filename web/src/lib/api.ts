import type { AnalysisResult } from './schema'

export type AnalyzePayload = {
  fileName: string
  pages: number
  text: string
}

/** Sends extracted text to the backend and returns the validated analysis result. */
export function analyze(_payload: AnalyzePayload): Promise<AnalysisResult> {
  // TODO: POST `${getApiBaseUrl()}/api/analyze`, map HTTP errors (400/413/429/5xx) to messages,
  // validate the response with AnalysisResultSchema before returning it.
  throw new Error('Not implemented')
}

/** Backend base URL, injected at build time via VITE_API_URL. */
export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    throw new Error(
      'VITE_API_URL is not set. Copy web/.env.example to web/.env and set the backend URL.',
    )
  }
  return url
}
