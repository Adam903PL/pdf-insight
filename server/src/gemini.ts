import { ApiError, GoogleGenAI, ThinkingLevel, type Content } from '@google/genai'
import {
  AiQuotaError,
  AiTimeoutError,
  AiUpstreamError,
  correctionPrompt,
  documentPrompt,
  generateValidated,
  isQuotaStatus,
  SYSTEM_INSTRUCTION,
  type Correction,
} from './ai.js'
import { analysisResponseSchema } from './geminiSchema.js'
import type { AnalysisResult } from './schema.js'

// Gemini 3 Flash is only published under its preview code; the bare `gemini-3-flash`
// returns 404 NOT_FOUND from v1beta generateContent.
export const GEMINI_MODEL = 'gemini-3-flash-preview'

/**
 * Gemini's budget, shared by the first attempt and the correction. Kept well under
 * the brief's 30 s so the OpenRouter fallback (see ./analysis.ts) still fits after
 * a Gemini timeout.
 */
export const GEMINI_TIMEOUT_MS = 15_000

/**
 * Gemini 3 Flash thinks at "high" by default, which pushed even a one-page invoice
 * past the 25 s budget while a longer document finished in 15 s — latency tracked
 * thinking, not input length. Field extraction does not need deep reasoning.
 */
const THINKING_LEVEL = ThinkingLevel.LOW

// Typed as string (not string | undefined) so redact() below still sees a string
// inside its closure — TS does not carry the guard's narrowing that far.
const apiKey: string = process.env.GEMINI_API_KEY ?? ''
if (apiKey === '') {
  throw new Error(
    'GEMINI_API_KEY is not set. Create a key in Google AI Studio and set it server-side.',
  )
}

const ai = new GoogleGenAI({ apiKey })

function contentsFor(text: string, correction: Correction): Content[] {
  const contents: Content[] = [{ role: 'user', parts: [{ text: documentPrompt(text) }] }]
  if (correction !== null) {
    contents.push(
      { role: 'model', parts: [{ text: correction.previous }] },
      { role: 'user', parts: [{ text: correctionPrompt(correction.issues) }] },
    )
  }
  return contents
}

async function callGemini(contents: Content[], signal: AbortSignal): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: analysisResponseSchema,
        temperature: 0.2,
        thinkingConfig: { thinkingLevel: THINKING_LEVEL },
        abortSignal: signal,
      },
    })

    const text = response.text
    if (text === undefined || text.trim() === '') {
      throw new AiUpstreamError('Gemini returned an empty response body')
    }
    return text
  } catch (error) {
    if (signal.aborted) {
      throw new AiTimeoutError('Gemini', GEMINI_TIMEOUT_MS)
    }
    if (error instanceof AiUpstreamError) {
      throw error
    }
    if (error instanceof ApiError) {
      // The SDK message stays server-side; the route maps this to a generic 5xx.
      if (isQuotaStatus(error.status)) {
        throw new AiQuotaError(redact(error.message), error.status)
      }
      throw new AiUpstreamError(redact(error.message), error.status)
    }
    throw new AiUpstreamError(
      error instanceof Error ? redact(error.message) : 'Unknown Gemini SDK error',
    )
  }
}

/**
 * SDK error text is logged (never returned to the client), and Google occasionally
 * echoes the request URL back in it. Strip the key before it can reach a log sink.
 */
function redact(message: string): string {
  return message.replaceAll(apiKey, '<redacted>')
}

/**
 * Sends the document text to Gemini and returns a result validated against
 * AnalysisResultSchema, with one correction attempt. Reads GEMINI_API_KEY from the
 * environment — the key never leaves the server.
 */
export async function analyzeWithGemini(
  text: string,
  fileName: string,
  pages: number,
): Promise<AnalysisResult> {
  const signal = AbortSignal.timeout(GEMINI_TIMEOUT_MS)
  return generateValidated((correction) => callGemini(contentsFor(text, correction), signal), {
    provider: 'gemini',
    model: GEMINI_MODEL,
    fileName,
    pages,
    textLength: text.length,
  })
}
