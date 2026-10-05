import type { Schema } from '@google/genai'
import { z } from 'zod'
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

/**
 * Fallback model, used only when Gemini is unavailable. Cheap, fast, non-reasoning,
 * supports strict JSON-schema output, and is not hosted by Google — so a Gemini
 * outage or exhausted Gemini quota does not take the fallback down with it.
 */
export const OPENROUTER_MODEL = 'openai/gpt-4.1-nano'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

const apiKey = process.env.OPENROUTER_API_KEY ?? ''
if (apiKey === '') {
  throw new Error(
    'OPENROUTER_API_KEY is not set. Create a key at https://openrouter.ai/keys and set it server-side.',
  )
}

/**
 * Gemini's OpenAPI-subset schema converted to the JSON Schema that OpenAI-style strict
 * structured output expects: lowercase types, `nullable` as a type union, numeric
 * array bounds, and `additionalProperties: false` on every object (strict mode
 * requires it). Derived rather than hand-copied, so the two cannot drift apart.
 */
function toJsonSchema(schema: Schema): Record<string, unknown> {
  if (schema.type === undefined) {
    throw new Error('Every node of analysisResponseSchema must declare a type')
  }
  const type = schema.type.toLowerCase()
  const out: Record<string, unknown> = { type: schema.nullable === true ? [type, 'null'] : type }
  if (schema.description !== undefined) out.description = schema.description
  if (schema.enum !== undefined) out.enum = schema.enum
  if (schema.properties !== undefined) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, toJsonSchema(value)]),
    )
    out.required = schema.required ?? []
    out.additionalProperties = false
  }
  if (schema.items !== undefined) out.items = toJsonSchema(schema.items)
  if (schema.minItems !== undefined) out.minItems = Number(schema.minItems)
  if (schema.maxItems !== undefined) out.maxItems = Number(schema.maxItems)
  return out
}

const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'analysis_result',
    strict: true,
    schema: toJsonSchema(analysisResponseSchema),
  },
}

type Message = { role: 'system' | 'user' | 'assistant'; content: string }

function messagesFor(text: string, correction: Correction): Message[] {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    { role: 'user', content: documentPrompt(text) },
  ]
  if (correction !== null) {
    messages.push(
      { role: 'assistant', content: correction.previous },
      { role: 'user', content: correctionPrompt(correction.issues) },
    )
  }
  return messages
}

const CompletionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
})

const ErrorBodySchema = z.object({ error: z.object({ message: z.string() }) })

async function callOpenRouter(
  messages: Message[],
  signal: AbortSignal,
  timeoutMs: number,
): Promise<string> {
  let response: Response
  let body: unknown
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        temperature: 0.2,
        response_format: RESPONSE_FORMAT,
        // Route only to hosts that honour response_format, never silently drop it.
        provider: { require_parameters: true },
      }),
      signal,
    })
    body = await response.json()
  } catch (error) {
    if (signal.aborted) {
      throw new AiTimeoutError('OpenRouter', timeoutMs)
    }
    throw new AiUpstreamError(
      `OpenRouter request failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (!response.ok) {
    const parsedError = ErrorBodySchema.safeParse(body)
    const message = `OpenRouter HTTP ${response.status}: ${parsedError.success ? parsedError.data.error.message : 'no error message'}`
    if (isQuotaStatus(response.status)) {
      throw new AiQuotaError(message, response.status)
    }
    throw new AiUpstreamError(message, response.status)
  }

  const parsed = CompletionSchema.safeParse(body)
  const content = parsed.success ? parsed.data.choices[0]?.message.content : null
  if (content === null || content === undefined || content.trim() === '') {
    throw new AiUpstreamError('OpenRouter returned an empty response body', response.status)
  }
  return content
}

/**
 * Same contract as analyzeWithGemini, through OpenRouter. `timeoutMs` is whatever is
 * left of the overall analysis budget once Gemini has failed.
 */
export async function analyzeWithOpenRouter(
  text: string,
  fileName: string,
  pages: number,
  timeoutMs: number,
): Promise<AnalysisResult> {
  const signal = AbortSignal.timeout(timeoutMs)
  return generateValidated(
    (correction) => callOpenRouter(messagesFor(text, correction), signal, timeoutMs),
    { provider: 'openrouter', model: OPENROUTER_MODEL, fileName, pages, textLength: text.length },
  )
}
