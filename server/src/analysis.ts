import { AiTimeoutError, AiUpstreamError } from './ai.js'
import { analyzeWithGemini } from './gemini.js'
import { logger } from './logger.js'
import { analyzeWithOpenRouter } from './openrouter.js'
import type { AnalysisResult } from './schema.js'

/**
 * Whole-analysis budget across both providers: Gemini gets at most GEMINI_TIMEOUT_MS,
 * OpenRouter whatever remains. Under the brief's 30 s, with room for the network;
 * the frontend gives up at 35 s.
 */
export const ANALYSIS_BUDGET_MS = 27_000

/**
 * Gemini first; OpenRouter only when Gemini is unavailable — timeout, quota, 5xx,
 * network. Invalid output is not handed to the fallback: the brief allows one
 * correction attempt, then an error.
 */
export async function analyzeDocument(
  text: string,
  fileName: string,
  pages: number,
): Promise<AnalysisResult> {
  const startedAt = Date.now()
  try {
    return await analyzeWithGemini(text, fileName, pages)
  } catch (error) {
    if (!(error instanceof AiTimeoutError || error instanceof AiUpstreamError)) {
      throw error
    }
    const elapsedMs = Date.now() - startedAt
    logger.warn('gemini unavailable, falling back to openrouter', {
      reason: error.name,
      status: error instanceof AiUpstreamError ? (error.status ?? null) : null,
      fileName,
      textLength: text.length,
      elapsedMs,
      detail: error.message,
    })
    return analyzeWithOpenRouter(text, fileName, pages, ANALYSIS_BUDGET_MS - elapsedMs)
  }
}
