import type { AnalysisResult } from './schema.js'

/**
 * Sends the document text to Gemini and returns a result validated against
 * AnalysisResultSchema. Reads GEMINI_API_KEY from the environment — the key
 * never leaves the server.
 */
export function analyzeDocument(
  _text: string,
  _fileName: string,
  _pages: number,
): Promise<AnalysisResult> {
  // TODO: @google/genai client, structured output (JSON schema derived from AnalysisResultSchema),
  // AnalysisResultSchema.parse on the response, explicit mapping of SDK/quota errors.
  throw new Error('Not implemented')
}
